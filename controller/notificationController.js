const NotificationService = require("../services/notificationservice");

class NotificationController {

  // Create notification
  static async create(req, res) {
    try {
      const notification = await NotificationService.createNotification(req.body);

      res.status(201).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get user notifications
  static async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;

      const notifications =
        await NotificationService.getUserNotifications(userId);

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Mark one notification as read
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;

      const notification = await NotificationService.markAsRead(id);

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Mark all as read
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      await NotificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }


    // Save token from Flutter
  static async saveToken(req, res) {
    try {
      const userId = req.user.userId;
      const { fcmToken, deviceType } = req.body;

      const result = await NotificationService.saveToken(
        userId,
        fcmToken,
        deviceType
      );

      res.json({ status: "success", data: result });

    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  }

   // Send notification manually
  static async sendNotification(req, res) {
    try {
      const { userId, title, body } = req.body;

      const result = await NotificationService.sendToUser(
        userId,
        title,
        body
      );

      res.json({ status: "success", data: result });

    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  }

}

module.exports = NotificationController;