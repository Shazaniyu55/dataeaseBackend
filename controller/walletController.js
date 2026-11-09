const PaystackService = require("../services/paystackService");
const Wallet = require("../model/walletmodel");
const { z } = require("zod");
const {
  initializeFunding,
  creditFromPaystack,
  isValidReference,
} = require("../services/walletFundingService");


// Whole naira only, ₦100 to ₦1,000,000 per funding
const fundAmountSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Invalid amount format" })
    .int("Amount must be a whole number")
    .min(100, "Minimum funding is ₦100")
    .max(1_000_000, "Maximum funding is ₦1,000,000"),
});

class WalletController {
 
static async fundWallet(req, res) {
  const parsed = fundAmountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors?.[0]?.message });
  }

  try {
    const response = await initializeFunding(req.user, parsed.data.amount);
    return res.status(200).json(response);
  } catch (error) {
    // Log the details, but don't leak Paystack's raw error to the client
    console.error("[fundWallet]", error.response?.data || error.message);
    return res.status(502).json({ message: "Could not start payment. Please try again." });
  }
}

static async verifyPayment(req, res) {
  const { reference } = req.params;
  if (!isValidReference(reference)) {
    return res.status(400).json({ message: "Invalid reference" });
  }

  try {
    const result = await creditFromPaystack(reference, req.user.userId);

    if (result.status === "credited" || result.status === "already_credited") {
      const wallet = result.wallet || (await Wallet.findOne({ userId: req.user.userId }));
      const transaction = wallet?.transactions.find((trx) => trx.reference === reference);
      return res.status(200).json({
        message: "Payment verified successfully",
        data: transaction,
      });
    }

    if (result.status === "pending") {
      return res.status(202).json({ message: "Payment not completed yet" });
    }

    return res.status(400).json({ message: result.reason || "Payment verification failed" });
  } catch (error) {
    console.error("[verifyPayment]", error.response?.data || error.message);
    return res.status(502).json({ message: "Could not verify payment. Please try again." });
  }
}





static async verifyAffiliatePayment(req, res) {
  try {
    const { reference } = req.params;
    const user = req.user;

    const response = await PaystackService.verifyAffiliatePay(reference, user);

    //console.log("response:", response);

    // Find the transaction with this reference
    const transaction = response.transactions.find(
      (trx) => trx.reference === reference
    );

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    if (transaction.status === "success") {
      return res.status(200).json({
        message: "Payment verified successfully",
        data: transaction,
      });
    } else {
      return res.status(400).json({
        message: "Payment verification failed",
      });
    }

  } catch (error) {
    return res.status(500).json({
      message: error.response?.data || error.message,
    });
  }
}


  static async getTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const transactions = await PaystackService.getAllTransactions(userId);
      return res.status(200).json({
        message: "Transactions retrieved successfully",
        data: transactions,
      });
    } catch (error) {
      return res.status(500).json({
        message: error.response?.data || error.message,
      });
  }

  }


}

module.exports = WalletController;