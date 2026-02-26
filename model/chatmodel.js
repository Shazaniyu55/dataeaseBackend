const mongoose = require('mongoose');

// Chat Schema
const chatSchema = new mongoose.Schema({
    senderId: String,
    receiverId: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
  });


module.exports = mongoose.model('Chat', chatSchema);