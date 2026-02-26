const mongoose = require("mongoose");

const NotificationType = {
  NewPost: "new_post",
  NewFollower: "new_follower",
  NewLike: "new_like",
  NewStory: "new_story",
  Mention: "mention",
  Comment: "comment",
  Auth: "auth",
};

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
    },
    message: {
      type: String,
    },
    mentionedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notifications = mongoose.model("Notification", NotificationSchema);

module.exports = {
  Notifications,
  NotificationType,
};
