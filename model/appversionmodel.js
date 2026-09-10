const mongoose = require("mongoose");

/**
 * One document per platform ("android" | "ios").
 * The mobile app calls GET /api/v2/app-version/check on launch and this
 * config decides whether the user is allowed in, nudged to update, or
 * hard-blocked until they update.
 */
const appVersionSchema = new mongoose.Schema(
  {
    // "android" or "ios"
    platform: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      enum: ["android", "ios"],
    },

    // The newest version currently in the store, e.g. "1.2.0".
    // If the user's version is below this, an update is "available".
    latestVersion: {
      type: String,
      required: true,
      trim: true,
    },

    // The oldest version still allowed to run, e.g. "1.1.0".
    // If the user's version is below this, the update is FORCED.
    minSupportedVersion: {
      type: String,
      required: true,
      trim: true,
    },

    // Master override: when true, EVERY version below latestVersion is forced,
    // regardless of minSupportedVersion. Handy for emergency roll-outs.
    forceUpdate: {
      type: Boolean,
      default: false,
    },

    // Where "Update now" sends the user (Play Store / App Store link).
    updateUrl: {
      type: String,
      default: "",
      trim: true,
    },

    // Shown in the update dialog ("What's new").
    releaseNotes: {
      type: String,
      default: "A new version of DataEase is available.",
    },

    // Message shown on the blocking screen when an update is forced.
    forceMessage: {
      type: String,
      default:
        "This version is no longer supported. Please update to continue using DataEase.",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

appVersionSchema.index({ platform: 1 });

module.exports = mongoose.model("AppVersion", appVersionSchema);