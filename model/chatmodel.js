// models/Chat.js
const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
  },

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
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

module.exports = mongoose.model("Chat", chatSchema);