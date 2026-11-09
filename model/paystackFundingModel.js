const mongoose = require("mongoose");

// One document per Paystack funding attempt.
// The unique index on `reference` is what makes double-crediting impossible:
// Mongo's `unique` on an embedded array field (wallet.transactions.reference)
// does NOT stop duplicates inside a single wallet document, this collection does.
const paystackFundingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amountKobo: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    failureReason: { type: String },
    paystackId: { type: String },
    creditedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaystackFunding", paystackFundingSchema);