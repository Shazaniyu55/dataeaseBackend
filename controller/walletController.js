const PaystackService = require("../services/paystackService");

class WalletController {
  static async fundWallet(req, res) {
    try {
      const { amount } = req.body;
      const user = req.user;
      console.log("User ID:", user.email);

      if (!amount || amount < 100) {
        return res.status(400).json({
          message: "Minimum funding is ₦100",
        });
      }

      const response = await PaystackService.initializePayment(
        user,
        amount
      );

      return res.status(200).json(response);
    } catch (error) {
      return res.status(500).json({
        message: error.response?.data || error.message,
      });
    }
  }

 

static async verifyPayment(req, res) {
    try {
      const { reference } = req.params;
      const user = req.user;
      const response = await PaystackService.verifyPayment(reference, user);

      if (response.status === "success") {
        return res.status(200).json({
          message: "Payment verified successfully",
          data: response.data,
        });
      }else {
        return res.status(400).json({
          message: "Payment verification failed",
        });
      }

    } catch (error) {
      return res.status(500).json({
        message: error.response?.data || error.message,
      });
    }
  }


}

module.exports = WalletController;