const { Notifications, NotificationType } = require("../model/notificationmodel");

class NotificationService {
  // Create Notification
  static async createNotification(data) {
    try {
      const notification = await Notifications.create(data);
      return notification;
    } catch (error) {
      throw error;
    }
  }

   static  async sendEmailVerificationOnce(userId) {

    const existingNotification = await Notifications.findOne({
      user: userId,
      type: NotificationType.EMAIL_VERIFICATION
    });

    if (!existingNotification) {
      await Notifications.create({
        user: userId,
        type: NotificationType.EMAIL_VERIFICATION,
        title: "Verify Your Email",
        message: "Verify your email now to unlock more DataEase features."
      });
    }
  }



  // Get user notifications
  static async getUserNotifications(userId) {
    try {
      const notifications = await Notifications.find({ userId })
        .sort({ createdAt: -1 });

      return notifications;
    } catch (error) {
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      const notification = await Notifications.findByIdAndUpdate(
        notificationId,
        { isRead: true },
        { new: true }
      );

      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    try {
      await Notifications.updateMany(
        { user: userId, isRead: false },
        { isRead: true }
      );

      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = NotificationService;