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
    referralToken: {
        type: String,
        default: null,
    },
    referralTokenExpiry: {
        type: Date,
        default: null,
    },
    resetToken: {
        type: String,
        default: null
    },
    resetTokenExpiry: {
        type: Date,
        default: null
    },
    referralCount: { 
        type: Number, 
        default: 0 
    },
    referredUsers: [{
        _id: mongoose.Schema.Types.ObjectId,
        fullname: String,
        email: String,
        image: String,
        referredUsers: [{
            _id: mongoose.Schema.Types.ObjectId,
            fullname: String,
            email: String,
            image: String
        }]
    }],

    referredBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },

    referralTier: {
        type: Number,
        default: 1,
        set: (value) => {
            // Convert non-numeric values to a default number
            if (isNaN(value)) return 1; // or any default value
            return Number(value);
        }
    },
    commissions: {
        type: Number,
        default: 0
    },
    points: [{
        packageAmount: Number,
        points: Number
    }],

    payments: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Payment' 
    }]




    
    
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
module.exports = User;
