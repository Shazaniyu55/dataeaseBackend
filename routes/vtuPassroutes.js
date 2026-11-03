const express = require("express");
const vtuPassController = require("../controller/vtuPassController");
const vtuPassRouter = express.Router();
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");
const {killSwitchGuard} = require("../middlewares/killswitchmiddleware");
const rateLimit = require("express-rate-limit");

 const purchaseLimiter = rateLimit({
  windowMs: 10 * 1000,       // 10 seconds
  max: 2,                    // max 2 requests per user per 10s
  keyGenerator: (req) => req.user.userId,
  message: { status: "failed", message: "Too many requests, please slow down." }
});


vtuPassRouter.get('/check-balance',killSwitchGuard('vtu'), authMiddleware,purchaseLimiter, errorHandler(vtuPassController.checkBalance));
vtuPassRouter.get('/variations',killSwitchGuard('vtu'), authMiddleware, purchaseLimiter, errorHandler(vtuPassController.getVariations));

vtuPassRouter.post('/verify',killSwitchGuard('vtu'), authMiddleware, purchaseLimiter, errorHandler(vtuPassController.verifyMerchant));
vtuPassRouter.post('/buy-airtime',killSwitchGuard('vtu'), authMiddleware, purchaseLimiter, errorHandler(vtuPassController.buyAirtime));
vtuPassRouter.post('/buy-data',killSwitchGuard('vtu'), authMiddleware, purchaseLimiter, errorHandler(vtuPassController.buyData));
vtuPassRouter.post('/buy-cable',killSwitchGuard('vtu'), authMiddleware,purchaseLimiter, errorHandler(vtuPassController.buyCable));
vtuPassRouter.post('/buy-electricity',killSwitchGuard('vtu'), authMiddleware,purchaseLimiter, errorHandler(vtuPassController.buyElectricity));
vtuPassRouter.post('/requery', killSwitchGuard('vtu'),authMiddleware, purchaseLimiter, errorHandler(vtuPassController.requery));



module.exports = vtuPassRouter;

