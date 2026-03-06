const express = require("express");
const authRouter = require("./authroutes")
const indexRouter = express.Router();
const walletRouter = require("./walletroutes");
const adminRouter = require("./adminroutes")
const chatRouter = require("./chatroutes");
const kycRouter = require("./kycroutes")

indexRouter.use('/wallet', walletRouter);
indexRouter.use('/auth', authRouter);
indexRouter.use('/admin', adminRouter);
indexRouter.use('/chat', chatRouter);
indexRouter.use('/kyc', kycRouter);

module.exports = indexRouter;