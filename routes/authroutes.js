const express= require("express");
const authController = require("../controller/usercontroller");
const {errorHandler} = require("../utils/errorHandle");
const uploadManager = require("../config/cloudinary");
const authMiddleware = require("../middlewares/authMiddleware");
const rateLimit = require("express-rate-limit");
const {killSwitchGuard} = require("../middlewares/killswitchmiddleware");
const authRouter = express.Router();

 const purchaseLimiter = rateLimit({
  windowMs: 10 * 1000,       // 10 seconds
  max: 2,                    // max 2 requests per user per 10s
  keyGenerator: (req) => req.user.userId,
  message: { status: "failed", message: "Too many requests, please slow down." }
});


authRouter.post('/register',killSwitchGuard('registration'),uploadManager("profilePic").single("profilePic"), errorHandler(authController.register));
authRouter.post('/verify-otp', authMiddleware, errorHandler(authController.verifyOtp));
authRouter.post('/login',  killSwitchGuard('login'), errorHandler(authController.login));
authRouter.post('/verify-login-otp', killSwitchGuard('login'), errorHandler(authController.verifyLoginOtp));
authRouter.post('/enable-mfa', authMiddleware, errorHandler(authController.enableMfa));
authRouter.post('/disable-mfa', authMiddleware, errorHandler(authController.disableMfa));
authRouter.get('/mfa-status', authMiddleware, errorHandler(authController.getMfaStatus));
authRouter.post('/fund-wallet',killSwitchGuard('wallet'), authMiddleware, errorHandler(authController.fundWalletManual));
authRouter.post('/request-password-reset', errorHandler(authController.requestPasswordReset));
authRouter.post('/reset-password', errorHandler(authController.resetPassword));
authRouter.post('/profile', authMiddleware, errorHandler(authController.getUser));
authRouter.post('/buy-airtime',killSwitchGuard('vtu'), authMiddleware, purchaseLimiter,  errorHandler(authController.buyAirtime));
authRouter.get('/data-variations',killSwitchGuard('vtu'), authMiddleware, errorHandler(authController.getDataVariations));
authRouter.get('/cable-variations',killSwitchGuard('vtu'), authMiddleware, errorHandler(authController.getCableVariations));
authRouter.post('/buy-cable', killSwitchGuard('vtu'), authMiddleware, purchaseLimiter, errorHandler(authController.buyCable));
authRouter.get('/balance',killSwitchGuard('wallet'), authMiddleware, errorHandler(authController.getUserWalletBalance));
authRouter.post('/buy-data', killSwitchGuard('vtu'), authMiddleware, purchaseLimiter,errorHandler(authController.buyData));
authRouter.post('/verify-electric',killSwitchGuard('vtu'), authMiddleware, errorHandler(authController.verifyelectricCustomer));
authRouter.post('/verify-betting',killSwitchGuard('vtu'), authMiddleware, errorHandler(authController.verifybettingCustomer));
authRouter.post('/verify-cable',killSwitchGuard('vtu'), authMiddleware, errorHandler(authController.verifycableCustomer));
authRouter.get('/get-transactions',killSwitchGuard('wallet'), authMiddleware, errorHandler(authController.getUserTransactions))
authRouter.post('/buy-electric', killSwitchGuard('vtu'), authMiddleware,purchaseLimiter, errorHandler(authController.buyElectricity));
authRouter.post('/verify-email', authMiddleware, errorHandler(authController.verifyEmailInapp));
authRouter.post('/update-password', authMiddleware, errorHandler(authController.updateUserPassword));
// Affiliate Routes
authRouter.post('/signup-affiliate', errorHandler(authController.signupAffiliates));
authRouter.post('/generate-token', errorHandler(authController.generateReferralIdToken));
authRouter.post('/register-vendor',uploadManager("vendors").fields([
    { name: "profilePic", maxCount: 1 },
    { name: "kyc[idImage]", maxCount: 1 },
    { name: "kyc[selfieWithId]", maxCount: 1 },
  ]), errorHandler(authController.registerVendor));

authRouter.get('/get-vendors',killSwitchGuard('vtu'), authMiddleware, errorHandler(authController.getVendors))
authRouter.get("/:userId/referrals", authController.getReferredUsers);
authRouter.delete("/delete-notify/:notificationId",authMiddleware, errorHandler(authController.deleteNotification));
authRouter.put(
  "/profile-picture",
  authMiddleware,
  uploadManager("profilePic").single("profilePic"),
  errorHandler(authController.updateProfilePicture)

);

authRouter.post('/buy-epins', killSwitchGuard('vtu'), authMiddleware, purchaseLimiter, errorHandler(authController.buyEpins));
authRouter.post('/requery-order', killSwitchGuard('vtu'), authMiddleware, purchaseLimiter, errorHandler(authController.requeryOrder));
authRouter.post('/fund-betting-account', killSwitchGuard('vtu'), authMiddleware, purchaseLimiter, errorHandler(authController.fundBettingAccount));


module.exports = authRouter;