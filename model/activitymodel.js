const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["login", "airtime", "data"],
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    commissionEarned: {
      type: Number,
      default: 0,
    },

    //  exact timestamp
    date: {
      type: Date,
      default: Date.now,
    },

    //  normalized day (IMPORTANT)
    day: {
      type: String, // "2026-04-04"
    },
  },
  { timestamps: true }
);

// Prevent duplicate login per day per user
ActivitySchema.index(
  { user: 1, type: 1, day: 1 },
  { unique: true }
);

module.exports = mongoose.model("Activity", ActivitySchema);
// const mongoose = require("mongoose");

// const ActivitySchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//     type: {
//       type: String,
//       enum: ["login", "airtime", "data"],
//       required: true,
//     },
//     amount: {
//       type: Number,
//       default: 0,
//     },
//     commissionEarned: {
//       type: Number,
//       default: 0,
//     },
//     date: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Activity", ActivitySchema);