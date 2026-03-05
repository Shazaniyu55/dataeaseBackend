const express = require("express");
const authRouter = require("./authroutes")
const indexRouter = express.Router();
const walletRouter = require("./walletroutes");
const adminRouter = require("./adminroutes")
const chatRouter = require("./chatroutes");

indexRouter.use('/wallet', walletRouter);
indexRouter.use('/auth', authRouter);
indexRouter.use('/admin', adminRouter);
indexRouter.use('/chat', chatRouter);

module.exports = indexRouter;