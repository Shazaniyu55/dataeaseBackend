const express = require("express");
const authRouter = require("./authroutes")
const indexRouter = express.Router();
const walletRouter = require("./walletroutes");
const adminRouter = require("./adminroutes")
const chatRouter = require("./chatroutes");
const kycRouter = require("./kycroutes");
const notifyRouter = require("./notifyroutes");
const flightRouter = require("./flightroutes")
const vtuPassRouter = require("./vtuPassroutes");

indexRouter.use('/wallet', walletRouter);
indexRouter.use('/auth', authRouter);
indexRouter.use('/admin', adminRouter);
indexRouter.use('/chat', chatRouter);
indexRouter.use('/vtu-pass', vtuPassRouter);
indexRouter.use('/kyc', kycRouter);
indexRouter.use('/notify', notifyRouter);
indexRouter.use('/flight', flightRouter);

module.exports = indexRouter;