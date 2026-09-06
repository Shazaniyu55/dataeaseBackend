const mongoose = require("mongoose");

// Each document = one named feature/switch
const killSwitchSchema = new mongoose.Schema(
  {
    // e.g. "global", "registration", "login", "wallet", "vtu", "giftcard"
    feature: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    isActive: {
      type: Boolean,
      default: true, // true = feature ON (normal), false = feature KILLED
    },

    // Human-readable reason shown to the client when killed
    reason: {
      type: String,
      default: "This feature is temporarily unavailable. Please try again later.",
    },

    // Who last toggled it
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

// Fast lookup per request
killSwitchSchema.index({ feature: 1 });

module.exports = mongoose.model("KillSwitch", killSwitchSchema);