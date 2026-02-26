// models/Wallet.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["airtime", "data", "cable", "electricity", "betting", "other"],
    required: true,
  },
  network: { type: String }, // e.g., MTN, Glo, DStv
  phoneOrAccount: { type: String }, // phone number or account for cable/electricity
  amount: { type: Number, required: true }, // amount user pays
  costPrice: { type: Number, required: true }, // price from VTU provider
  sellingPrice: { type: Number, required: true }, // price user pays
  profit: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  balance: { type: Number, default: 0 }, // current wallet balance
  transactions: [transactionSchema], // all transactions done by user
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save hook to update timestamp
walletSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Wallet", walletSchema);