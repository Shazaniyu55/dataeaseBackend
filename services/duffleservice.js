const { duffleApi } = require("../config/duffle.config");

// Duffel returns { errors: [...] } on failure — pass that through unchanged
const unwrap = (error) => {
  throw error.response?.data || { message: error.message };
};

class DuffelService {
  // ───────────── FLIGHTS ─────────────
  static async searchFlights(data) {
    try {
      const res = await duffleApi.post(
        "/air/offer_requests",
        { data },
        { params: { return_offers: true, supplier_timeout: 20000 } }
      );
      return res.data;
    } catch (e) { unwrap(e); }
  }

  static async getOffers(offerRequestId) {
    try {
      const res = await duffleApi.get("/air/offers", {
        params: { offer_request_id: offerRequestId, sort: "total_amount" },
      });
      return res.data;
    } catch (e) { unwrap(e); }
  }

  // Always re-fetch right before booking: price can change, offers expire
  static async getOffer(offerId) {
    try {
      const res = await duffleApi.get(`/air/offers/${offerId}`);
      return res.data.data;
    } catch (e) { unwrap(e); }
  }

  static async createOrder(payload) {
    try {
      const res = await duffleApi.post("/air/orders", { data: payload });
      return res.data.data;
    } catch (e) { unwrap(e); }
  }

  // ───────────── STAYS (HOTELS) ─────────────
  static async searchHotels(data) {
    try {
      const res = await duffleApi.post("/stays/search", { data });
      return res.data;
    } catch (e) { unwrap(e); }
  }

  // search result id (srr_...) -> rooms + rates for that hotel
  static async fetchAllRates(searchResultId) {
    try {
      const res = await duffleApi.post(
        `/stays/search_results/${searchResultId}/actions/fetch_all_rates`
      );
      return res.data;
    } catch (e) { unwrap(e); }
  }

  // rate id -> quote (locks the final price)
  static async createQuote(rateId) {
    try {
      const res = await duffleApi.post("/stays/quotes", { data: { rate_id: rateId } });
      return res.data.data;
    } catch (e) { unwrap(e); }
  }

  // quote id -> confirmed booking (paid from your Duffel balance)
  static async createStayBooking(payload) {
    try {
      const res = await duffleApi.post("/stays/bookings", { data: payload });
      return res.data.data;
    } catch (e) { unwrap(e); }
  }
}

module.exports = DuffelService;

// const duffleConfig = require("../config/duffle.config");

// class DuffelService {

//   //  Search Flights
//   static async searchFlights(data) {
//     try {
//       const response = await duffleConfig.duffleApi.post("/air/offer_requests", {
//         data
//       });

//       return response.data;
//     } catch (error) {
//       throw error.response?.data || error.message;
//     }
//   }

//   //  Get Offers
//   static async getOffers(offerRequestId) {
//     try {
//       const response = await duffelAPI.get("/air/offers", {
//         params: {
//           offer_request_id: offerRequestId
//         }
//       });

//       return response.data;
//     } catch (error) {
//       throw error.response?.data || error.message;
//     }
//   }

//    //  Get Single Offer (fetch fresh before booking)
//   static async getOffer(offerId) {
//     try {
//       const response = await duffleConfig.duffleApi.get(`/air/offers/${offerId}`, {
//         params: { return_available_services: true }
//       });
//       return response.data;
//     } catch (error) {
//       throw error.response?.data || error.message;
//     }
//   }

//   //  Create Booking (Order)
//   static async createOrder(payload) {
//     try {
//       const response = await duffleConfig.duffleApi.post("/air/orders", {
//         data: payload
//       });

//       return response.data;
//     } catch (error) {
//       throw error.response?.data || error.message;
//     }
//   }

//   //search hotels
//     static async searchHotels(data) {
//     try {
//       const response = await duffleConfig.duffleApi.post("/stays/search", {
//         data
//       });

//       return response.data;
//     } catch (error) {
//       throw error.response?.data || error.message;
//     }
//   }
// }

// module.exports = DuffelService;