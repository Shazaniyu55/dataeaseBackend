const express= require("express");
const walletController = require("../controller/walletController");
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");
const walletRouter = express.Router();



walletRouter.post('/fund-wallet',authMiddleware, errorHandler(walletController.fundWallet));
walletRouter.get('/verify-payment/:reference', authMiddleware, errorHandler(walletController.verifyPayment));
module.exports = walletRouter;
