const STATUSCODES = require('../constant/statuscode');
const successResponse = require("../utils/successresponse");
const User = require("../model/usermodel");
const Wallet = require("../model/walletmodel");
const dotenv = require("dotenv");
const vtuPassService = require("../services/vtupassService");
const HttpException = require('../utils/httpException');
const { generateRequestId } = require("../utils/helper");
const {
  calculateAirtimePricing,
  calculateDataPricing,
  calculateCablePricing,
  calculateElectricPricing,
} = require("../utils/calculateProfit");

dotenv.config();

// VTpass network serviceIDs don't always match the keys in config/price.config.js
// (e.g. VTpass uses "mtn-data" for data and "etisalat" instead of "9mobile").
// Normalize before looking up pricing.
const toPricingKey = (serviceID) => {
  const s = String(serviceID).toLowerCase().replace(/-data$/, "");
  return s === "etisalat" ? "9mobile" : s;
};

const failResponse = (res, status, message, data = null) =>
  res.status(status).json({ success: false, status, message, data });

const vtuPassController = {

  checkBalance: async (req, res) => {
    try {
      const response = await vtuPassService.checkBalance();
      if (response && response.data) {
        return successResponse(res, response.data, "Balance retrieved successfully", STATUSCODES.SUCCESS);
      } else {
        throw new HttpException(STATUSCODES.INTERNAL_SERVER_ERROR, "Failed to retrieve balance");
      }
    } catch (error) {
      console.error("checkBalance error:", error.message);
      return failResponse(res, STATUSCODES.INTERNAL_SERVER_ERROR, "Failed to retrieve balance");
    }
  },

  // GET /vtu-pass/variations?serviceID=mtn-data  (data plans / cable bouquets)
  getVariations: async (req, res) => {
    try {
      const { serviceID } = req.query;

      if (!serviceID) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "serviceID is required");
      }

      const response = await vtuPassService.getVariations(serviceID);
      const result = response.data;

      if (result && result.response_description === "000") {
        return successResponse(res, result.content, "Variations retrieved successfully", STATUSCODES.SUCCESS);
      }

      return failResponse(res, STATUSCODES.BAD_REQUEST, "Failed to retrieve variations", result);
    } catch (error) {
      console.error("getVariations error:", error.response ? error.response.data : error.message);
      return failResponse(res, STATUSCODES.INTERNAL_SERVER_ERROR, "Failed to retrieve variations");
    }
  },

  // POST /vtu-pass/verify  { serviceID, billersCode, type? }
  // Verify a meter number (electricity) or smartcard/IUC (cable) before charging.
  verifyMerchant: async (req, res) => {
    try {
      const { serviceID, billersCode, type } = req.body;

      if (!serviceID || !billersCode) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "serviceID and billersCode are required");
      }

      const payload = { serviceID, billersCode };
      if (type) payload.type = type; // prepaid | postpaid (electricity only)

      const response = await vtuPassService.verifyMerchant(payload);
      const result = response.data;

      if (result.code === "000" && !result?.content?.WrongBillersCode && !result?.content?.error) {
        return successResponse(res, result.content, "Customer verified successfully", STATUSCODES.SUCCESS);
      }

      return failResponse(res, STATUSCODES.BAD_REQUEST, result?.content?.error || "Invalid meter number / smartcard", result);
    } catch (error) {
      console.error("verifyMerchant error:", error.response ? error.response.data : error.message);
      return failResponse(res, STATUSCODES.INTERNAL_SERVER_ERROR, "Verification failed");
    }
  },

  // POST /vtu-pass/buy-airtime  { serviceID, amount, phone }
  buyAirtime: async (req, res) => {
    try {
      const { serviceID, amount, phone } = req.body;
      const userId = req.user.userId;

      if (!serviceID || !amount || !phone) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "serviceID, amount, and phone are required");
      }

      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "Amount must be a positive number");
      }
      if (numericAmount < 50) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "Minimum amount is ₦50");
      }

      let pricing;
      try {
        pricing = calculateAirtimePricing(toPricingKey(serviceID), numericAmount);
      } catch (err) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, err.message);
      }

      const request_id = generateRequestId();

      // Atomic balance check + deduction — no purchase call happens unless this succeeds
      const wallet = await Wallet.atomicDebit(userId, pricing.sellingPrice, {
        reference: request_id,
        type: "airtime",
        network: serviceID.toLowerCase(),
        phoneOrAccount: phone,
        costPrice: pricing.costPrice,
        sellingPrice: pricing.sellingPrice,
        profit: pricing.profit,
        status: "pending",
      });

      if (!wallet) {
        const walletExists = await Wallet.findOne({ userId });
        if (!walletExists) return failResponse(res, STATUSCODES.NOT_FOUND, "Wallet not found");
        return failResponse(res, STATUSCODES.BAD_REQUEST, "Insufficient balance");
      }

      const payload = { request_id, serviceID, amount: numericAmount, phone };

      let response;
      try {
        response = await vtuPassService.buyAirtime(payload);
      } catch (vtuError) {
        await Wallet.atomicCredit(userId, pricing.sellingPrice, { reference: `refund-${request_id}` });
        await Wallet.updateOne(
          { userId, "transactions.reference": request_id },
          { $set: { "transactions.$.status": "failed", "transactions.$.reason": "VTpass service error" } }
        );
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
          success: false,
          status: STATUSCODES.INTERNAL_SERVER_ERROR,
          message: "VTpass service error, balance refunded",
          data: null,
        });
      }

      const result = response.data;
      const txStatus = result?.content?.transactions?.status;

      if (result.code === "000" && txStatus === "delivered") {
        await Wallet.updateOne(
          { userId, "transactions.reference": request_id },
          { $set: { "transactions.$.status": "success" } }
        );
        return successResponse(res, result, "Airtime purchase successful", STATUSCODES.SUCCESS);
      }

      if (txStatus === "pending") {
        // Don't refund yet — VTpass recommends requerying with request_id later.
        // The /requery endpoint reconciles this transaction once VTpass confirms.
        return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
      }

      // code !== "000", or status is "failed"/"reversed" — refund
      await Wallet.atomicCredit(userId, pricing.sellingPrice, { reference: `refund-${request_id}` });
      await Wallet.updateOne(
        { userId, "transactions.reference": request_id },
        { $set: { "transactions.$.status": "failed", "transactions.$.reason": result.response_description || "Transaction failed" } }
      );

      return failResponse(res, STATUSCODES.BAD_REQUEST, result.response_description || "Transaction failed", result);

    } catch (error) {
      console.error("buyAirtime error:", error.response ? error.response.data : error.message);
      return failResponse(res, STATUSCODES.INTERNAL_SERVER_ERROR, "Purchase failed");
    }
  },

  // POST /vtu-pass/buy-data  { serviceID, phone, variation_code, amount }
  // "amount" = the plan's price, as returned for that variation_code by GET /variations
  buyData: async (req, res) => {
    try {
      const { serviceID, phone, variation_code, amount } = req.body;
      const userId = req.user.userId;

      if (!serviceID || !phone || !variation_code || !amount) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "serviceID, phone, variation_code, and amount are required");
      }

      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "Amount must be a positive number");
      }

      let pricing;
      try {
        pricing = calculateDataPricing(toPricingKey(serviceID), numericAmount);
      } catch (err) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, err.message);
      }

      const request_id = generateRequestId();

      const wallet = await Wallet.atomicDebit(userId, pricing.sellingPrice, {
        reference: request_id,
        type: "data",
        network: serviceID.toLowerCase(),
        phoneOrAccount: phone,
        costPrice: pricing.costPrice,
        sellingPrice: pricing.sellingPrice,
        profit: pricing.profit,
        status: "pending",
      });

      if (!wallet) {
        const walletExists = await Wallet.findOne({ userId });
        if (!walletExists) return failResponse(res, STATUSCODES.NOT_FOUND, "Wallet not found");
        return failResponse(res, STATUSCODES.BAD_REQUEST, "Insufficient balance");
      }

      const payload = { request_id, serviceID, billersCode: phone, variation_code, phone };

      let response;
      try {
        response = await vtuPassService.buyData(payload);
      } catch (vtuError) {
        await Wallet.atomicCredit(userId, pricing.sellingPrice, { reference: `refund-${request_id}` });
        await Wallet.updateOne(
          { userId, "transactions.reference": request_id },
          { $set: { "transactions.$.status": "failed", "transactions.$.reason": "VTpass service error" } }
        );
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
          success: false,
          status: STATUSCODES.INTERNAL_SERVER_ERROR,
          message: "VTpass service error, balance refunded",
          data: null,
        });
      }

      const result = response.data;
      const txStatus = result?.content?.transactions?.status;

      if (result.code === "000" && txStatus === "delivered") {
        await Wallet.updateOne(
          { userId, "transactions.reference": request_id },
          { $set: { "transactions.$.status": "success" } }
        );
        return successResponse(res, result, "Data purchase successful", STATUSCODES.SUCCESS);
      }

      if (txStatus === "pending") {
        return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
      }

      await Wallet.atomicCredit(userId, pricing.sellingPrice, { reference: `refund-${request_id}` });
      await Wallet.updateOne(
        { userId, "transactions.reference": request_id },
        { $set: { "transactions.$.status": "failed", "transactions.$.reason": result.response_description || "Transaction failed" } }
      );

      return failResponse(res, STATUSCODES.BAD_REQUEST, result.response_description || "Transaction failed", result);

    } catch (error) {
      console.error("buyData error:", error.response ? error.response.data : error.message);
      return failResponse(res, STATUSCODES.INTERNAL_SERVER_ERROR, "Purchase failed");
    }
  },

  // POST /vtu-pass/buy-cable
  // { serviceID, smartcardNumber, variation_code, amount, phone, subscription_type? }
  buyCable: async (req, res) => {
    try {
      const { serviceID, smartcardNumber, variation_code, amount, phone, subscription_type } = req.body;
      const userId = req.user.userId;

      if (!serviceID || !smartcardNumber || !variation_code || !amount || !phone) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "serviceID, smartcardNumber, variation_code, amount, and phone are required");
      }

      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "Amount must be a positive number");
      }

      let pricing;
      try {
        pricing = calculateCablePricing(toPricingKey(serviceID), numericAmount);
      } catch (err) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, err.message);
      }

      const request_id = generateRequestId();

      const wallet = await Wallet.atomicDebit(userId, pricing.sellingPrice, {
        reference: request_id,
        type: "cable",
        network: serviceID.toLowerCase(),
        phoneOrAccount: smartcardNumber,
        costPrice: pricing.costPrice,
        sellingPrice: pricing.sellingPrice,
        profit: pricing.profit,
        status: "pending",
      });

      if (!wallet) {
        const walletExists = await Wallet.findOne({ userId });
        if (!walletExists) return failResponse(res, STATUSCODES.NOT_FOUND, "Wallet not found");
        return failResponse(res, STATUSCODES.BAD_REQUEST, "Insufficient balance");
      }

      const payload = {
        request_id,
        serviceID,
        billersCode: smartcardNumber,
        variation_code,
        amount: numericAmount,
        phone,
        subscription_type: subscription_type || "change", // "change" | "renew"
      };

      let response;
      try {
        response = await vtuPassService.buyCable(payload);
      } catch (vtuError) {
        await Wallet.atomicCredit(userId, pricing.sellingPrice, { reference: `refund-${request_id}` });
        await Wallet.updateOne(
          { userId, "transactions.reference": request_id },
          { $set: { "transactions.$.status": "failed", "transactions.$.reason": "VTpass service error" } }
        );
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
          success: false,
          status: STATUSCODES.INTERNAL_SERVER_ERROR,
          message: "VTpass service error, balance refunded",
          data: null,
        });
      }

      const result = response.data;
      const txStatus = result?.content?.transactions?.status;

      if (result.code === "000" && txStatus === "delivered") {
        await Wallet.updateOne(
          { userId, "transactions.reference": request_id },
          { $set: { "transactions.$.status": "success" } }
        );
        return successResponse(res, result, "Cable subscription successful", STATUSCODES.SUCCESS);
      }

      if (txStatus === "pending") {
        return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
      }

      await Wallet.atomicCredit(userId, pricing.sellingPrice, { reference: `refund-${request_id}` });
      await Wallet.updateOne(
        { userId, "transactions.reference": request_id },
        { $set: { "transactions.$.status": "failed", "transactions.$.reason": result.response_description || "Transaction failed" } }
      );

      return failResponse(res, STATUSCODES.BAD_REQUEST, result.response_description || "Transaction failed", result);

    } catch (error) {
      console.error("buyCable error:", error.response ? error.response.data : error.message);
      return failResponse(res, STATUSCODES.INTERNAL_SERVER_ERROR, "Purchase failed");
    }
  },

  // POST /vtu-pass/buy-electricity
  // { serviceID, meterNumber, meterType, amount, phone }  (meterType: prepaid | postpaid)
  buyElectricity: async (req, res) => {
    try {
      const { serviceID, meterNumber, meterType, amount, phone } = req.body;
      const userId = req.user.userId;

      if (!serviceID || !meterNumber || !meterType || !amount || !phone) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "serviceID, meterNumber, meterType, amount, and phone are required");
      }

      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "Amount must be a positive number");
      }
      if (numericAmount < 1000) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "Minimum amount is ₦1000");
      }

      let pricing;
      try {
        pricing = calculateElectricPricing(serviceID, numericAmount);
      } catch (err) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, err.message);
      }

      const request_id = generateRequestId();

      const wallet = await Wallet.atomicDebit(userId, pricing.sellingPrice, {
        reference: request_id,
        type: "electricity",
        network: serviceID.toLowerCase(),
        phoneOrAccount: meterNumber,
        costPrice: pricing.costPrice,
        sellingPrice: pricing.sellingPrice,
        profit: pricing.profit,
        status: "pending",
      });

      if (!wallet) {
        const walletExists = await Wallet.findOne({ userId });
        if (!walletExists) return failResponse(res, STATUSCODES.NOT_FOUND, "Wallet not found");
        return failResponse(res, STATUSCODES.BAD_REQUEST, "Insufficient balance");
      }

      const payload = {
        request_id,
        serviceID,
        billersCode: meterNumber,
        variation_code: meterType, // "prepaid" | "postpaid"
        amount: numericAmount,
        phone,
      };

      let response;
      try {
        response = await vtuPassService.buyElectricity(payload);
      } catch (vtuError) {
        await Wallet.atomicCredit(userId, pricing.sellingPrice, { reference: `refund-${request_id}` });
        await Wallet.updateOne(
          { userId, "transactions.reference": request_id },
          { $set: { "transactions.$.status": "failed", "transactions.$.reason": "VTpass service error" } }
        );
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
          success: false,
          status: STATUSCODES.INTERNAL_SERVER_ERROR,
          message: "VTpass service error, balance refunded",
          data: null,
        });
      }

      const result = response.data;
      const txStatus = result?.content?.transactions?.status;
      // For prepaid, the token is usually in result.content.token / purchased_code
      const token = result?.content?.token || result?.content?.purchased_code || null;
      const units = result?.content?.Units || result?.content?.units || null;

      if (result.code === "000" && txStatus === "delivered") {
        await Wallet.updateOne(
          { userId, "transactions.reference": request_id },
          {
            $set: {
              "transactions.$.status": "success",
              "transactions.$.token": token,
              "transactions.$.units": units ? String(units) : undefined,
            },
          }
        );
        return successResponse(
          res,
          { ...result, token, units, request_id },
          "Electricity purchase successful",
          STATUSCODES.SUCCESS
        );
      }

      if (txStatus === "pending") {
        return successResponse(
          res,
          { ...result, token, units, request_id },
          "Transaction pending, please requery status",
          STATUSCODES.SUCCESS
        );
      }

      await Wallet.atomicCredit(userId, pricing.sellingPrice, { reference: `refund-${request_id}` });
      await Wallet.updateOne(
        { userId, "transactions.reference": request_id },
        { $set: { "transactions.$.status": "failed", "transactions.$.reason": result.response_description || "Transaction failed" } }
      );

      return failResponse(res, STATUSCODES.BAD_REQUEST, result.response_description || "Transaction failed", { ...result, request_id });

    } catch (error) {
      console.error("buyElectricity error:", error.response ? error.response.data : error.message);
      return failResponse(res, STATUSCODES.INTERNAL_SERVER_ERROR, "Purchase failed");
    }
  },

  // POST /vtu-pass/requery  { request_id }
  // Also reconciles the wallet transaction if it was left "pending" by a buy-* call above.
  requery: async (req, res) => {
    try {
      const { request_id } = req.body;
      const userId = req.user.userId;

      if (!request_id) {
        return failResponse(res, STATUSCODES.BAD_REQUEST, "request_id is required");
      }

      const response = await vtuPassService.requery({ request_id });
      const result = response.data;
      const txStatus = result?.content?.transactions?.status;

      const wallet = await Wallet.findOne({ userId, "transactions.reference": request_id });
      const transaction = wallet?.transactions.find(t => t.reference === request_id);

      if (transaction && transaction.status === "pending") {
        if (result.code === "000" && txStatus === "delivered") {
          await Wallet.updateOne(
            { userId, "transactions.reference": request_id },
            { $set: { "transactions.$.status": "success" } }
          );
        } else if (txStatus === "failed" || txStatus === "reversed") {
          await Wallet.atomicCredit(userId, transaction.sellingPrice, { reference: `refund-${request_id}` });
          await Wallet.updateOne(
            { userId, "transactions.reference": request_id },
            { $set: { "transactions.$.status": "failed", "transactions.$.reason": result.response_description || "Transaction failed" } }
          );
        }
        // still "pending" on VTpass's side — leave as-is, client can requery again later
      }

      return successResponse(res, result, "Transaction status retrieved", STATUSCODES.SUCCESS);
    } catch (error) {
      console.error("requery error:", error.response ? error.response.data : error.message);
      return failResponse(res, STATUSCODES.INTERNAL_SERVER_ERROR, "Requery failed");
    }
  },

};

module.exports = vtuPassController;


// const STATUSCODES = require('../constant/statuscode');
// const successResponse = require("../utils/successresponse");
// const User= require("../model/usermodel");
// const crypto = require("crypto");
// const dotenv = require("dotenv");
// const vtuPassService = require("../services/vtupassService");
// const HttpException = require('../utils/httpException');
// const {generateRequestId} = require("../utils/helper")

// dotenv.config();


// const vtuPassController = {

// checkBalance: async (req, res) => {
//     try {
//         const response = await vtuPassService.checkBalance();
//         if (response && response.data) {
//             return successResponse(res, response.data, "Balance retrieved successfully", STATUSCODES.SUCCESS);
//         } else {
//             throw new HttpException(STATUSCODES.INTERNAL_SERVER_ERROR, "Failed to retrieve balance");
//         }
//     } catch (error) {
//         console.error("checkBalance error:", error.message);
//         return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
//             success: false,
//             status: STATUSCODES.INTERNAL_SERVER_ERROR,
//             message: "Failed to retrieve balance",
//             data: null,
//         });
//     }
// },


// // GET /vtu-pass/variations?serviceID=mtn-data  (data plans / cable bouquets)
// getVariations: async (req, res) => {
//     try {
//         const { serviceID } = req.query;

//         if (!serviceID) {
//             return res.status(STATUSCODES.BAD_REQUEST).json({
//                 success: false,
//                 status: STATUSCODES.BAD_REQUEST,
//                 message: "serviceID is required",
//                 data: null,
//             });
//         }

//         const response = await vtuPassService.getVariations(serviceID);
//         const result = response.data;

//         // The variations endpoint returns response_description "000" on success
//         if (result && result.response_description === "000") {
//             return successResponse(res, result.content, "Variations retrieved successfully", STATUSCODES.SUCCESS);
//         }

//         return res.status(STATUSCODES.BAD_REQUEST).json({
//             success: false,
//             status: STATUSCODES.BAD_REQUEST,
//             message: "Failed to retrieve variations",
//             data: result,
//         });
//     } catch (error) {
//         console.error("getVariations error:", error.response ? error.response.data : error.message);
//         return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
//             success: false,
//             status: STATUSCODES.INTERNAL_SERVER_ERROR,
//             message: "Failed to retrieve variations",
//             data: null,
//         });
//     }
// },


// // POST /vtu-pass/verify  { serviceID, billersCode, type? }
// // Verify a meter number (electricity) or smartcard/IUC (cable) before charging.
// verifyMerchant: async (req, res) => {
//     try {
//         const { serviceID, billersCode, type } = req.body;

//         if (!serviceID || !billersCode) {
//             return res.status(STATUSCODES.BAD_REQUEST).json({
//                 success: false,
//                 status: STATUSCODES.BAD_REQUEST,
//                 message: "serviceID and billersCode are required",
//                 data: null,
//             });
//         }

//         const payload = { serviceID, billersCode };
//         if (type) payload.type = type; // prepaid | postpaid (electricity only)

//         const response = await vtuPassService.verifyMerchant(payload);
//         const result = response.data;

//         if (result.code === "000" && !result?.content?.WrongBillersCode && !result?.content?.error) {
//             return successResponse(res, result.content, "Customer verified successfully", STATUSCODES.SUCCESS);
//         }

//         return res.status(STATUSCODES.BAD_REQUEST).json({
//             success: false,
//             status: STATUSCODES.BAD_REQUEST,
//             message: result?.content?.error || "Invalid meter number / smartcard",
//             data: result,
//         });
//     } catch (error) {
//         console.error("verifyMerchant error:", error.response ? error.response.data : error.message);
//         return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
//             success: false,
//             status: STATUSCODES.INTERNAL_SERVER_ERROR,
//             message: "Verification failed",
//             data: null,
//         });
//     }
// },


// buyAirtime: async (req, res) => {
//     try {
//         const { serviceID, amount, phone } = req.body;

//         if (!serviceID || !amount || !phone) {
//             return res.status(STATUSCODES.BAD_REQUEST).json({
//                 success: false,
//                 status: STATUSCODES.BAD_REQUEST,
//                 message: "serviceID, amount, and phone are required",
//                 data: null,
//             });
//         }

//         const payload = {
//             request_id: generateRequestId(),
//             serviceID,
//             amount,
//             phone,
//         };

//         const response = await vtuPassService.buyAirtime(payload);
//         const result = response.data;
//         const txStatus = result?.content?.transactions?.status;

//         if (result.code === "000" && txStatus === "delivered") {
//             return successResponse(res, result, "Airtime purchase successful", STATUSCODES.SUCCESS);
//         }

//         if (txStatus === "pending") {
//             // Don't treat as failure — VTpass recommends requerying with requestId later
//             return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
//         }

//         // code !== "000", or status is "failed"/"reversed"
//         return res.status(STATUSCODES.BAD_REQUEST).json({
//             success: false,
//             status: STATUSCODES.BAD_REQUEST,
//             message: result.response_description || "Transaction failed",
//             data: result,
//         });

//     } catch (error) {
//         console.error("buyAirtime error:", error.response ? error.response.data : error.message);
//         return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
//             success: false,
//             status: STATUSCODES.INTERNAL_SERVER_ERROR,
//             message: "Purchase failed",
//             data: null,
//         });
//     }
// },


// // POST /vtu-pass/buy-data  { serviceID, phone, variation_code }
// buyData: async (req, res) => {
//     try {
//         const { serviceID, phone, variation_code } = req.body;

//         if (!serviceID || !phone || !variation_code) {
//             return res.status(STATUSCODES.BAD_REQUEST).json({
//                 success: false,
//                 status: STATUSCODES.BAD_REQUEST,
//                 message: "serviceID, phone, and variation_code are required",
//                 data: null,
//             });
//         }

//         const payload = {
//             request_id: generateRequestId(),
//             serviceID,
//             billersCode: phone, // for data, the recipient phone is the billersCode
//             variation_code,
//             phone,
//         };

//         const response = await vtuPassService.buyData(payload);
//         const result = response.data;
//         const txStatus = result?.content?.transactions?.status;

//         if (result.code === "000" && txStatus === "delivered") {
//             return successResponse(res, result, "Data purchase successful", STATUSCODES.SUCCESS);
//         }

//         if (txStatus === "pending") {
//             return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
//         }

//         return res.status(STATUSCODES.BAD_REQUEST).json({
//             success: false,
//             status: STATUSCODES.BAD_REQUEST,
//             message: result.response_description || "Transaction failed",
//             data: result,
//         });

//     } catch (error) {
//         console.error("buyData error:", error.response ? error.response.data : error.message);
//         return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
//             success: false,
//             status: STATUSCODES.INTERNAL_SERVER_ERROR,
//             message: "Purchase failed",
//             data: null,
//         });
//     }
// },


// // POST /vtu-pass/buy-cable
// // { serviceID, smartcardNumber, variation_code, amount, phone, subscription_type? }
// buyCable: async (req, res) => {
//     try {
//         const { serviceID, smartcardNumber, variation_code, amount, phone, subscription_type } = req.body;

//         if (!serviceID || !smartcardNumber || !variation_code || !amount || !phone) {
//             return res.status(STATUSCODES.BAD_REQUEST).json({
//                 success: false,
//                 status: STATUSCODES.BAD_REQUEST,
//                 message: "serviceID, smartcardNumber, variation_code, amount, and phone are required",
//                 data: null,
//             });
//         }

//         const payload = {
//             request_id: generateRequestId(),
//             serviceID,
//             billersCode: smartcardNumber,
//             variation_code,
//             amount,
//             phone,
//             subscription_type: subscription_type || "change", // "change" | "renew"
//         };

//         const response = await vtuPassService.buyCable(payload);
//         const result = response.data;
//         const txStatus = result?.content?.transactions?.status;

//         if (result.code === "000" && txStatus === "delivered") {
//             return successResponse(res, result, "Cable subscription successful", STATUSCODES.SUCCESS);
//         }

//         if (txStatus === "pending") {
//             return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
//         }

//         return res.status(STATUSCODES.BAD_REQUEST).json({
//             success: false,
//             status: STATUSCODES.BAD_REQUEST,
//             message: result.response_description || "Transaction failed",
//             data: result,
//         });

//     } catch (error) {
//         console.error("buyCable error:", error.response ? error.response.data : error.message);
//         return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
//             success: false,
//             status: STATUSCODES.INTERNAL_SERVER_ERROR,
//             message: "Purchase failed",
//             data: null,
//         });
//     }
// },


// // POST /vtu-pass/buy-electricity
// // { serviceID, meterNumber, meterType, amount, phone }  (meterType: prepaid | postpaid)
// buyElectricity: async (req, res) => {
//     try {
//         const { serviceID, meterNumber, meterType, amount, phone } = req.body;

//         if (!serviceID || !meterNumber || !meterType || !amount || !phone) {
//             return res.status(STATUSCODES.BAD_REQUEST).json({
//                 success: false,
//                 status: STATUSCODES.BAD_REQUEST,
//                 message: "serviceID, meterNumber, meterType, amount, and phone are required",
//                 data: null,
//             });
//         }

//         const payload = {
//             request_id: generateRequestId(),
//             serviceID,
//             billersCode: meterNumber,
//             variation_code: meterType, // "prepaid" | "postpaid"
//             amount,
//             phone,
//         };

//         const response = await vtuPassService.buyElectricity(payload);
//         const result = response.data;
//         const txStatus = result?.content?.transactions?.status;

//         if (result.code === "000" && txStatus === "delivered") {
//             // For prepaid, the token is in result.token / result.purchased_code — show it to the user.
//             return successResponse(res, result, "Electricity purchase successful", STATUSCODES.SUCCESS);
//         }

//         if (txStatus === "pending") {
//             return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
//         }

//         return res.status(STATUSCODES.BAD_REQUEST).json({
//             success: false,
//             status: STATUSCODES.BAD_REQUEST,
//             message: result.response_description || "Transaction failed",
//             data: result,
//         });

//     } catch (error) {
//         console.error("buyElectricity error:", error.response ? error.response.data : error.message);
//         return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
//             success: false,
//             status: STATUSCODES.INTERNAL_SERVER_ERROR,
//             message: "Purchase failed",
//             data: null,
//         });
//     }
// },


// // POST /vtu-pass/requery  { request_id }
// requery: async (req, res) => {
//     try {
//         const { request_id } = req.body;

//         if (!request_id) {
//             return res.status(STATUSCODES.BAD_REQUEST).json({
//                 success: false,
//                 status: STATUSCODES.BAD_REQUEST,
//                 message: "request_id is required",
//                 data: null,
//             });
//         }

//         const response = await vtuPassService.requery({ request_id });
//         const result = response.data;

//         return successResponse(res, result, "Transaction status retrieved", STATUSCODES.SUCCESS);
//     } catch (error) {
//         console.error("requery error:", error.response ? error.response.data : error.message);
//         return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
//             success: false,
//             status: STATUSCODES.INTERNAL_SERVER_ERROR,
//             message: "Requery failed",
//             data: null,
//         });
//     }
// }


// }








// module.exports = vtuPassController;

// // const STATUSCODES = require('../constant/statuscode');
// // const successResponse = require("../utils/successresponse");
// // const User= require("../model/usermodel");
// // const crypto = require("crypto");
// // const dotenv = require("dotenv");
// // const vtuPassService = require("../services/vtupassService");
// // const HttpException = require('../utils/httpException');
// // const {generateRequestId} = require("../utils/helper")

// // dotenv.config();


// // const vtuPassController = {

// // checkBalance: async (req, res) => {
// //     try {
// //         const response = await vtuPassService.checkBalance();
// //         if (response && response.data) {
// //             return successResponse(res, response.data, "Balance retrieved successfully", STATUSCODES.SUCCESS);
// //         } else {
// //             throw new HttpException(STATUSCODES.INTERNAL_SERVER_ERROR, "Failed to retrieve balance");
// //         }
// //     } catch (error) {
// //         console.error("checkBalance error:", error.message);
// //         return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
// //             success: false,
// //             status: STATUSCODES.INTERNAL_SERVER_ERROR,
// //             message: "Failed to retrieve balance",
// //             data: null,
// //         });
// //     }
// // },

// // buyAirtime: async (req, res) => {
// //     try {
// //         const { serviceID, amount, phone } = req.body;

// //         if (!serviceID || !amount || !phone) {
// //             return res.status(STATUSCODES.BAD_REQUEST).json({
// //                 success: false,
// //                 status: STATUSCODES.BAD_REQUEST,
// //                 message: "serviceID, amount, and phone are required",
// //                 data: null,
// //             });
// //         }

// //         const payload = {
// //             request_id: generateRequestId(),
// //             serviceID,
// //             amount,
// //             phone,
// //         };

// //         const response = await vtuPassService.buyAirtime(payload);
// //         const result = response.data;
// //         const txStatus = result?.content?.transactions?.status;

// //         if (result.code === "000" && txStatus === "delivered") {
// //             return successResponse(res, result, "Airtime purchase successful", STATUSCODES.SUCCESS);
// //         }

// //         if (txStatus === "pending") {
// //             // Don't treat as failure — VTpass recommends requerying with requestId later
// //             return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
// //         }

// //         // code !== "000", or status is "failed"/"reversed"
// //         return res.status(STATUSCODES.BAD_REQUEST).json({
// //             success: false,
// //             status: STATUSCODES.BAD_REQUEST,
// //             message: result.response_description || "Transaction failed",
// //             data: result,
// //         });

// //     } catch (error) {
// //         console.error("buyAirtime error:", error.response ? error.response.data : error.message);
// //         return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
// //             success: false,
// //             status: STATUSCODES.INTERNAL_SERVER_ERROR,
// //             message: "Purchase failed",
// //             data: null,
// //         });
// //     }
// // }


// // }








// // module.exports = vtuPassController;