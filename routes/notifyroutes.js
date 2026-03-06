const express = require("express");
const NotificationController = require("../controller/notificationController");
const notifyRouter = express.Router();
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");

notifyRouter.get('/get-user-notify', authMiddleware, errorHandler(NotificationController.getUserNotifications));


module.exports = notifyRouter;