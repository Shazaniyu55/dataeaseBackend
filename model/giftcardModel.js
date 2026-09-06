const mongoose = require("mongoose");

const GiftCardSchema = new mongoose.Schema(
  {
    //  Core transaction info
    transactionId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    customIdentifier: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESSFUL", "FAILED"],
      default: "PENDING",
    },

    //  Financials
    amount: Number,
    discount: Number,
    fee: Number,
    totalFee: Number,
    currencyCode: String,

    //  Recipient
    recipientEmail: String,
    recipientPhone: String,

    //  Product Info
    product: {
      productId: {
        type: Number,
        required: true,
        index: true,
      },
      productName: String,
      countryCode: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      currencyCode: String,

      brand: {
        brandId: Number,
        brandName: String,
      },
    },

    // Balance snapshot
    balanceInfo: {
      oldBalance: Number,
      newBalance: Number,
      cost: Number,
      currencyCode: String,
      currencyName: String,
      updatedAt: Date,
    },

    //  Time
    transactionCreatedTime: {
      type: Date,
    },

    //  Redeem cards (important for later)
    cards: [
      {
        pinCode: String,
        cardNumber: String,
        redeemUrl: String,
      },
    ],

    //  Your user (optional but recommended)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GiftCard", GiftCardSchema);