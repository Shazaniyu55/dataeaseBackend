const express = require("express");
const authRouter = require("./authroutes")
const indexRouter = express.Router();
const walletRouter = require("./walletroutes");

indexRouter.use('/wallet', walletRouter);
indexRouter.use('/auth', authRouter);

module.exports = indexRouter;