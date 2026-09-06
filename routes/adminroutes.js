const express= require("express");
const AdminController = require("../controller/admincontroller");
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");
const adminRouter = express.Router();



adminRouter.post('/login', errorHandler(AdminController.loginAdmin));
adminRouter.get('/users',authMiddleware, errorHandler(AdminController.getAllUsers));
adminRouter.delete('/delete/users/:userId',authMiddleware, errorHandler(AdminController.deleteUsers));
adminRouter.get('/dashboard-stats',authMiddleware, errorHandler(AdminController.getDashboard));
adminRouter.get('/revenue-stats',authMiddleware, errorHandler(AdminController.getRevenue));
adminRouter.post('/wallet/credit/:id',authMiddleware, errorHandler(AdminController.creditedUserWallet));
adminRouter.get('/users/:id',authMiddleware, errorHandler(AdminController.getUsersById));
adminRouter.post('/sendEmail/:userId',authMiddleware, errorHandler(AdminController.sendPromotionalEmail));


adminRouter.get('/conversation/:userId',authMiddleware, errorHandler(AdminController.getuserConversation));
adminRouter.get('/funding-request',authMiddleware, errorHandler(AdminController.getUserFundingRequestsAll));
adminRouter.get('/funding-request/:userId',authMiddleware, errorHandler(AdminController.getUserFundingRequests));
adminRouter.patch('/funding-request/approve/:id',authMiddleware, errorHandler(AdminController.updatefundingrequest));

adminRouter.post('/approve-kyc/:id', authMiddleware, errorHandler(AdminController.approveKyc));
adminRouter.get('/get-all-kyc', authMiddleware, errorHandler(AdminController.getAllKyc));
adminRouter.post('/register-subadmin', errorHandler(AdminController.createSubAdmin));
adminRouter.delete('/decline-kyc/:id', authMiddleware, errorHandler(AdminController.declineKyc));
adminRouter.get('/get-resell-kyc', authMiddleware, errorHandler(AdminController.getAllResellerKyc));
adminRouter.post('/send-push-user/:userId', authMiddleware, errorHandler(AdminController.sendPushNotificationToUser));
adminRouter.get("/search-users", authMiddleware, errorHandler(AdminController.searchUsers));
adminRouter.get("/get-login-users", authMiddleware, errorHandler(AdminController.getAllUserloginActivity));
adminRouter.get("/get-reward-users", authMiddleware, errorHandler(AdminController.getAllUserRewardActivity));
adminRouter.post('/commission/credit/:id',authMiddleware, errorHandler(AdminController.creditedAffiliatecommission));
adminRouter.get("/transactions/search", authMiddleware, errorHandler(AdminController.searchUsersTransaction));

adminRouter.post('/send-direct-sms', authMiddleware, errorHandler(AdminController.sendDirectSms));

// ─── IP BLOCKING ──────────────────────────────────────────────────────────────
adminRouter.get   ("/blocked-ips",               authMiddleware, errorHandler(AdminController.getBlockedIPs));
adminRouter.post  ("/blocked-ips/block",         authMiddleware, errorHandler(AdminController.blockIP));
adminRouter.patch ("/blocked-ips/unblock/:id",   authMiddleware, errorHandler(AdminController.unblockIP));
adminRouter.post  ("/blocked-ips/block-user/:userId", authMiddleware, errorHandler(AdminController.blockUserByID));
// ── Kill Switch ───────────────────────────────────────────────────────────────
adminRouter.get   ("/get-kill-switch",  authMiddleware, errorHandler(AdminController.getAllKillSwitches));
adminRouter.post  ("/kill-switch",             authMiddleware, errorHandler(AdminController.setKillSwitch));
adminRouter.delete("/kill-switch/:feature",    authMiddleware, errorHandler(AdminController.deleteKillSwitch));

// ── Email Blocker ─────────────────────────────────────────────────────────────
adminRouter.get   ("/get-blocked-emails",               authMiddleware, errorHandler(AdminController.getBlockedEmails));
adminRouter.post  ("/blocked-emails",               authMiddleware, errorHandler(AdminController.blockEmail));
adminRouter.patch ("/blocked-emails/unblock/:id",   authMiddleware, errorHandler(AdminController.unblockEmail));
adminRouter.delete("/blocked-emails/:id",           authMiddleware, errorHandler(AdminController.deleteBlockedEmail));
adminRouter.post  ("/blocked-emails/bulk",          authMiddleware, errorHandler(AdminController.bulkBlockDomains));

module.exports = adminRouter;
