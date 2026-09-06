const duffleConfig = require("../config/duffle.config");

class DuffelService {

  //  Search Flights
  static async searchFlights(data) {
    try {
      const response = await duffleConfig.duffleApi.post("/air/offer_requests", {
        data
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }

  //  Get Offers
  static async getOffers(offerRequestId) {
    try {
      const response = await duffelAPI.get("/air/offers", {
        params: {
          offer_request_id: offerRequestId
        }
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }

   //  Get Single Offer (fetch fresh before booking)
  static async getOffer(offerId) {
    try {
      const response = await duffleConfig.duffleApi.get(`/air/offers/${offerId}`, {
        params: { return_available_services: true }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }

  //  Create Booking (Order)
  static async createOrder(payload) {
    try {
      const response = await duffleConfig.duffleApi.post("/air/orders", {
        data: payload
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }

  //search hotels
    static async searchHotels(data) {
    try {
      const response = await duffleConfig.duffleApi.post("/stays/search", {
        data
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
}

module.exports = DuffelService;