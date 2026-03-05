const express = require("express");
const chatController = require("../controller/chatController");
const chatRouter = express.Router();
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");


chatRouter.post("/send", authMiddleware,  errorHandler(chatController.sendMessage));

chatRouter.get("/conversation/:conversationId",authMiddleware, errorHandler(chatController.getConversation));

chatRouter.get("/admin/conversations", authMiddleware, errorHandler(chatController.getAllConversations));


module.exports = chatRouter;