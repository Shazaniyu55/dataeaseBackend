// controllers/kycController.js
const KycService = require("../services/kycservice");

class KycController {
  // Create new KYC
  static async create(req, res) {
    try {
        const {files} = req
        const userId = req.user.userId
        console.log(userId)

       const kycData = {
        userId:userId,
        idFront: files?.idFront?.[0]?.path || null,
        idBack: files?.idBack?.[0]?.path || null,
        selfie: files?.selfie?.[0]?.path || null,
      };

      const kyc = await KycService.createKyc(kycData);
      res.status(201).json({ message: "KYC created successfully", kyc });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create KYC" });
    }
  }

  // Get all KYC records
  static async getAll(req, res) {
    try {
      const kycList = await KycService.getAllKyc();
      res.status(200).json({ kycList });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to get KYC records" });
    }
  }

  // Get a KYC by ID
  static async getById(req, res) {
    try {
      const kyc = await KycService.getKycById(req.params.id);
      if (!kyc) return res.status(404).json({ message: "KYC not found" });
      res.status(200).json({ kyc });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to get KYC" });
    }
  }

  // Update a KYC
  static async update(req, res) {
    try {
      const updatedKyc = await KycService.updateKyc(req.params.id, req.body);
      if (!updatedKyc) return res.status(404).json({ message: "KYC not found" });
      res.status(200).json({ message: "KYC updated successfully", kyc: updatedKyc });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update KYC" });
    }
  }

  // Delete a KYC
  static async delete(req, res) {
    try {
      const deletedKyc = await KycService.deleteKyc(req.params.id);
      if (!deletedKyc) return res.status(404).json({ message: "KYC not found" });
      res.status(200).json({ message: "KYC deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete KYC" });
    }
  }
}

module.exports = KycController;