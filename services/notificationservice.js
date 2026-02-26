const webpush = require("web-push");
const {Notifications } = require("../model/notificationmodel");
const  Users  = require("../model/usermodel");

// VAPID keys (generate once and reuse)
const vapidKeys = {
  publicKey: "BEfzj6BbPFocDUPZWrAXtasar3hQedZhaL_EqnnhtNnPR2_Bg3fgCCYo78ihZaL4clxXRjWr1N4AIKgcPS1JFbA",
  privateKey: "03iMak3tvHKZZ-ZIRjsII6eVA4H6OX0F25uiKSNMhx4",
};



webpush.setVapidDetails(
  "mailto:shazaniyu@gmail.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const NotificationService = {
  async createNotification(data) {
    const notification = new Notifications(data);
    return await notification.save();
  },

  async sendWebPushNotification(userId, title, body) {
    const user = await Users.findById(userId);
    if (!user || !user.pushSubscription) {
      console.log("User has no web push subscription");
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
    });

    try {
      await webpush.sendNotification(user.pushSubscription, payload);
      console.log("Web push notification sent.");
    } catch (err) {
      console.error("Error sending push notification", err);
    }
  },

  async sendWebPushToAll(title, body) {
    const users = await Users.find({
      pushSubscription: { $exists: true, $ne: null },
    });

    const payload = JSON.stringify({ title, body });

    for (const user of users) {
      try {
        await webpush.sendNotification(user.pushSubscription, payload);
      } catch (err) {
        console.error("Error sending to user", user._id, err);
      }
    }
  },

};

module.exports = NotificationService;
