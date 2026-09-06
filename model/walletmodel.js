// models/Wallet.js
const mongoose = require("mongoose");

// ── ePIN sub-document schema ──────────────────────────────────────────────────
const epinSchema = new mongoose.Schema(
  {
    amount:      { type: Number },
    pin:         { type: String },
    serial:      { type: String },
    instruction: { type: String },
  },
  { _id: false } // no need for individual IDs on each PIN
);

// ── electric sub-document schema ──────────────────────────────────────────────────
const electricSchema = new mongoose.Schema(
  {
    token:      { type: String },
    unit:         { type: String },
    band:      { type: String },
    amount: { type: Number },
  },
  { _id: false } // no need for individual IDs on each PIN
);

const transactionSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, },
  type: {
    type: String,
    enum: ["airtime", "data", "cable", "electricity", "betting", "other", "Wallet_Funded", "giftcard", "Epins"],
    required: true,
  },
  network: { type: String },
  phoneOrAccount: { type: String },
  amount: { type: Number, required: true, min: [0, "Transaction amount cannot be negative"], },
  costPrice: { type: Number },
  sellingPrice: { type: Number },
  profit: { type: Number, required: true },
  status: { type: String, enum: ["pending", "success", "failed", "refunded"], default: "pending" },
  token: { type: String },   // optional
  units: { type: String },   // optional
  reason: { type: String },
  epins:   { type: [epinSchema], default: undefined }, // array of PIN objects
  electric: { type: [electricSchema], default: undefined }, // array of electric objects
  orderId: { type: Number },   
  createdAt: { type: Date, default: Date.now },
});

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  balance: { type: Number, default: 0, min: [0, "Wallet balance cannot be negative"], },
  transactions: [transactionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save hook to update timestamp
walletSchema.pre("save", function (next) {
  if (this.balance < 0) {
    return next(new Error("Insufficient wallet balance"));
  }

  this.updatedAt = Date.now();
  next();
});


// ─────────────────────────────────────────────────────────────────────────────
//  FIX: atomic debit — replaces the old read-modify-write addTransaction.
//
// Uses findOneAndUpdate with a filter { balance: { $gte: amount } } so the
// deduction only succeeds if MongoDB confirms sufficient funds in a SINGLE
// atomic operation. This eliminates the race-condition / double-spend window.
//
// Usage (controller):
//   const wallet = await Wallet.atomicDebit(userId, amount, txData);
//   if (!wallet) throw new Error("Insufficient balance");
// ─────────────────────────────────────────────────────────────────────────────



walletSchema.statics.atomicDebit = async function (userId, amount, transactionData) {
  if (amount <= 0) throw new Error("Debit amount must be positive");
 
  const updated = await this.findOneAndUpdate(
    {
      userId,
      balance: { $gte: amount }, // atomic guard — only matches if funds exist
    },
    {
      $inc: { balance: -amount },
      $push: { transactions: { ...transactionData, amount } },
      $set:  { updatedAt: new Date() },
    },
    { new: true }
  );
 
  return updated; // null means insufficient balance — handle in caller
};

// ─────────────────────────────────────────────────────────────────────────────
// Credit wallet (funding) — still uses the safe method pattern
// ─────────────────────────────────────────────────────────────────────────────
walletSchema.statics.atomicCredit = async function (userId, amount, transactionData) {
  if (amount <= 0) throw new Error("Credit amount must be positive");
 
  return this.findOneAndUpdate(
    { userId },
    {
      $inc: { balance: amount },
      $push: { transactions: { ...transactionData, amount, status: "success", type: "Wallet_Funded" } },
      $set:  { updatedAt: new Date() },
    },
    { new: true, upsert: false }
  );
};

// Keep addTransaction for backward compat but guard it
walletSchema.methods.addTransaction = async function (transactionData) {
  const isDebit = transactionData.type !== "Wallet_Funded";
 
  if (isDebit) {
    //  FIX: balance check before any debit (still prefer atomicDebit in controllers)
    if (this.balance < transactionData.amount) {
      throw new Error("Insufficient wallet balance");
    }
    this.balance -= transactionData.amount;
  } else if (transactionData.status === "success") {
    this.balance += transactionData.amount;
  }
 
  this.transactions.push(transactionData);
  await this.save();
  return this;
};

// //  Updated helper to handle full transactions
// walletSchema.methods.addTransaction = async function (transactionData) {
 

//   this.transactions.push(transactionData);

//   // Only modify wallet balance if transaction is a credit
//   if (transactionData.status === "success" && transactionData.type === "Wallet_Funded") {
//     this.balance += transactionData.amount;
//   }

//   await this.save();
//   return this;
// };

module.exports = mongoose.model("Wallet", walletSchema);
