// services/kycService.js
const Kyc = require("../model/kycModel"); // adjust path

const KycService = {

  createKyc: async (data) => {
    return await Kyc.create(data);
  },

  getUserKyc: async (userId) => {
    return await Kyc.findOne({ user: userId });
  },

  getAllKyc: async () => {
    return await Kyc.find().populate("user");
  },

  updateKycStatus: async (kycId, data) => {
    return await Kyc.findByIdAndUpdate(kycId, data, { new: true });
  },

};

module.exports = KycService;