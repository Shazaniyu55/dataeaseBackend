const axios = require("axios");
const crypto = require("crypto");
const Wallet = require("../model/walletmodel");
const PaystackFunding = require("../model/paystackFundingModel");

const PAYSTACK = "https://api.paystack.co";
const REFERENCE_PATTERN = /^[A-Za-z0-9._=-]{6,100}$/;

function paystackHeaders() {
  return { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` };
}

function isValidReference(reference) {
  return typeof reference === "string" && REFERENCE_PATTERN.test(reference);
}

// Constant-time check of the x-paystack-signature header
function isValidPaystackSignature(rawBody, signature) {
  if (!Buffer.isBuffer(rawBody) || typeof signature !== "string") return false;

  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Step 1: create a pending record with a server-generated reference, then initialize
async function initializeFunding(user, amountNaira) {
  const amountKobo = Math.round(amountNaira * 100);
  const reference = `DE-${crypto.randomUUID()}`;

  await PaystackFunding.create({
    reference,
    userId: user.userId,
    amountKobo,
    status: "pending",
  });

  const response = await axios.post(
    `${PAYSTACK}/transaction/initialize`,
    {
      email: user.email,
      amount: amountKobo,
      currency: "NGN",
      reference,
      metadata: { userId: String(user.userId) },
    },
    { headers: { ...paystackHeaders(), "Content-Type": "application/json" }, timeout: 15000 }
  );

  return response.data;
}

/**
 * Step 2: credit a wallet for a Paystack reference, exactly once.
 * Used by BOTH the webhook and the app's verify-payment endpoint.
 *
 * @param {string} reference
 * @param {string|null} callerUserId  set when a logged-in user calls verify;
 *                                    null when called from the signed webhook
 */
async function creditFromPaystack(reference, callerUserId = null) {
  if (!isValidReference(reference)) {
    return { status: "rejected", reason: "Invalid reference" };
  }

  // Never trust the client or the webhook body: ask Paystack directly
  const { data: body } = await axios.get(
    `${PAYSTACK}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: paystackHeaders(), timeout: 15000 }
  );
  const tx = body?.data;

  if (!tx || tx.status !== "success") {
    return { status: "pending", reason: "Payment not successful yet" };
  }
  if (tx.currency !== "NGN") {
    return { status: "rejected", reason: "Unsupported currency" };
  }

  const paidKobo = Number(tx.amount);
  const metaUserId = tx.metadata?.userId ? String(tx.metadata.userId) : null;
  const record = await PaystackFunding.findOne({ reference });

  let ownerId;
  if (record) {
    ownerId = String(record.userId);

    if (record.status === "failed") {
      return { status: "rejected", reason: "Payment was flagged, contact support" };
    }
    if (metaUserId && metaUserId !== ownerId) {
      await markFailed(reference, "Owner mismatch");
      return { status: "rejected", reason: "Payment does not belong to this account" };
    }
    if (paidKobo !== record.amountKobo) {
      await markFailed(reference, `Amount mismatch: paid ${paidKobo}, expected ${record.amountKobo}`);
      return { status: "rejected", reason: "Amount mismatch" };
    }
  } else {
    // Payments started before this change have no record: fall back to metadata
    ownerId = metaUserId;
    if (!ownerId) return { status: "rejected", reason: "Unknown payment" };

    const alreadyInWallet = await Wallet.exists({ userId: ownerId, "transactions.reference": reference });
    if (alreadyInWallet) {
      await PaystackFunding.updateOne(
        { reference },
        { $setOnInsert: { userId: ownerId, amountKobo: paidKobo, status: "success", creditedAt: new Date() } },
        { upsert: true }
      ).catch(() => {});
      return { status: "already_credited" };
    }
  }

  // A logged-in user can only verify their own payment
  if (callerUserId && String(callerUserId) !== ownerId) {
    return { status: "rejected", reason: "Payment does not belong to this account" };
  }

  // Atomic claim: only ONE caller (webhook or verify) can flip this to success
  let claimed;
  try {
    claimed = await PaystackFunding.findOneAndUpdate(
      { reference, status: "pending" },
      {
        $set: { status: "success", paystackId: String(tx.id), creditedAt: new Date() },
        $setOnInsert: { userId: ownerId, amountKobo: paidKobo },
      },
      { upsert: !record, new: true }
    );
  } catch (err) {
    if (err?.code === 11000) return { status: "already_credited" }; // lost the race
    throw err;
  }
  if (!claimed) return { status: "already_credited" };

  const amountNaira = paidKobo / 100;

  try {
    // Make sure the wallet exists, then credit with a single atomic $inc
    await Wallet.updateOne(
      { userId: ownerId },
      { $setOnInsert: { userId: ownerId, balance: 0, transactions: [] } },
      { upsert: true }
    );

    const wallet = await Wallet.atomicCredit(ownerId, amountNaira, {
      reference,
      network: "paystack",
      phoneOrAccount: tx.customer?.email,
      costPrice: amountNaira,
      sellingPrice: amountNaira,
      profit: 0,
    });

    if (!wallet) throw new Error("Wallet credit failed");
    return { status: "credited", wallet };
  } catch (err) {
    // Release the claim so a Paystack retry or a later verify can try again
    await PaystackFunding.updateOne(
      { reference, status: "success" },
      { $set: { status: "pending" }, $unset: { creditedAt: 1 } }
    );
    throw err;
  }
}

async function markFailed(reference, reason) {
  await PaystackFunding.updateOne(
    { reference, status: "pending" },
    { $set: { status: "failed", failureReason: reason } }
  );
  console.error(`[wallet-funding] ${reference} rejected: ${reason}`);
}

module.exports = {
  initializeFunding,
  creditFromPaystack,
  isValidPaystackSignature,
  isValidReference,
};