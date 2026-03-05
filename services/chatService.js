const Chat = require("../model/chatmodel");

const chatService = {

  // Send Message
  async sendMessage(data) {
    const chat = new Chat(data);
    return await chat.save();
  },

  // Get conversation between user and admin
  async getConversation(conversationId) {
    return await Chat.find({ conversationId })
      .sort({ timestamp: 1 });
  },

  // Admin get all conversations (grouped)
  async getAllConversations() {
    return await Chat.aggregate([
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $last: "$message" },
          lastTimestamp: { $last: "$timestamp" },
        },
      },
      { $sort: { lastTimestamp: -1 } },
    ]);
  },

  // Mark as read
  async markAsRead(conversationId) {
    return await Chat.updateMany(
      { conversationId, isRead: false },
      { $set: { isRead: true } }
    );
  },
};

module.exports = chatService;