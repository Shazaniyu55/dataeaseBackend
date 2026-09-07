const STATUSCODES = require('../constant/statuscode');
const successResponse = require("../utils/successresponse");
const User= require("../model/usermodel");
const crypto = require("crypto");
const dotenv = require("dotenv");
const vtuPassService = require("../services/vtupassService");
const HttpException = require('../utils/httpException');
const {generateRequestId} = require("../utils/helper")

dotenv.config();


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
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: STATUSCODES.INTERNAL_SERVER_ERROR,
            message: "Failed to retrieve balance",
            data: null,
        });
    }
},


// GET /vtu-pass/variations?serviceID=mtn-data  (data plans / cable bouquets)
getVariations: async (req, res) => {
    try {
        const { serviceID } = req.query;

        if (!serviceID) {
            return res.status(STATUSCODES.BAD_REQUEST).json({
                success: false,
                status: STATUSCODES.BAD_REQUEST,
                message: "serviceID is required",
                data: null,
            });
        }

        const response = await vtuPassService.getVariations(serviceID);
        const result = response.data;

        // The variations endpoint returns response_description "000" on success
        if (result && result.response_description === "000") {
            return successResponse(res, result.content, "Variations retrieved successfully", STATUSCODES.SUCCESS);
        }

        return res.status(STATUSCODES.BAD_REQUEST).json({
            success: false,
            status: STATUSCODES.BAD_REQUEST,
            message: "Failed to retrieve variations",
            data: result,
        });
    } catch (error) {
        console.error("getVariations error:", error.response ? error.response.data : error.message);
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: STATUSCODES.INTERNAL_SERVER_ERROR,
            message: "Failed to retrieve variations",
            data: null,
        });
    }
},


// POST /vtu-pass/verify  { serviceID, billersCode, type? }
// Verify a meter number (electricity) or smartcard/IUC (cable) before charging.
verifyMerchant: async (req, res) => {
    try {
        const { serviceID, billersCode, type } = req.body;

        if (!serviceID || !billersCode) {
            return res.status(STATUSCODES.BAD_REQUEST).json({
                success: false,
                status: STATUSCODES.BAD_REQUEST,
                message: "serviceID and billersCode are required",
                data: null,
            });
        }

        const payload = { serviceID, billersCode };
        if (type) payload.type = type; // prepaid | postpaid (electricity only)

        const response = await vtuPassService.verifyMerchant(payload);
        const result = response.data;

        if (result.code === "000" && !result?.content?.WrongBillersCode && !result?.content?.error) {
            return successResponse(res, result.content, "Customer verified successfully", STATUSCODES.SUCCESS);
        }

        return res.status(STATUSCODES.BAD_REQUEST).json({
            success: false,
            status: STATUSCODES.BAD_REQUEST,
            message: result?.content?.error || "Invalid meter number / smartcard",
            data: result,
        });
    } catch (error) {
        console.error("verifyMerchant error:", error.response ? error.response.data : error.message);
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: STATUSCODES.INTERNAL_SERVER_ERROR,
            message: "Verification failed",
            data: null,
        });
    }
},


buyAirtime: async (req, res) => {
    try {
        const { serviceID, amount, phone } = req.body;

        if (!serviceID || !amount || !phone) {
            return res.status(STATUSCODES.BAD_REQUEST).json({
                success: false,
                status: STATUSCODES.BAD_REQUEST,
                message: "serviceID, amount, and phone are required",
                data: null,
            });
        }

        const payload = {
            request_id: generateRequestId(),
            serviceID,
            amount,
            phone,
        };

        const response = await vtuPassService.buyAirtime(payload);
        const result = response.data;
        const txStatus = result?.content?.transactions?.status;

        if (result.code === "000" && txStatus === "delivered") {
            return successResponse(res, result, "Airtime purchase successful", STATUSCODES.SUCCESS);
        }

        if (txStatus === "pending") {
            // Don't treat as failure — VTpass recommends requerying with requestId later
            return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
        }

        // code !== "000", or status is "failed"/"reversed"
        return res.status(STATUSCODES.BAD_REQUEST).json({
            success: false,
            status: STATUSCODES.BAD_REQUEST,
            message: result.response_description || "Transaction failed",
            data: result,
        });

    } catch (error) {
        console.error("buyAirtime error:", error.response ? error.response.data : error.message);
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: STATUSCODES.INTERNAL_SERVER_ERROR,
            message: "Purchase failed",
            data: null,
        });
    }
},


// POST /vtu-pass/buy-data  { serviceID, phone, variation_code }
buyData: async (req, res) => {
    try {
        const { serviceID, phone, variation_code } = req.body;

        if (!serviceID || !phone || !variation_code) {
            return res.status(STATUSCODES.BAD_REQUEST).json({
                success: false,
                status: STATUSCODES.BAD_REQUEST,
                message: "serviceID, phone, and variation_code are required",
                data: null,
            });
        }

        const payload = {
            request_id: generateRequestId(),
            serviceID,
            billersCode: phone, // for data, the recipient phone is the billersCode
            variation_code,
            phone,
        };

        const response = await vtuPassService.buyData(payload);
        const result = response.data;
        const txStatus = result?.content?.transactions?.status;

        if (result.code === "000" && txStatus === "delivered") {
            return successResponse(res, result, "Data purchase successful", STATUSCODES.SUCCESS);
        }

        if (txStatus === "pending") {
            return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
        }

        return res.status(STATUSCODES.BAD_REQUEST).json({
            success: false,
            status: STATUSCODES.BAD_REQUEST,
            message: result.response_description || "Transaction failed",
            data: result,
        });

    } catch (error) {
        console.error("buyData error:", error.response ? error.response.data : error.message);
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: STATUSCODES.INTERNAL_SERVER_ERROR,
            message: "Purchase failed",
            data: null,
        });
    }
},


// POST /vtu-pass/buy-cable
// { serviceID, smartcardNumber, variation_code, amount, phone, subscription_type? }
buyCable: async (req, res) => {
    try {
        const { serviceID, smartcardNumber, variation_code, amount, phone, subscription_type } = req.body;

        if (!serviceID || !smartcardNumber || !variation_code || !amount || !phone) {
            return res.status(STATUSCODES.BAD_REQUEST).json({
                success: false,
                status: STATUSCODES.BAD_REQUEST,
                message: "serviceID, smartcardNumber, variation_code, amount, and phone are required",
                data: null,
            });
        }

        const payload = {
            request_id: generateRequestId(),
            serviceID,
            billersCode: smartcardNumber,
            variation_code,
            amount,
            phone,
            subscription_type: subscription_type || "change", // "change" | "renew"
        };

        const response = await vtuPassService.buyCable(payload);
        const result = response.data;
        const txStatus = result?.content?.transactions?.status;

        if (result.code === "000" && txStatus === "delivered") {
            return successResponse(res, result, "Cable subscription successful", STATUSCODES.SUCCESS);
        }

        if (txStatus === "pending") {
            return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
        }

        return res.status(STATUSCODES.BAD_REQUEST).json({
            success: false,
            status: STATUSCODES.BAD_REQUEST,
            message: result.response_description || "Transaction failed",
            data: result,
        });

    } catch (error) {
        console.error("buyCable error:", error.response ? error.response.data : error.message);
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: STATUSCODES.INTERNAL_SERVER_ERROR,
            message: "Purchase failed",
            data: null,
        });
    }
},


// POST /vtu-pass/buy-electricity
// { serviceID, meterNumber, meterType, amount, phone }  (meterType: prepaid | postpaid)
buyElectricity: async (req, res) => {
    try {
        const { serviceID, meterNumber, meterType, amount, phone } = req.body;

        if (!serviceID || !meterNumber || !meterType || !amount || !phone) {
            return res.status(STATUSCODES.BAD_REQUEST).json({
                success: false,
                status: STATUSCODES.BAD_REQUEST,
                message: "serviceID, meterNumber, meterType, amount, and phone are required",
                data: null,
            });
        }

        const payload = {
            request_id: generateRequestId(),
            serviceID,
            billersCode: meterNumber,
            variation_code: meterType, // "prepaid" | "postpaid"
            amount,
            phone,
        };

        const response = await vtuPassService.buyElectricity(payload);
        const result = response.data;
        const txStatus = result?.content?.transactions?.status;

        if (result.code === "000" && txStatus === "delivered") {
            // For prepaid, the token is in result.token / result.purchased_code — show it to the user.
            return successResponse(res, result, "Electricity purchase successful", STATUSCODES.SUCCESS);
        }

        if (txStatus === "pending") {
            return successResponse(res, result, "Transaction pending, please requery status", STATUSCODES.SUCCESS);
        }

        return res.status(STATUSCODES.BAD_REQUEST).json({
            success: false,
            status: STATUSCODES.BAD_REQUEST,
            message: result.response_description || "Transaction failed",
            data: result,
        });

    } catch (error) {
        console.error("buyElectricity error:", error.response ? error.response.data : error.message);
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: STATUSCODES.INTERNAL_SERVER_ERROR,
            message: "Purchase failed",
            data: null,
        });
    }
},


// POST /vtu-pass/requery  { request_id }
requery: async (req, res) => {
    try {
        const { request_id } = req.body;

        if (!request_id) {
            return res.status(STATUSCODES.BAD_REQUEST).json({
                success: false,
                status: STATUSCODES.BAD_REQUEST,
                message: "request_id is required",
                data: null,
            });
        }

        const response = await vtuPassService.requery({ request_id });
        const result = response.data;

        return successResponse(res, result, "Transaction status retrieved", STATUSCODES.SUCCESS);
    } catch (error) {
        console.error("requery error:", error.response ? error.response.data : error.message);
        return res.status(STATUSCODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: STATUSCODES.INTERNAL_SERVER_ERROR,
            message: "Requery failed",
            data: null,
        });
    }
}


}








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
// }


// }








// module.exports = vtuPassController;