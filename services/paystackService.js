const axios = require("axios");
const crypto = require("crypto");
const Wallet = require("../model/walletmodel");

class PaystackService {
  static async initializePayment(user, amount) {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user.email,
        amount: amount * 100, // convert to kobo
        metadata: {
          userId: user._id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  }

 


  static async verifyPayment(reference, user) {
    try{
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    const paystackData = response.data.data;

    if (paystackData.status !== "success") {
      throw new Error("Payment not successful");
    }

    const userId = user.userId;
    const amountPaid = paystackData.amount / 100;

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0,
        transactions: [],
      });
    }

    const existingTransaction = wallet.transactions.find(
      (tx) => tx.reference === reference
    );

    if (existingTransaction) {
      return existingTransaction;
    }

    wallet.transactions.push({
      type: "other",
      amount: amountPaid,
      costPrice: amountPaid,
      sellingPrice: amountPaid,
      profit: 0,
      reference,
      status: "success",
    });


    wallet.balance += amountPaid;

    await wallet.save();

    return wallet;
    

    }catch(error){
      throw error;
    }
  }
}

module.exports = PaystackService;