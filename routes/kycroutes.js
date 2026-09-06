const express = require("express");
const kycController = require("../controller/kycController");
const kycRouter = express.Router();
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");
const uploadManager = require("../config/cloudinary");

const upload = uploadManager("KYC");

kycRouter.post('/upload-kyc', authMiddleware, upload.fields([
    { name: "selfie", maxCount: 1 },
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
  ]),
   errorHandler(kycController.uploadUserKyc));


kycRouter.get('/get-kyc', authMiddleware, errorHandler(kycController.getUserKyc))

module.exports = kycRouter;