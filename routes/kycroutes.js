const express = require("express");
const kycController = require("../controller/kycController");
const kycRouter = express.Router();
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");
const uploadManager = require("../config/cloudinary");

const upload = uploadManager("KYC");

kycRouter.post('/create-kyc', authMiddleware, upload.fields([
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
   errorHandler(kycController.create));



module.exports = kycRouter;