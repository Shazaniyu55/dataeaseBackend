const AdminService = require("../services/adminservice");
const successResponse = require("../utils/successresponse");
const HttpException = require("../utils/httpException");
const {comparePasswords, hashPassword} = require("../utils/bcrypt")
const STATUSCODES = require('../constant/statuscode');
const {jwtSign} = require('../utils/jwts');
const userService = require("../services/userservice");
const NotificationService = require("../services/notificationservice");
const { sendSms, sendSmsToUser, broadcastSms } = require('../services/twilloservice');
const BlockedIP = require("../model/blockedIPModel");
const User = require("../model/usermodel");
const KillSwitch  = require("../model/killswitchmodel");
const BlockedEmail = require("../model/blockmailmodel");
const { bustCache } = require("../middlewares/killswitchmiddleware");

const AdminController = {
  createAdmin: async (req, res)=>{
    try{
        const{email, password, fullname} = req.body;

        if(!email || !password || !fullname){
            throw new HttpException(404, "all fields required");
        }

        const existingUser = await AdminService.getUserByEmail(email);

        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashed = await hashPassword(password);


        const newuser = await AdminService.createAdmin({
            email,
            password: hashed,
            fullname,
             userType:"Admin",
            isAdmin:true
        })

                  const token = jwtSign({
                    userId: newuser.id,
                    email: newuser.email
                  });
        
                  successResponse(res, {token, newuser}, "Admin registered successfully. ", STATUSCODES.CREATED);
        
                



    }catch(error){

    }
  },
  

  createSubAdmin: async (req, res)=>{
    try{
        const{email, password, fullname} = req.body;

        if(!email || !password || !fullname){
            throw new HttpException(404, "all fields required");
        }

        const existingUser = await AdminService.getUserByEmail(email);

        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashed = await hashPassword(password);


        const newuser = await AdminService.createAdmin({
            email,
            password: hashed,
            fullname,
             userType:"subAdmin",
            isAdmin:false
        })

                  const token = jwtSign({
                    userId: newuser.id,
                    email: newuser.email
                  });
        
                  successResponse(res, {token, newuser}, "Admin registered successfully. ", STATUSCODES.CREATED);
        
                



    }catch(error){

    }
  },

  loginAdmin: async(req, res)=>{

        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ status: "failed", message: "Email and password are required" });
          }

           const user = await AdminService.getUserByEmail(email);
            if (!user) {
               return res.status(404).json({ status: "failed", message: "User with this email does not exist" });
             }


             if(user.userType !== "Admin"){
              return res.status(403).json({ status: "failed", message: "Access denied: must be Admin" });
            }
           
             const isPasswordValid = await comparePasswords(password, user.password);
             if (!isPasswordValid) {
                 return res.status(401).json({ status: "failed", message: "Invalid password" });
               }
             
                //  const userResponse = {
                //    _id: user._id,
                //    fullName: user.fullName,
                //    username: user.username,
                //    phoneNumber: user.phoneNumber,
                //    email: user.email,
                //    createdAt: user.createdAt,
                //    updatedAt: user.updatedAt,
                //  };
               
                 const token = jwtSign({
                   userId: user._id,
                   email: user.email
                 });
               
                 return successResponse(res, { token, user }, "Login successful", STATUSCODES.SUCCESS);
    
  

  
  },




  loginSubAdmin: async(req, res)=>{

        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ status: "failed", message: "Email and password are required" });
          }

           const user = await AdminService.getUserByEmail(email);
            if (!user) {
               return res.status(404).json({ status: "failed", message: "User with this email does not exist" });
             }

             if(user.userType !== "subAdmin"){
              return res.status(403).json({ status: "failed", message: "Access denied: must be subAdmin" });
            }
           
             const isPasswordValid = await comparePasswords(password, user.password);
             if (!isPasswordValid) {
                 return res.status(401).json({ status: "failed", message: "Invalid password" });
               }
             
                //  const userResponse = {
                //    _id: user._id,
                //    fullName: user.fullName,
                //    username: user.username,
                //    phoneNumber: user.phoneNumber,
                //    email: user.email,
                //    createdAt: user.createdAt,
                //    updatedAt: user.updatedAt,
                //  };
               
                 const token = jwtSign({
                   userId: user._id,
                   email: user.email
                 });
               
                 return successResponse(res, { token, user }, "Login successful", STATUSCODES.SUCCESS);
    
  

  
  },


 getAllUsers: async (req, res) => {
  try {
    // // Optional: Ensure only admin can access
    // if (!req.user || !req.user.userId) {
    //   throw new HttpException(401, "Unauthorized access");
    // }

    const users = await AdminService.getAllUsers();

    if (!users || users.length === 0) {
      return successResponse(
        res,
        [],
        "No users found",
        STATUSCODES.SUCCESS
      );
    }

    return successResponse(
      res,
      users,
      "Users fetched successfully",
      STATUSCODES.SUCCESS
    );

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},

deleteUsers: async (req, res) => {
  try {
    const {userId} = req.params;
    // // Optional: Ensure only admin can access
    // if (!req.user || !req.user.userId) {
    //   throw new HttpException(401, "Unauthorized access");
    // }

    const users = await AdminService.deleteUser(userId);

    if (!users || users.length === 0) {
      return successResponse(
        res,
        [],
        "No users found",
        STATUSCODES.SUCCESS
      );
    }

    return successResponse(
      res,
      users,
      "Users fetched successfully",
      STATUSCODES.SUCCESS
    );

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},


getDashboard: async(req, res)=>{
  try {
    // // Optional: Ensure only admin can access
    // if (!req.user || !req.user.userId) {
    //   throw new HttpException(401, "Unauthorized access");
    // }

    const users = await AdminService.getDashboardStats();

    if (!users || users.length === 0) {
      return successResponse(
        res,
        [],
        "No users found",
        STATUSCODES.SUCCESS
      );
    }

    return successResponse(
      res,
      users,
      "Users fetched successfully",
      STATUSCODES.SUCCESS
    );

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},

getRevenue: async(req, res)=>{
  try {
    // // Optional: Ensure only admin can access
    // if (!req.user || !req.user.userId) {
    //   throw new HttpException(401, "Unauthorized access");
    // }

    const users = await AdminService.getRevenueDashboard();

    if (!users || users.length === 0) {
      return successResponse(
        res,
        [],
        "No users found",
        STATUSCODES.SUCCESS
      );
    }

    return successResponse(
      res,
      users,
      "Users fetched successfully",
      STATUSCODES.SUCCESS
    );

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},

 getUsersById: async (req, res) => {
  try {
    const {id} = req.params
    // // Optional: Ensure only admin can access
    // if (!req.user || !req.user.userId) {
    //   throw new HttpException(401, "Unauthorized access");
    // }

    const users = await AdminService.getUserById(id);

    if (!users || users.length === 0) {
      return successResponse(
        res,
        [],
        "No users found",
        STATUSCODES.SUCCESS
      );
    }

    return successResponse(
      res,
      users,
      "Users fetched successfully",
      STATUSCODES.SUCCESS
    );

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},

// controllers/adminController.js

creditedUserWallet: async (req, res) => {
  try {
    const  {id}  = req.params;
    const user = await userService.getUserById(id);

    const { amount } = req.body;

    // console.log("userId", id)
    // console.log("user", user)
    // console.log("amount", amount)

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        status: "failed",
        message: "Valid amount is required",
      });
    }

    const wallet = await AdminService.creditUserWallet(user, Number(amount));

    //console.log(wallet)

    return successResponse(
      res,
      wallet,
      "Wallet credited successfully",
      STATUSCODES.SUCCESS
    );
  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},

 sendPromotionalEmail: async(req, res) =>{
    try {
      const { userId } = req.params; // e.g., /api/email/promotional/:userId
      const { promoUrl, promoTitle, promoDescription, bannerImageUrl, ctaText } = req.body;

      const result = await AdminService.sendPromotionalEmailToUser(userId, {
        promoUrl,
        promoTitle,
        promoDescription,
        bannerImageUrl,

        ctaText,
      });

      res.status(200).json(result);
    } catch (err) {
      //console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  getuserConversation: async(req, res)=>{
     
    try{
    const { userId } = req.params;
   // console.log("userIs:", userId)

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const chats = await AdminService.getUserConversation(userId);
    //console.log(chats)

    return res.status(200).json({
      success: true,
      message: "Chats fetched successfully",
      data: chats
    });

  } catch (error) {
    //console.error("Error fetching conversation:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  
  

  }

},

 getUserFundingRequests: async(req, res) =>{
  const userId = req.params.userId; // assuming userId is passed in URL params
  //console.log(userId)

  try {
    const requests = await AdminService.getFundingRequest(userId);

    return res.status(200).json({
      success: true,
      message: "Funding requests fetched successfully",
      data: requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
},

updatefundingrequest: async (req, res)=>{
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Request ID is required",
      });
    }

    const request = await AdminService.approveFundingRequest(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Funding request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Funding request approved successfully",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to approve funding request",
    });
  }
},


 getUserFundingRequestsAll: async(req, res) =>{


  try {
    const requests = await AdminService.getFundingRequestAll();

    return res.status(200).json({
      success: true,
      message: "Funding requests fetched successfully",
      data: requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
},

declineKyc: async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    const result = await AdminService.declineUserKyc(id, adminId);

    return res.status(200).json({
      status: "success",
      message: "KYC declined successfully",
      data: result,
    });

  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
},

approveKyc: async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    //console.log(id, adminId)

    const result = await AdminService.approveUserKycByUserId(id, adminId);

    return res.status(200).json({
      status: "success",
      message: "KYC approved successfully",
      data: result,
    });

  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
},

getAllKyc:async (req, res) => {
  try {
    const kycs = await AdminService.getAllKyc();

    return res.status(200).json({
      status: "success",
      message: "All KYC records fetched successfully",
      data: kycs,
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
},

getAllResellerKyc:async (req, res) => {
  try {
    const kycs = await AdminService.getResellerKyc();
   // console.log(kycs)

    return res.status(200).json({
      status: "success",
      message: "All KYC records fetched successfully",
      data: kycs,
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
},

sendPushNotificationToUser: async(req, res)=>{
  try{
    const { userId } = req.params;
    const { title, body} = req.body;
    //console.log(userId, title, body)
    if(!userId || !title || !body){
      throw new HttpException(404, "All field are required")
    }

   const notify = await NotificationService.sendToUser(userId, title, body);
   await NotificationService.sendPromotion(userId, title, body);
    successResponse(res, notify , "Notification send to  users successfully. ", STATUSCODES.CREATED);


  }catch(error){
    //console.log(error)
      return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},

  searchUsers: async (req, res) => {
  try {
    const { q } = req.query;

    const users = await AdminService.searchUsersService(q);

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
},

getAllUserloginActivity: async (req, res)=>{
    try{
      const  logactivity = await AdminService.getAllUserloginActivity();
      return res.status(200).json({
      success: true,
      data: logactivity,
    });
    }catch(error){
        return res.status(500).json({
      success: false,
      message: error.message,
    });
    }
},


getAllUserRewardActivity: async (req, res)=>{
    try{
      const  logactivity = await AdminService.getAllUserRewardActivity();
      return res.status(200).json({
      success: true,
      data: logactivity,
    });
    }catch(error){
        return res.status(500).json({
      success: false,
      message: error.message,
    });
    }
},

creditedAffiliatecommission: async (req, res) => {
  try {
    const  {id}  = req.params;
    const user = await userService.getUserById(id);

    const { amount } = req.body;

    // console.log("userId", id)
    // console.log("user", user)
    // console.log("amount", amount)

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        status: "failed",
        message: "Valid amount is required",
      });
    }

    const wallet = await AdminService.creditAffiliateWallet(user, Number(amount));

    //console.log(wallet)

    return successResponse(
      res,
      wallet,
      "commission credited successfully",
      STATUSCODES.SUCCESS
    );
  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},

 searchUsersTransaction: async (req, res) => {
  try {
    const { query } = req.query; // e.g. GET /transactions/search?query=john

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const results = await AdminService.searchUsersTransaction(query);

    if (!results.length) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for the given search query",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transactions retrieved successfully",
      count: results.length,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
},

/**
 * POST /api/sms/send
 * Send an SMS directly to a phone number.
 * Body: { to: "+2348012345678", message: "Hello!" }
 */
 sendDirectSms: async (req, res) => {
  try {
    const { to, message } = req.body;
 
    if (!to || !message) {
      return res.status(400).json({ success: false, error: '`to` and `message` are required.' });
    }
 
    const result = await sendSms(to, message);
 
    return res.status(200).json({
      success: true,
      messageSid: result.sid,
      status: result.status,
      to: result.to,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
},



/**
 * POST /api/sms/send-to-user
 * Send an SMS to a user by their MongoDB ID.
 * Body: { userId: "64abc...", message: "Hello!" }
 */
 sendSmsToUserById: async (req, res) => {
  try {
    const { userId, message } = req.body;
 
    if (!userId || !message) {
      return res.status(400).json({ success: false, error: '`userId` and `message` are required.' });
    }
 
    const result = await sendSmsToUser(userId, message);
 
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    const statusCode = err.message.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
},
 
/**
 * POST /api/sms/broadcast
 * Broadcast an SMS to all users with a phone number.
 * Body: { message: "Hello everyone!" }
 */
 broadcastSmsToAll: async (req, res) => {
  try {
    const { message } = req.body;
 
    if (!message) {
      return res.status(400).json({ success: false, error: '`message` is required.' });
    }
 
    const results = await broadcastSms(message);
    const failed = results.filter((r) => !r.success);
 
    return res.status(200).json({
      success: true,
      total: results.length,
      sent: results.length - failed.length,
      failed: failed.length,
      results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
},


// ─────────────────────────────────────────────────────────────────────────────
//  FORCE LOGOUT (admin or user kicks all sessions — useful for security)
// ─────────────────────────────────────────────────────────────────────────────

forceLogout: async (req, res) => {
  const userId = req.user.userId; // or req.params.userId if called by admin
 
  await userService.updateUser(userId, {
    activeSessionToken: null,
    activeSessionAt:    null,
    activeDevice:       null,
    online:             false,
  });
 
  return successResponse(res, null, "All sessions terminated", STATUSCODES.SUCCESS);
},


// ─── BLOCK AN IP ──────────────────────────────────────────────────────────────
blockIP: async (req, res) => {
  try {
    const { ip, reason, userId } = req.body;
    const adminId = req.user.userId;
 
    if (!ip || !reason) {
      return res.status(400).json({
        status: "failed",
        message: "IP address and reason are required",
      });
    }
 
    // basic IP format check
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6 = /^[a-fA-F0-9:]+$/;
    if (!ipv4.test(ip) && !ipv6.test(ip)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid IP address format",
      });
    }
 
    // if already blocked, just reactivate with new reason
    const existing = await BlockedIP.findOne({ ip });
    if (existing) {
      existing.isActive    = true;
      existing.reason      = reason;
      existing.blockedBy   = adminId;
      existing.unblockedAt = null;
      if (userId) existing.user = userId;
      await existing.save();
 
      return res.status(200).json({
        status: "success",
        message: `IP ${ip} is now blocked`,
        data: existing,
      });
    }
 
    const blocked = await BlockedIP.create({
      ip,
      reason,
      user:      userId || null,
      blockedBy: adminId,
      isActive:  true,
    });
 
    // also invalidate the user's active session so they're kicked immediately
    if (userId) {
      await require("../model/usermodel").findByIdAndUpdate(userId, {
        activeSessionToken: null,
        online: false,
      });
    }
 
    return res.status(201).json({
      status: "success",
      message: `IP ${ip} has been blocked`,
      data: blocked,
    });
 
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
},
 
// ─── UNBLOCK AN IP ────────────────────────────────────────────────────────────
unblockIP: async (req, res) => {
  try {
    const { id } = req.params; // BlockedIP document _id
 
    const blocked = await BlockedIP.findById(id);
    if (!blocked) {
      return res.status(404).json({
        status: "failed",
        message: "Blocked IP record not found",
      });
    }
 
    blocked.isActive    = false;
    blocked.unblockedAt = new Date();
    await blocked.save();
 
    return res.status(200).json({
      status: "success",
      message: `IP ${blocked.ip} has been unblocked`,
      data: blocked,
    });
 
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
},
 
// ─── GET ALL BLOCKED IPs ──────────────────────────────────────────────────────
getBlockedIPs: async (req, res) => {
  try {
    const { active } = req.query; // ?active=true to filter active only
 
    const filter = {};
    if (active === "true")  filter.isActive = true;
    if (active === "false") filter.isActive = false;
 
    const list = await BlockedIP.find(filter)
      .populate("user",      "fullName email")
      .populate("blockedBy", "fullname email")
      .sort({ createdAt: -1 });
 
    return res.status(200).json({
      status: "success",
      data: list,
    });
 
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
},
 
// ─── BLOCK BY USER ID (auto-read IP from their activeDevice) ─────────────────
// blockUserByID: async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { reason }  = req.body;
//     const adminId     = req.user.userId;
 
//     if (!reason) {
//       return res.status(400).json({ status: "failed", message: "Reason is required" });
//     }
 
//     const user = await User.findById(userId);
 
//     if (!user) {
//       return res.status(404).json({ status: "failed", message: "User not found" });
//     }
 
//     // parse IP from stored activeDevice "Mobile · 102.88.1.5 · 2026-05-14"
//     let ip = null;
//     if (user.activeDevice) {
//       const parts = user.activeDevice.split(" · ");
//       ip = parts[1] || null;
//     }
 
//     if (!ip) {
//       return res.status(400).json({
//         status: "failed",
//         message: "No active device IP found for this user. Use manual block instead.",
//       });
//     }
 
//     // reuse blockIP logic
//     const existing = await BlockedIP.findOne({ ip });
//     if (existing && existing.isActive) {
//       return res.status(400).json({
//         status: "failed",
//         message: `IP ${ip} is already blocked`,
//       });
//     }
 
//     if (existing) {
//       existing.isActive    = true;
//       existing.reason      = reason;
//       existing.blockedBy   = adminId;
//       existing.user        = userId;
//       existing.unblockedAt = null;
//       await existing.save();
//     } else {
//       await BlockedIP.create({ ip, reason, user: userId, blockedBy: adminId });
//     }
 
//     // kick the user immediately
//     await User.findByIdAndUpdate(userId, {
//       activeSessionToken: null,
//       online: false,
//       status: "blocked",
//     });
 
//     return res.status(200).json({
//       status: "success",
//       message: `User blocked and IP ${ip} has been banned`,
//     });
 
//   } catch (error) {
//     return res.status(500).json({ status: "failed", message: error.message });
//   }
// },

blockUserByID: async (req, res) => {
  try {
    const { userId }    = req.params;
    const { reason, ip: manualIP } = req.body; // ✅ accept manual IP from frontend
    const adminId = req.user.userId;

    if (!reason) {
      return res.status(400).json({ status: "failed", message: "Reason is required" });
    }

    const User = require("../model/usermodel");
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }

    // ✅ try activeDevice first, fall back to manually provided IP
    let ip = manualIP || null;
    if (!ip && user.activeDevice) {
      const parts = user.activeDevice.split(" · ");
      ip = parts[1] || null;
    }

    if (!ip) {
      return res.status(400).json({
        status: "failed",
        message: "No IP found for this user. Ask them to log in first or enter IP manually.",
      });
    }

    const existing = await BlockedIP.findOne({ ip });
    if (existing && existing.isActive) {
      return res.status(400).json({
        status: "failed",
        message: `IP ${ip} is already blocked`,
      });
    }

    if (existing) {
      existing.isActive    = true;
      existing.reason      = reason;
      existing.blockedBy   = adminId;
      existing.user        = userId;   // ✅ always set user
      existing.unblockedAt = null;
      await existing.save();
    } else {
      await BlockedIP.create({
        ip,
        reason,
        user:      userId,    // ✅ always link the user
        blockedBy: adminId,
        isActive:  true,
      });
    }

    // kick the user out immediately
    await User.findByIdAndUpdate(userId, {
      activeSessionToken: null,
      online:             false,
      status:             "blocked",
    });

    return res.status(200).json({
      status: "success",
      message: `User blocked and IP ${ip} has been banned`,
    });

  } catch (error) {
    return res.status(500).json({ status: "failed", message: error.message });
  }
},
 

// ══════════════════════════════════════════════════════════════════════════════
//  KILL SWITCH MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
 

/**
 * GET /admin/kill-switch
 * List all kill-switch features and their current state.
 */
 getAllKillSwitches: async (req, res) => {
  try {
    const switches = await KillSwitch.find().sort({ feature: 1 });
    return res.status(200).json({ status: "success", data: switches });
  } catch (err) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
},


/**
 * POST /admin/kill-switch
 * Create or update a feature kill-switch.
 * Body: { feature, isActive, reason }
 *
 * feature examples:
 *   "global"       — kills the ENTIRE API
 *   "registration" — blocks new signups
 *   "login"        — blocks logins
 *   "vtu"          — blocks airtime/data/cable/electric
 *   "giftcard"     — blocks gift-card purchases
 *   "wallet"       — blocks wallet funding
 */


 setKillSwitch :async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { feature, isActive, reason } = req.body;
 
    if (!feature) {
      return res.status(400).json({ status: "failed", message: "feature is required" });
    }
 
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ status: "failed", message: "isActive must be true or false" });
    }
 
    const doc = await KillSwitch.findOneAndUpdate(
      { feature: feature.toLowerCase().trim() },
      {
        isActive,
        reason: reason || (isActive
          ? "Feature is active."
          : "This feature is temporarily unavailable. Please try again later."),
        updatedBy: adminId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
 
    // Bust in-memory cache so the change takes effect within seconds
    bustCache(feature.toLowerCase().trim());
 
    return res.status(200).json({
      status: "success",
      message: `Feature "${feature}" is now ${isActive ? "ENABLED" : "DISABLED"}`,
      data: doc,
    });
  } catch (err) {
    console.log("Error in setKillSwitch:", err);
    return res.status(500).json({ status: "failed", message: err.message });
  }
},

/**
 * DELETE /admin/kill-switch/:feature
 * Remove a feature from the kill-switch collection (it will default to ON).
 */
 deleteKillSwitch : async (req, res) => {
  try {
    const { feature } = req.params;
    await KillSwitch.findOneAndDelete({ feature: feature.toLowerCase() });
    bustCache(feature.toLowerCase());
    return res.status(200).json({ status: "success", message: `Kill switch for "${feature}" removed` });
  } catch (err) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
},

// ══════════════════════════════════════════════════════════════════════════════
//  EMAIL BLOCKER MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
 
/**
 * GET /admin/blocked-emails
 * List all blocked emails/domains.
 * Query: ?type=domain|email   ?active=true|false
 */
 getBlockedEmails : async (req, res) => {
  try {
    const filter = {};
    if (req.query.type)   filter.type     = req.query.type;
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === "true";
    }
 
    const list = await BlockedEmail.find(filter)
      .populate("blockedBy", "fullname email")
      .sort({ createdAt: -1 });
 
    return res.status(200).json({ status: "success", count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
},

/**
 * POST /admin/blocked-emails
 * Block an email address or domain.
 * Body: { value: "spam.com" | "badguy@gmail.com", type: "domain"|"email", reason }
 */
 blockEmail : async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { value, type, reason } = req.body;
 
    if (!value || !type) {
      return res.status(400).json({ status: "failed", message: "value and type are required" });
    }
 
    if (!["domain", "email"].includes(type)) {
      return res.status(400).json({ status: "failed", message: 'type must be "domain" or "email"' });
    }
 
    const normalized = value.trim().toLowerCase();
 
    // Basic format check
    if (type === "email" && !normalized.includes("@")) {
      return res.status(400).json({ status: "failed", message: "Invalid email format" });
    }
 
    if (type === "domain" && normalized.includes("@")) {
      return res.status(400).json({ status: "failed", message: "For domain blocking, provide only the domain (e.g. spam.com)" });
    }
 
    const doc = await BlockedEmail.findOneAndUpdate(
      { value: normalized },
      {
        value: normalized,
        type,
        reason: reason || "Blocked for security reasons",
        blockedBy: adminId,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
 
    return res.status(201).json({
      status: "success",
      message: `${type === "domain" ? "Domain" : "Email"} "${normalized}" has been blocked`,
      data: doc,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ status: "failed", message: "This email/domain is already blocked" });
    }
    return res.status(500).json({ status: "failed", message: err.message });
  }
},

/**
 * PATCH /admin/blocked-emails/unblock/:id
 * Re-activate (unblock) a previously blocked email/domain.
 */
 unblockEmail : async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await BlockedEmail.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
 
    if (!doc) {
      return res.status(404).json({ status: "failed", message: "Record not found" });
    }
 
    return res.status(200).json({
      status: "success",
      message: `"${doc.value}" has been unblocked`,
      data: doc,
    });
  } catch (err) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
},


/**
 * DELETE /admin/blocked-emails/:id
 * Permanently delete a blocked email/domain entry.
 */
 deleteBlockedEmail : async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await BlockedEmail.findByIdAndDelete(id);
 
    if (!doc) {
      return res.status(404).json({ status: "failed", message: "Record not found" });
    }
 
    return res.status(200).json({
      status: "success",
      message: `"${doc.value}" permanently removed from blocklist`,
    });
  } catch (err) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
},

/**
 * POST /admin/blocked-emails/bulk
 * Block multiple domains at once.
 * Body: { domains: ["spam.com", "fake.net"], reason }
 */
 bulkBlockDomains : async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { domains, reason } = req.body;
 
    if (!Array.isArray(domains) || !domains.length) {
      return res.status(400).json({ status: "failed", message: "domains must be a non-empty array" });
    }
 
    const ops = domains.map((d) => ({
      updateOne: {
        filter: { value: d.trim().toLowerCase() },
        update: {
          $set: {
            value: d.trim().toLowerCase(),
            type: "domain",
            reason: reason || "Bulk blocked for security reasons",
            blockedBy: adminId,
            isActive: true,
          },
        },
        upsert: true,
      },
    }));
 
    const result = await BlockedEmail.bulkWrite(ops);
 
    return res.status(200).json({
      status: "success",
      message: `${domains.length} domain(s) processed`,
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
    });
  } catch (err) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
}


}


module.exports = AdminController;