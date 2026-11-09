const express= require("express");
const walletController = require("../controller/walletController");
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");
const walletRouter = express.Router();
const {killSwitchGuard} = require("../middlewares/killswitchmiddleware");
const { fundWalletLimiter, verifyPaymentLimiter } = require("../middlewares/walletRateLimit");

// Rate limiters come AFTER authMiddleware so they can key on req.user.userId
walletRouter.post('/fund-wallet',killSwitchGuard('wallet'), authMiddleware, fundWalletLimiter, errorHandler(walletController.fundWallet));
walletRouter.get('/verify-payment/:reference',killSwitchGuard('wallet'), authMiddleware, verifyPaymentLimiter, errorHandler(walletController.verifyPayment));
walletRouter.post('/transactions',killSwitchGuard('wallet'), authMiddleware, errorHandler(walletController.getTransactions));
walletRouter.get('/verify-affiliate-payment/:reference',killSwitchGuard('wallet'), authMiddleware, verifyPaymentLimiter, errorHandler(walletController.verifyAffiliatePayment));

module.exports = walletRouter;

// const express= require("express");
// const walletController = require("../controller/walletController");
// const {errorHandler} = require("../utils/errorHandle");
// const authMiddleware = require("../middlewares/authMiddleware");
// const walletRouter = express.Router();
// const {killSwitchGuard} = require("../middlewares/killswitchmiddleware");




// walletRouter.post('/fund-wallet',killSwitchGuard('wallet'), authMiddleware, errorHandler(walletController.fundWallet));
// walletRouter.get('/verify-payment/:reference',killSwitchGuard('wallet'), authMiddleware, errorHandler(walletController.verifyPayment));
// walletRouter.post('/transactions',killSwitchGuard('wallet'), authMiddleware, errorHandler(walletController.getTransactions));
// walletRouter.get('/verify-affiliate-payment/:reference',killSwitchGuard('wallet'), authMiddleware, errorHandler(walletController.verifyAffiliatePayment));

// module.exports = walletRouter;
