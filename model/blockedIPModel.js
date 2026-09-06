// model/blockedIPModel.js
const mongoose = require("mongoose");

const blockedIPSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    reason: {
      type: String,
      required: true,
    },

    // which user triggered this block (optional — one IP can serve many users)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // which admin blocked it
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true, // false = unblocked
    },

    unblockedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// fast lookup on every request
blockedIPSchema.index({ ip: 1, isActive: 1 });

module.exports = mongoose.model("BlockedIP", blockedIPSchema);