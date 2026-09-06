const { Notifications, NotificationType } = require("../model/notificationmodel");
const admin = require("../config/firebase");
const  FireNotifications = require("../model/firebaseNotifyModel");

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

  static async deleteSendEmailVerificationOnce(notificationId) {
  const deletedNotification = await Notifications.findOneAndDelete({
    _id: notificationId
  });
  return deletedNotification;
}

//   static async deleteSendEmailVerificationOnce(notificationId) {
//   const deleteNotification = await Notifications.findOneAndDelete({
//     _id: notificationId
//   });
//   console.log(deleteNotification)

//   return deleteNotification;
// }

    static  async sendManualFundRequest(user) {

    const existingNotification = await Notifications.findOne({
      user: user._id,
      type: NotificationType.Maul_Fund
    });

    if (!existingNotification) {
      await Notifications.create({
        user: user._id,
        type: NotificationType.Maul_Fund,
        title: `${user.fullName} Has Funded Wallet Manually`,
        message: `${user.fullName}  has credited data ease wallet pls verify and update his wallet`
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


    /* ===============================
     FireBase Messaging Code
  ================================= */

  // Save or update FCM token
  static async saveToken(userId, fcmToken, deviceType) {
    const existing = await FireNotifications.findOne({ userId });

    if (existing) {
      existing.fcmToken = fcmToken;
      existing.deviceType = deviceType;
      return await existing.save();
    }

    return await FireNotifications.create({ userId, fcmToken, deviceType });
  }

  // Send notification to one user
  static async sendToUser(userId, title, body, data = {}) {
    const tokens = await FireNotifications.find({ userId });

    if (!tokens.length) throw new Error("No device tokens found");

    const messages = tokens.map(t => ({
      notification: { title, body },
      data: data,
      token: t.fcmToken,
    }));

    const results = [];

    for (let msg of messages) {
      try {
        const res = await admin.messaging().send(msg);
        results.push(res);
      } catch (err) {
        console.error("FCM Error:", err.message);
      }
    }

    return results;
  }

  // Send to multiple users
  static async sendBulk(userIds, title, body) {
    const tokens = await FireNotifications.find({ userId: { $in: userIds } });

    const fcmTokens = tokens.map(t => t.fcmToken);

    if (!fcmTokens.length) throw new Error("No tokens found");

    return await admin.messaging().sendMulticast({
      tokens: fcmTokens,
      notification: { title, body },
    });
  }

   static  async sendPromotion(userId, title, message) {

    const existingNotification = await Notifications.findOne({
      user: userId,
      type: NotificationType.PROMOTION
    });

    if (!existingNotification) {
      await Notifications.create({
        user: userId,
        type: NotificationType.PROMOTION,
        title: title,
        message: message
      });
    }
  }



}

module.exports = NotificationService;