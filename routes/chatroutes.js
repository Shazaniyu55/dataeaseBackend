const express = require("express");
const chatController = require("../controller/chatController");
const chatRouter = express.Router();
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");


chatRouter.post("/send", authMiddleware,  errorHandler(chatController.sendMessage));
chatRouter.post("/send-vendor", authMiddleware,  errorHandler(chatController.sendVendorMessage));
chatRouter.get("/conversation/:conversationId",authMiddleware, errorHandler(chatController.getConversation));
chatRouter.get("/vendor/conversation/:conversationId",authMiddleware, errorHandler(chatController.getVendorConversation));
chatRouter.get("/admin/conversations", authMiddleware, errorHandler(chatController.getAllConversations));
chatRouter.get("/admin/vendor-conversations", authMiddleware, errorHandler(chatController.getAllVendorConversations));


module.exports = chatRouter;