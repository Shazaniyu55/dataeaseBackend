const mongoose = require("mongoose");

const fireNotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fcmToken: {
    type: String,
    required: true,
  },
  deviceType: {
    type: String,
    enum: ["android", "web"],
  },
}, { timestamps: true });

module.exports = mongoose.model("FireNotification", fireNotificationSchema);