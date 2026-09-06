const FundingRequest = require("../model/fundingRequest");
const Wallet = require("../model/walletmodel");
const axios = require("axios");
require("dotenv").config();

const createFundingRequest = async (data) => {
  return await FundingRequest.create(data);
};

const approveFundingRequest = async (requestId, adminId) => {
  const session = await FundingRequest.startSession();
  session.startTransaction();

  try {
    const request = await FundingRequest.findById(requestId).session(session);

    if (!request) {
      throw new Error("Funding request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Funding already processed");
    }

    // Credit wallet
    await Wallet.findOneAndUpdate(
      { userId: request.userId },
      { $inc: { balance: request.amount } },
      { session }
    );

    request.status = "approved";
    request.approvedBy = adminId;

    await request.save({ session });

    await session.commitTransaction();
    session.endSession();

    return request;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};






module.exports = {
  createFundingRequest,
  approveFundingRequest,
};