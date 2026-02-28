const express= require("express");
const authController = require("../controller/usercontroller");
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");
const uploadManager = require("../config/cloudinary")
const authRouter = express.Router();



authRouter.post('/register',uploadManager("profilePic").single("profilePic"), errorHandler(authController.register));
authRouter.post('/verify-otp',authMiddleware, errorHandler(authController.verifyOtp));
authRouter.post('/login', errorHandler(authController.login));
authRouter.post('/fund-wallet',authMiddleware, errorHandler(authController.fundWalletManual));
authRouter.post('/generate-token',authMiddleware, errorHandler(authController.generateReferralIdToken));
authRouter.post('/request-password-reset', errorHandler(authController.requestPasswordReset));
authRouter.post('/reset-password', errorHandler(authController.resetPassword));
authRouter.post('/profile', authMiddleware, errorHandler(authController.getUser));


module.exports = authRouter;