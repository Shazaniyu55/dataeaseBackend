// models/Chat.js
const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
  },
  //  USER (sender)
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
// RESELLER (receiver)
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reseller",
    required: true,
  },
  

  message: {
    type: String,
    required: true,
  },

  isRead: {
    type: Boolean,
    default: false,
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Vendor", vendorSchema);