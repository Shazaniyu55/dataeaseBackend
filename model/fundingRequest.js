const mongoose = require("mongoose");

const fundingRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 100,
    },

    bankName: {
      type: String,
      required: true,
    },

    senderName: {
      type: String,
      required: true,
    },

    narration: {
      type: String, // optional reference code
    },

    proofImage: {
      type: String, // image URL if uploaded
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // admin id
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FundingRequest", fundingRequestSchema);