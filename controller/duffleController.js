const DuffelService = require("../services/duffleservice");

class DuffelController {

  // POST /api/flights/search
  static async searchFlights(req, res) {
    try {
      const { origin, destination, departure_date } = req.body;

      if (!origin || !destination || !departure_date) {
        return res.status(400).json({
          message: "origin, destination, and departure_date are required",
        });
      }

      const result = await DuffelService.searchFlights({
        slices: [{ origin, destination, departure_date }],
        passengers: [{ type: "adult" }],
        cabin_class: "economy",
      });

      return res.status(200).json({
        message: "Flights fetched successfully",
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to search flights",
        error: error?.message || error,
      });
    }
  }

  // GET /api/flights/offers?offerRequestId=orq_xxx
  static async getOffers(req, res) {
    try {
      const { offerRequestId } = req.query;

      if (!offerRequestId) {
        return res.status(400).json({
          message: "offerRequestId query param is required",
        });
      }

      const result = await DuffelService.getOffers(offerRequestId);

      return res.status(200).json({
        message: "Offers fetched successfully",
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to fetch offers",
        error: error?.message || error,
      });
    }
  }

  // POST /api/flights/orders
  static async createOrder(req, res) {
    try {
      const { offerId, passengers, amount, currency } = req.body;

      if (!offerId || !passengers || !amount || !currency) {
        return res.status(400).json({
          message: "offerId, passengers, amount, and currency are required",
        });
      }

      if (!Array.isArray(passengers) || passengers.length === 0) {
        return res.status(400).json({
          message: "passengers must be a non-empty array",
        });
      }

      const result = await DuffelService.createOrder({
        type: "instant",
        selected_offers: [offerId],
        passengers,
        payments: [{ type: "balance", amount, currency }],
      });

      return res.status(201).json({
        message: "Flight booked successfully",
        data: result,
      });
    } catch (error) {
      console.log("Error creating order:", error);
      return res.status(500).json({
        message: "Failed to create order",
        error: error?.message || error,
      });
    }
  }

static async searchHotel(req, res) {
  try {
    const {
      accommodation,
      check_in_date,
      check_out_date,
      free_cancellation_only,
      guests,
      instant_payment,
      location,
      mobile,
      negotiated_rate_ids,
      rooms
    } = req.body;

    // Required fields validation
    if (!check_in_date || !check_out_date || !guests || !rooms) {
      return res.status(400).json({
        message: "check_in_date, check_out_date, guests, and rooms are required",
      });
    }

    // Must provide either location or accommodation, not both or neither
    if (!location && !accommodation) {
      return res.status(400).json({
        message: "Either location or accommodation must be provided",
      });
    }

    if (location && accommodation) {
      return res.status(400).json({
        message: "Provide either location or accommodation, not both",
      });
    }

    // Build payload with only defined fields
    const payload = {
      check_in_date,
      check_out_date,
      guests,
      rooms,
      ...(location && { location }),
      ...(accommodation && { accommodation }),
      ...(free_cancellation_only !== undefined && { free_cancellation_only }),
      ...(instant_payment !== undefined && { instant_payment }),
      ...(mobile !== undefined && { mobile }),
      ...(negotiated_rate_ids && { negotiated_rate_ids }),
    };

    const result = await DuffelService.searchHotels(payload);

    return res.status(200).json({
      message: "Hotels fetched successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to search hotels",
      error: error?.message || error,
    });
  }
}


}

module.exports = DuffelController;

