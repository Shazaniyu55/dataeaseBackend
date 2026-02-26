const express = require("express");
const authRouter = require("./authroutes")
const indexRouter = express.Router();

indexRouter.use('/auth', authRouter);

module.exports = indexRouter;