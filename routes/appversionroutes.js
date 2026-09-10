const express = require("express");
const AppVersionController = require("../controller/appversioncontroller");
const { errorHandler } = require("../utils/errorHandle");

const appVersionRouter = express.Router();

// PUBLIC — the mobile app calls this on launch (no auth required).
appVersionRouter.get("/check", errorHandler(AppVersionController.checkVersion));

module.exports = appVersionRouter;