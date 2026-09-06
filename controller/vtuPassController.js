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
}


}








module.exports = vtuPassController;