const Chat = require("../model/chatmodel");
const Vendor = require("../model/vendormodel");

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

//Vendor Service
async sendVendorMessage(data) {
    const chat = new Vendor(data);
    return await chat.save();
  },

  // Get conversation between user and admin
  async getVendorConversation(conversationId) {
    return await Vendor.find({ conversationId })
      .sort({ timestamp: 1 });
  },

  // Admin get all conversations (grouped)
  async getAllvendorConversations() {
    return await Vendor.aggregate([
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


};

module.exports = chatService;