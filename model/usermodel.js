const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
  
    password: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
    },
   
    fullName: {
      type: String,
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    location: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    joined_date: {
      type: Date,
      default: Date.now,
    },
    
    online: {
      type: Boolean,
      default: false,
    },
    
    isPremium: {
      type: Boolean,
      default: false,
    },
    premiumExpiresAt: {
      type: Date,
      default: null,
    },

    userType: {
      type: String,
      
    },
     isVerifiedHouseOwner: {
      type: Boolean,
      default: false,
    },
    
    
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
module.exports = User;
