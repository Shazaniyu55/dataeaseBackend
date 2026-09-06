const express = require("express");
const vtuPassController = require("../controller/vtuPassController");
const vtuPassRouter = express.Router();
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");

vtuPassRouter.get('/check-balance', errorHandler(vtuPassController.checkBalance));
vtuPassRouter.post('/buy-airtime', errorHandler(vtuPassController.buyAirtime));



module.exports = vtuPassRouter;