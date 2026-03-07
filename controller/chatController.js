const chatService = require("../services/chatService");

const chatController = {

  // User sends message to Admin
  async sendMessage(req, res) {
    try {
      const { senderId, receiverId, message } = req.body;

      const conversationId =
        senderId < receiverId
          ? senderId + receiverId
          : receiverId + senderId;

      const chat = await chatService.sendMessage({
        senderId,
        receiverId,
        message,
        conversationId,
      });

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: chat,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get chat between user and admin
  async getConversation(req, res) {
    try {
      const { conversationId } = req.params;

      const chats = await chatService.getConversation(conversationId);

      res.status(200).json({
        success: true,
        data: chats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Admin fetch all conversations
  async getAllConversations(req, res) {
    try {
      const conversations =
        await chatService.getAllConversations();

      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

    async sendVendorMessage(req, res) {
    try {
      const { senderId, receiverId, message } = req.body;

      const conversationId =
        senderId < receiverId
          ? senderId + receiverId
          : receiverId + senderId;

      const chat = await chatService.sendVendorMessage({
        senderId,
        receiverId,
        message,
        conversationId,
      });

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: chat,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

    async getVendorConversation(req, res) {
    try {
      const { conversationId } = req.params;

      const chats = await chatService.getVendorConversation(conversationId);

      res.status(200).json({
        success: true,
        data: chats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

   async getAllVendorConversations(req, res) {
    try {
      const conversations =
        await chatService.getAllvendorConversations();

      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

module.exports = chatController;