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

module.exports = authRouter;