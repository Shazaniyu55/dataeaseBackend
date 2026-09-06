const Admin = require("../model/adminmodel");
const User = require("../model/usermodel");
const Wallet = require("../model/walletmodel");
const bcrypt = require("bcryptjs");
const {SendPromotionalEmail} = require("../utils/emailserivce")
const FundRequest = require("../model/fundingRequest");
const Chat = require("../model/chatmodel");
const Kyc = require("../model/kycModel");
const Reseller = require("../model/RegisterVendorModel")
const Activity= require("../model/activitymodel");

const adminService = {

  /* ===============================
     ADMIN AUTHENTICATION
  ================================= */

 

  async createAdmin(data) {

    const admin = await new Admin(data)

    return await admin.save();
  },

  async loginAdmin(email) {
    return await Admin.findOne({ email });
  },

  async getAdminById(id) {
    return await Admin.findById(id).select("-password");
  },

   async getUserByEmail(email) {
          return await Admin.findOne({ email });
        },

  async updateAdminProfile(adminId, data) {
    return await Admin.findByIdAndUpdate(
      adminId,
      data,
      { new: true }
    ).select("-password");
  },

  async changePassword(adminId, oldPassword, newPassword) {
    const admin = await Admin.findById(adminId);
    if (!admin) throw new Error("Admin not found");

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) throw new Error("Old password incorrect");

    admin.password = await bcrypt.hash(newPassword, 10);
    return await admin.save();
  },


  /* ===============================
     USER MANAGEMENT
  ================================= */

  // async getAllUsers() {
  //   return await User.find().select("-password");
  // },

async getUserConversation(userId) {
  return await Chat.find({
    $or: [
      { senderId: userId },
      { receiverId: userId }
    ]
  }).sort({ timestamp: 1 });
},

async getAllUsers() {
  const users = await User.find().select("-password");

  const usersWithWallet = await Promise.all(
    users.map(async (user) => {
      const wallet = await Wallet.findOne({ user: user._id });

      return {
        ...user.toObject(),
        walletBalance: wallet ? wallet.balance : 0,
        transactions: wallet ? wallet.transactions : []
      };
    })
  );

  return usersWithWallet;
},

  async  getUserById(userId) {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  const wallet = await Wallet.findOne({ userId });

  return {
    ...user.toObject(),
    walletBalance: wallet ? wallet.balance : 0,
    transactions: wallet ? wallet.transactions : []
  };
},

  async blockUser(userId) {
    return await User.findByIdAndUpdate(
      userId,
      { isBlocked: true },
      { new: true }
    );
  },

  async unblockUser(userId) {
    return await User.findByIdAndUpdate(
      userId,
      { isBlocked: false },
      { new: true }
    );
  },

  async deleteUser(userId) {
    return await User.findByIdAndDelete(userId);
  },

  
  /* ===============================
     Email MANAGEMENT
  ================================= */

  async sendPromotionalEmailToUser(userId, promoData) {
    // promoData = { promoUrl, promoTitle, promoDescription, ctaText }
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    await SendPromotionalEmail(
      user.email,
      promoData.promoUrl,
      promoData.promoTitle,
      promoData.promoDescription,
      promoData.bannerImageUrl,
      promoData.ctaText
    );

    return { message: `Promotional email sent to ${user.email}` };
  },

  /* ===============================
     WALLET MANAGEMENT
  ================================= */

async creditUserWallet(user, amount) {
  try {
    const userId = user._id;
    const numericAmount = Number(amount);

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0,
        transactions: [],
      });
    }

    // Generate reference FIRST
    const reference =  Date.now().toString();;

    const existingTransaction = wallet.transactions.find(
      (tx) => tx.reference === reference
    );

    if (existingTransaction) {
      return existingTransaction;
    }

    wallet.transactions.push({
      reference,
      type: "Wallet_Funded",
      network: "paystack",
      phoneOrAccount: user.email,
      amount: numericAmount,
      costPrice: numericAmount,
      sellingPrice: numericAmount,
      profit: 0,
      status: "success",
    });

    wallet.balance += numericAmount;

    await wallet.save();

    return wallet;
  } catch (error) {
    throw error;
  }
},


  async debitUserWallet(userId, amount) {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new Error("Wallet not found");

    if (wallet.balance < amount)
      throw new Error("Insufficient balance");

    wallet.balance -= amount;
    return await wallet.save();
  },


  /* ===============================
     TRANSACTIONS
  ================================= */
async  getAllTransactions() {
  // Aggregate all transactions across all wallets
  const transactions = await Wallet.aggregate([
    { $unwind: "$transactions" }, // flatten transactions array
    {
      $lookup: {
        from: "users", // collection name in MongoDB (usually lowercase plural of model)
        localField: "userId",
        foreignField: "_id",
        as: "userInfo"
      }
    },
    { $unwind: "$userInfo" }, // get single user object
    {
      $project: {
        _id: "$transactions._id",
        reference: "$transactions.reference",
        type: "$transactions.type",
        network: "$transactions.network",
        phoneOrAccount: "$transactions.phoneOrAccount",
        amount: "$transactions.amount",
        costPrice: "$transactions.costPrice",
        sellingPrice: "$transactions.sellingPrice",
        profit: "$transactions.profit",
        status: "$transactions.status",
        createdAt: "$transactions.createdAt",
        user: {
          _id: "$userInfo._id",
          fullName: "$userInfo.fullName",
          email: "$userInfo.email"
        }
      }
    },
    { $sort: { createdAt: -1 } } // latest first
  ]);

  return transactions;
},

async  getUserTransactions(userId) {
  // Find the wallet of the user
  const wallet = await Wallet.findOne({ userId });

  if (!wallet) return []; // return empty array if no wallet

  // Sort transactions by createdAt descending
  const sortedTransactions = wallet.transactions.sort(
    (a, b) => b.createdAt - a.createdAt
  );

  return sortedTransactions;
},

async  getFundingRequest(userId) {

  try {
      if (!userId) throw new Error("User ID is required");
    //console.log("service id", userId)
    // Fetch all funding requests for this user
    const requests = await FundRequest.find({ userId }).sort({ createdAt: -1 });
    //console.log(requests)

    return requests;
  } catch (error) {
    //console.error("Error fetching funding requests:", error.message);
    throw new Error("Could not fetch funding requests");
  }
},

async  getFundingRequestAll() {

  try {
    // Fetch all funding requests for this user
    const requests = await FundRequest.find().sort({ createdAt: -1 });

    return requests;
  } catch (error) {
    //console.error("Error fetching funding requests:", error.message);
    throw new Error("Could not fetch funding requests");
  }
},
 
  /* ===============================
     DASHBOARD STATISTICS
  ================================= */

async getDashboardStats() {

  const [totalUsers, totalAdmins] = await Promise.all([
    User.countDocuments(),
    Admin.countDocuments()
  ]);

  // Aggregate over embedded transactions
  const transactionStats = await Wallet.aggregate([
    { $unwind: "$transactions" }, // break array into documents
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalTransactionAmount: { $sum: "$transactions.amount" }
      }
    }
  ]);

  return {
    totalUsers,
    totalAdmins,
    totalTransactions: transactionStats[0]?.totalTransactions || 0,
    totalTransactionAmount:
      transactionStats[0]?.totalTransactionAmount || 0
  };
},


 async getRevenueDashboard  ()  {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Aggregate transactions across all wallets
      const revenueStats = await Wallet.aggregate([
        { $unwind: "$transactions" }, // flatten all transactions
        { $match: { "transactions.status": "success" } }, // only successful transactions
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$transactions.profit" }, // total profit
            todayRevenue: {
              $sum: {
                $cond: [
                  { $gte: ["$transactions.createdAt", today] },
                  "$transactions.profit",
                  0
                ]
              }
            },
            monthRevenue: {
              $sum: {
                $cond: [
                  { $gte: ["$transactions.createdAt", firstDayOfMonth] },
                  "$transactions.profit",
                  0
                ]
              }
            }
          }
        }
      ]);

      // Revenue by service type
      const revenueByService = await Wallet.aggregate([
        { $unwind: "$transactions" },
        { $match: { "transactions.status": "success" } },
        {
          $group: {
            _id: "$transactions.type",
            total: { $sum: "$transactions.profit" }
          }
        }
      ]);

      
        return {
          totalRevenue: revenueStats[0]?.totalRevenue || 0,
          todayRevenue: revenueStats[0]?.todayRevenue || 0,
          monthRevenue: revenueStats[0]?.monthRevenue || 0,
          revenueByService
        }
      
    } catch (error) {
      //console.error(error);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  },

async approveFundingRequest(id) {
  try {
    if (!id) throw new Error("Request ID is required");

    const request = await FundRequest.findByIdAndUpdate(
      id,
      { status: "success" },
      { new: true }
    );

    return request;
  } catch (error) {
    throw new Error("Could not approve funding request");
  }
},

  /* ===============================
     KYC MANAGEMENT
  ================================= */



async approveUserKycByUserId(userId, adminId) {
  try {
    if (!userId) throw new Error("User ID is required");

    const updatedKyc = await Kyc.findOneAndUpdate(
      { user: userId }, // 🔥 FIX HERE
      {
        status: "approved",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedKyc) {
      throw new Error("KYC not found for this user");
    }

    return updatedKyc;

  } catch (error) {
    //console.log("Approve KYC Error:", error);
    throw error;
  }
},

async declineUserKyc(id, adminId) {
  try {
    if (!id) throw new Error("KYC ID is required");

    const deletedKyc = await Kyc.findOneAndDelete(
      { user: id }, // 🔥 FIX HERE
      {
        status: "rejected",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      { new: true });

    if (!deletedKyc) {
      throw new Error("KYC record not found");
    }

    return deletedKyc;

  } catch (error) {
    //console.log(error)
    throw new Error("Could not decline KYC");
  }
},


async  getUserKyc(userId) {

  try {
      if (!userId) throw new Error("User ID is required");
    //console.log("service id", userId)
    // Fetch all funding requests for this user
    const requests = await Kyc.find({ userId }).sort({ createdAt: -1 });
    //console.log(requests)

    return requests;
  } catch (error) {
    //console.error("Error fetching kyc", error.message);
    throw new Error("Could not fetch kyc");
  }
},

async getAllKyc () {
  try {
    // Fetch all KYC records and populate user info
    const kycs = await Kyc.find()
      .populate("user", "name email") // get user's name & email
      .sort({ createdAt: -1 }); // newest first

    return kycs;
  } catch (error) {
    //console.error("Error fetching KYC records:", error);
    throw new Error("Could not fetch KYC records");
  }
},


async  getResellerKyc() {

   try {
    // Fetch all KYC records and populate user info
    const kycs = await Reseller.find()
      .populate("userType", "name email") // get user's name & email
      .sort({ createdAt: -1 }); // newest first

    return kycs;
  } catch (error) {
    //console.error("Error fetching KYC records:", error);
    throw new Error("Could not fetch KYC records");
  }
},

  async searchUsersService  (query) {
  try {
    if (!query) {
      throw new Error("Search query is required");
    }

    const users = await User.find({
      $or: [
        { fullName: { $regex: query, $options: "i" } },   // search by name
        { email: { $regex: query, $options: "i" } },  // search by email
      ],
    })
    .select("-password") // remove sensitive data
    .limit(20); // prevent overload

    return users;
  } catch (error) {
    throw error;
  }
},

async getAllUserloginActivity() {
  try {
    const activities = await Activity.find({ type: "login" })
      .populate("user", "fullName email profilePic")
      .sort({ createdAt: -1 });

    return activities;
  } catch (error) {
    throw new Error(error.message);
  }
},

async getDailyLoginStats() {
  try {
    const stats = await Activity.aggregate([
      { $match: { type: "login" } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    return stats;
  } catch (error) {
    throw new Error(error.message);
  }
},

async getUserLoginActivity(userId) {
  try {
    const activities = await Activity.find({
      user: userId,
      type: "login"
    })
      .sort({ createdAt: -1 });

    return activities;
  } catch (error) {
    throw new Error(error.message);
  }
},


async getReferralLoginActivity(userId) {
  try {
    const user = await User.findById(userId);

    const referredIds = user.referredUsers.map(u => u._id);

    const activities = await Activity.find({
      user: { $in: referredIds },
      type: "login"
    }).populate("user", "fullName email");

    return activities;
  } catch (error) {
    throw new Error(error.message);
  }
},

async getAllUserRewardActivity() {
  try {
    const activities = await Activity.find({ type: "airtime" })
      .populate("user", "fullName email profilePic")
      .sort({ createdAt: -1 });

    return activities;
  } catch (error) {
    throw new Error(error.message);
  }
},

async creditAffiliateWallet(user, amount) {
  try {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      throw new Error("Invalid amount");
    }

    //  Update directly in DB
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $inc: { commissions: numericAmount },
      },
      { new: true } // return updated user
    );

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return {
      success: true,
      message: "Commission credited successfully",
      commissions: updatedUser.commissions,
    };

  } catch (error) {
    throw error;
  }
},

 async sendNotificationToUser(userId, promoData) {
    // promoData = { promoUrl, promoTitle, promoDescription, ctaText }
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    await SendPromotionalEmail(
      user.email,
      promoData.promoUrl,
      promoData.promoTitle,
      promoData.promoDescription,
      promoData.bannerImageUrl,
      promoData.ctaText
    );

    return { message: `Promotional email sent to ${user.email}` };
  },


async searchUsersTransaction(query) {
  try {
    if (!query) {
      throw new Error("Search query is required");
    }

    // Step 1: Find matching users by name or email
    const matchingUsers = await User.find({
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
    .select("_id fullName email")
    .limit(20);

    if (!matchingUsers.length) return [];

    const userIds = matchingUsers.map((u) => u._id);

    // Step 2: Find wallets belonging to those users
    const wallets = await Wallet.find({ userId: { $in: userIds } })
      .populate("userId", "fullName email") // attach user info
      .select("userId balance transactions");

    return wallets;
  } catch (error) {
    throw error;
  }
},
};

module.exports = adminService;