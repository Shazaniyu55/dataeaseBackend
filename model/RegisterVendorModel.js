const mongoose = require("mongoose");
const { Schema } = mongoose;

const resellerSchema = new Schema(
  {
    // 🔐 AUTH
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },

    // 👤 PROFILE
    fullName: String,
    phoneNumber: {
      type: String,
      required: true,
    },
    profilePic: String,
    bio: String,
    location: String,

    // 🏢 BUSINESS INFO
    businessName: String,
    businessType: String, // individual / company
    businessAddress: String,

    // 🪪 KYC VERIFICATION
    kyc: {
      idType: {
        type: String, // NIN, BVN, Passport
      },
      idNumber: String,
      idImage: String, // upload URL
      selfieWithId: String,
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      rejectionReason: String,
      verifiedAt: Date,
    },

    // 💰 WALLET
    walletBalance: {
      type: Number,
      default: 0,
    },

    // 📊 STATUS
    isVerified: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "blocked"],
      default: "active",
    },

    // 🔐 OTP
    otp: String,
    otpExpiresAt: Date,

    // 🌐 SYSTEM
    online: {
      type: Boolean,
      default: false,
    },
    userType: {
      type: String,
      default: "Reseller",
    },
  },
  { timestamps: true }
);

const Reseller = mongoose.model("Reseller", resellerSchema);
module.exports = Reseller;

// module.exports = mongoose.model("", resellerSchema);