// services/kycService.js
const Kyc = require("../model/kycModel"); // adjust path

class KycService {
  // Create a new KYC record
  static async createKyc(data) {
    const kyc = new Kyc(data);
    return await kyc.save();
  }

  // Get all KYC records
  static async getAllKyc() {
    return await Kyc.find().sort({ createdAt: -1 });
  }

  // Get KYC by ID
  static async getKycById(id) {
    return await Kyc.findById(id);
  }

  // Update KYC by ID
  static async updateKyc(id, data) {
    return await Kyc.findByIdAndUpdate(id, data, { new: true });
  }

  // Delete KYC by ID
  static async deleteKyc(id) {
    return await Kyc.findByIdAndDelete(id);
  }
}

module.exports = KycService;