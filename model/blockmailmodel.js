const mongoose = require("mongoose");

const blockedEmailSchema = new mongoose.Schema(
  {
    // Could be a full email ("badactor@gmail.com") OR just a domain ("tempmail.com")
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // "domain" blocks the whole provider; "email" blocks one specific address
    type: {
      type: String,
      enum: ["domain", "email"],
      required: true,
    },

    reason: {
      type: String,
      default: "Blocked for security reasons",
    },

    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

blockedEmailSchema.index({ value: 1, isActive: 1 });

module.exports = mongoose.model("BlockedEmail", blockedEmailSchema);