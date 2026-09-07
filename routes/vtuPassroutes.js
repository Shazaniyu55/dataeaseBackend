const express = require("express");
const vtuPassController = require("../controller/vtuPassController");
const vtuPassRouter = express.Router();
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");

vtuPassRouter.get('/check-balance', authMiddleware, errorHandler(vtuPassController.checkBalance));
vtuPassRouter.get('/variations', authMiddleware, errorHandler(vtuPassController.getVariations));

vtuPassRouter.post('/verify', authMiddleware, errorHandler(vtuPassController.verifyMerchant));
vtuPassRouter.post('/buy-airtime', authMiddleware, errorHandler(vtuPassController.buyAirtime));
vtuPassRouter.post('/buy-data', authMiddleware, errorHandler(vtuPassController.buyData));
vtuPassRouter.post('/buy-cable', authMiddleware, errorHandler(vtuPassController.buyCable));
vtuPassRouter.post('/buy-electricity', authMiddleware, errorHandler(vtuPassController.buyElectricity));
vtuPassRouter.post('/requery', authMiddleware, errorHandler(vtuPassController.requery));



module.exports = vtuPassRouter;

// const express = require("express");
// const vtuPassController = require("../controller/vtuPassController");
// const vtuPassRouter = express.Router();
// const {errorHandler} = require("../utils/errorHandle");
// const authMiddleware = require("../middlewares/authMiddleware");

// vtuPassRouter.get('/check-balance', errorHandler(vtuPassController.checkBalance));
// vtuPassRouter.post('/buy-airtime', errorHandler(vtuPassController.buyAirtime));



// module.exports = vtuPassRouter;