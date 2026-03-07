const Admin = require("../model/adminmodel");
const User = require("../model/usermodel");
const Wallet = require("../model/walletmodel");
const bcrypt = require("bcryptjs");

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

  async getAllUsers() {
    return await User.find().select("-password");
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
     WALLET MANAGEMENT
  ================================= */

  async creditUserWallet(userId, amount) {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new Error("Wallet not found");

    wallet.balance += amount;
    return await wallet.save();
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
      console.error(error);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  },



};

module.exports = adminService;