const KycService = require("../services/kycservice");

const KycController = {

  uploadUserKyc: async (req, res) => {
    try {

      const userId = req.user.userId;

      const selfie = req.files?.selfie?.[0];
      const idFront = req.files?.idFront?.[0];
      const idBack = req.files?.idBack?.[0];

      if (!selfie || !idFront || !idBack) {
        return res.status(400).json({
          status: "failed",
          message: "Selfie, ID Front and ID Back are required",
        });
      }

      const existingKyc = await KycService.getUserKyc(userId);

      if (existingKyc) {
        return res.status(400).json({
          status: "failed",
          message: "KYC already submitted",
        });
      }

      const kycData = {
        user: userId,
        selfie: selfie.path,
        idFront: idFront.path,
        idBack: idBack.path,
      };

      const newKyc = await KycService.createKyc(kycData);

      return res.status(201).json({
        status: "success",
        message: "KYC uploaded successfully",
        data: newKyc,
      });

    } catch (error) {

      //console.log(error);

      return res.status(500).json({
        status: "failed",
        message: "Server error",
      });
    }
  },


  getUserKyc: async (req, res) => {
    try {

      const userId = req.user.userId;

      const kyc = await KycService.getUserKyc(userId);

      return res.status(200).json({
        status: "success",
        data: kyc,
      });

    } catch (error) {

      return res.status(500).json({
        status: "failed",
        message: "Server error",
      });

    }
  },



};

module.exports = KycController;