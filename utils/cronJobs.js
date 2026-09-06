const cron = require('node-cron');
const NotificationService = require('../services/notificationservice');
const User = require("../model/usermodel");
const FireNotification = require("../model/firebaseNotifyModel");

cron.schedule("* * * * *", async () => {
  console.log("Running notification cron...");

  try {
    const users = await User.find({});

    for (let user of users) {
      const tokenExists = await FireNotification.findOne({ userId: user._id });

      if (!tokenExists) {
        console.log(`Skipping user ${user._id} (no token)`);
        continue;
      }

      await NotificationService.sendToUser(
        user._id,
        "Reminder ⏰",
        "DataEase has cheap and reliable data solutions. Check out our services now!"
      );
    }

    console.log("Notification cron completed.");

  } catch (error) {
    console.error("Cron error:", error);
  }
});