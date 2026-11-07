const crypto = require("crypto");
const DuffelService = require("../services/duffleservice");
const Wallet = require("../model/walletmodel");
const FlightBooking = require("../model/flightbookingmodel");

// ── Pricing: Duffel charges you in USD/GBP/EUR, your users pay NGN from wallet ──
// Set these in .env. Update DUFFEL_FX_RATE_NGN regularly (or swap in a live FX API).
const FX_RATE = Number(process.env.DUFFEL_FX_RATE_NGN || 0);          // e.g. 1650 (₦ per 1 USD)
const MARKUP_PCT = Number(process.env.DUFFEL_MARKUP_PERCENT || 5);     // your margin, %

function priceInNaira(amount, currency) {
  if (currency === "NGN") {
    const cost = Math.ceil(Number(amount));
    const sell = Math.ceil(cost * (1 + MARKUP_PCT / 100));
    return { cost, sell, profit: sell - cost };
  }
  if (!FX_RATE) throw new Error("DUFFEL_FX_RATE_NGN is not configured");
  const cost = Math.ceil(Number(amount) * FX_RATE);
  const sell = Math.ceil(cost * (1 + MARKUP_PCT / 100));
  return { cost, sell, profit: sell - cost };
}

const ref = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

const duffelError = (res, status, message, error) =>
  res.status(status).json({ success: false, message, error: error?.errors || error?.message || error });

async function refund(userId, amount, reference, reason) {
  await Wallet.atomicCredit(userId, amount, { reference: `refund-${reference}`, profit: 0 });
  await Wallet.updateOne(
    { userId, "transactions.reference": reference },
    { $set: { "transactions.$.status": "refunded", "transactions.$.reason": reason } }
  );
}

class DuffelController {
  // ───────────────────────── FLIGHTS ─────────────────────────

  // POST /api/v2/flight/search
  static async searchFlights(req, res) {
    const { origin, destination, departure_date, return_date,
            adults = 1, children = [], cabin_class = "economy" } = req.body;

    if (!origin || !destination || !departure_date) {
      return res.status(400).json({ message: "origin, destination, and departure_date are required" });
    }

    const slices = [{ origin, destination, departure_date }];
    if (return_date) slices.push({ origin: destination, destination: origin, departure_date: return_date });

    const passengers = [
      ...Array.from({ length: Number(adults) }, () => ({ type: "adult" })),
      ...children.map((age) => ({ age: Number(age) })), // Duffel wants age for under-18s
    ];

    try {
      const result = await DuffelService.searchFlights({ slices, passengers, cabin_class });

      // Attach the NGN price the user will actually be charged
      result.data.offers = (result.data.offers || []).map((o) => {
        try { return { ...o, ngn_price: priceInNaira(o.total_amount, o.total_currency).sell }; }
        catch { return o; }
      });

      return res.status(200).json({ message: "Flights fetched successfully", data: result });
    } catch (error) {
      return duffelError(res, 502, "Failed to search flights", error);
    }
  }

  // GET /api/v2/flight/offers/:offerRequestId
  static async getOffers(req, res) {
    const offerRequestId = req.params.offerRequestId || req.query.offerRequestId;
    if (!offerRequestId) return res.status(400).json({ message: "offerRequestId is required" });
    try {
      const result = await DuffelService.getOffers(offerRequestId);
      return res.status(200).json({ message: "Offers fetched successfully", data: result });
    } catch (error) {
      return duffelError(res, 502, "Failed to fetch offers", error);
    }
  }

  // POST /api/v2/flight/book
  // body: { offerId, passengers: [{ title, given_name, family_name, gender, born_on, email, phone_number }] }
  // amount/currency from the client are IGNORED — price comes from Duffel.
  static async createOrder(req, res) {
    const userId = req.user.userId;
    const { offerId, passengers, offerRequestId } = req.body;

    if (!offerId || !Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({ message: "offerId and a non-empty passengers array are required" });
    }

    // 1. Fresh offer: real price + real passenger ids
    let offer;
    try {
      offer = await DuffelService.getOffer(offerId);
    } catch (error) {
      return duffelError(res, 410, "This flight offer is no longer available. Please search again.", error);
    }
    if (new Date(offer.expires_at) < new Date()) {
      return res.status(410).json({ message: "This flight offer has expired. Please search again." });
    }
    if (passengers.length !== offer.passengers.length) {
      return res.status(400).json({
        message: `This offer is for ${offer.passengers.length} passenger(s); you sent ${passengers.length}`,
      });
    }

    // Duffel requires each passenger to carry the id from offer.passengers
    const duffelPassengers = offer.passengers.map((p, i) => ({
      ...passengers[i],
      id: p.id,
      gender: String(passengers[i].gender || "").toLowerCase().startsWith("f") ? "f" : "m",
      title: String(passengers[i].title || "").toLowerCase(),
    }));

    // 2. Charge the user's wallet first (atomic)
    let price;
    try { price = priceInNaira(offer.total_amount, offer.total_currency); }
    catch (e) { return res.status(500).json({ message: e.message }); }

    const reference = ref("FLT");
    const wallet = await Wallet.atomicDebit(userId, price.sell, {
      reference, type: "flight", phoneOrAccount: offerId,
      costPrice: price.cost, sellingPrice: price.sell, profit: price.profit, status: "pending",
    });
    if (!wallet) {
      const exists = await Wallet.findOne({ userId });
      return res.status(exists ? 400 : 404).json({ message: exists ? "Insufficient balance" : "Wallet not found" });
    }

    const booking = await FlightBooking.create({
      user: userId, offerRequestId: offerRequestId || "unknown", offerId,
      passengers: duffelPassengers, amount: price.sell, currency: "NGN",
      status: "paid", paymentReference: reference,
      metadata: { duffel_amount: offer.total_amount, duffel_currency: offer.total_currency },
    });

    // 3. Book with Duffel, paying from your Duffel balance with the EXACT offer total
    try {
      const order = await DuffelService.createOrder({
        type: "instant",
        selected_offers: [offer.id],
        passengers: duffelPassengers,
        payments: [{ type: "balance", amount: offer.total_amount, currency: offer.total_currency }],
      });

      booking.status = "booked";
      booking.orderId = order.id;
      booking.bookingReference = order.booking_reference;
      await booking.save();
      await Wallet.updateOne(
        { userId, "transactions.reference": reference },
        { $set: { "transactions.$.status": "success" } }
      );

      return res.status(201).json({
        message: "Flight booked successfully",
        data: { bookingReference: order.booking_reference, orderId: order.id, chargedNGN: price.sell, order },
      });
    } catch (error) {
      console.log("Duffel order failed:", JSON.stringify(error));
      booking.status = "failed";
      booking.metadata = { ...booking.metadata, error };
      await booking.save();
      await refund(userId, price.sell, reference, "Duffel order failed");
      return duffelError(res, 502, "Booking failed, your wallet has been refunded", error);
    }
  }

  // ───────────────────────── HOTELS ─────────────────────────

  // POST /api/v2/flight/hotels/search   (unchanged behaviour)
  static async searchHotel(req, res) {
    const { accommodation, check_in_date, check_out_date, free_cancellation_only,
            guests, instant_payment, location, mobile, negotiated_rate_ids, rooms } = req.body;

    if (!check_in_date || !check_out_date || !guests || !rooms) {
      return res.status(400).json({ message: "check_in_date, check_out_date, guests, and rooms are required" });
    }
    if (!location === !accommodation) {
      return res.status(400).json({ message: "Provide exactly one of location or accommodation" });
    }

    const payload = {
      check_in_date, check_out_date, guests, rooms,
      ...(location && { location }),
      ...(accommodation && { accommodation }),
      ...(free_cancellation_only !== undefined && { free_cancellation_only }),
      ...(instant_payment !== undefined && { instant_payment }),
      ...(mobile !== undefined && { mobile }),
      ...(negotiated_rate_ids && { negotiated_rate_ids }),
    };

    try {
      const result = await DuffelService.searchHotels(payload);
        // Attach the NGN price per hotel (cheapest rate for the whole stay)
      result.data.results = (result.data.results || []).map((r) => {
        try { return { ...r, ngn_price: priceInNaira(r.cheapest_rate_total_amount, r.cheapest_rate_currency).sell }; }
        catch { return r; }
      });

      return res.status(200).json({ message: "Hotels fetched successfully", data: result });
    } catch (error) {
      return duffelError(res, 502, "Failed to search hotels", error);
    }
  }

  
  // POST /api/v2/flight/hotels/rates   body: { searchResultId }
  static async hotelRates(req, res) {
    const { searchResultId } = req.body;
    if (!searchResultId) return res.status(400).json({ message: "searchResultId is required" });
    try {
      const result = await DuffelService.fetchAllRates(searchResultId);
      // We pay Duffel from balance, so only "pay_now" rates can be booked.
      // Attach the NGN price to every rate and drop rooms with no bookable rate.
      const rooms = result.data?.accommodation?.rooms || [];
      result.data.accommodation.rooms = rooms
        .map((room) => ({
          ...room,
          rates: (room.rates || [])
            .filter((rate) => !rate.payment_type || rate.payment_type === "pay_now")
            .map((rate) => {
              try { return { ...rate, ngn_price: priceInNaira(rate.total_amount, rate.total_currency).sell }; }
              catch { return rate; }
            }),
        }))
        .filter((room) => room.rates.length > 0);

      return res.status(200).json({ message: "Rates fetched successfully", data: result });
    } catch (error) {
      return duffelError(res, 502, "Failed to fetch rates", error);
    }
  }

  // POST /api/v2/flight/hotels/book
  // body: { rateId, guests: [{ given_name, family_name }], email, phone_number }
  static async bookHotel(req, res) {
    const userId = req.user.userId;
    const { rateId, guests, email, phone_number } = req.body;

    if (!rateId || !Array.isArray(guests) || !guests.length || !email || !phone_number) {
      return res.status(400).json({ message: "rateId, guests, email and phone_number are required" });
    }

    // 1. Quote locks the final price
    let quote;
    try {
      quote = await DuffelService.createQuote(rateId);
    } catch (error) {
      return duffelError(res, 410, "This room rate is no longer available. Please search again.", error);
    }

    let price;
    try { price = priceInNaira(quote.total_amount, quote.total_currency); }
    catch (e) { return res.status(500).json({ message: e.message }); }

    // 2. Charge wallet
    const reference = ref("HTL");
    const wallet = await Wallet.atomicDebit(userId, price.sell, {
      reference, type: "hotel", phoneOrAccount: quote.id,
      costPrice: price.cost, sellingPrice: price.sell, profit: price.profit, status: "pending",
    });
    if (!wallet) {
      const exists = await Wallet.findOne({ userId });
      return res.status(exists ? 400 : 404).json({ message: exists ? "Insufficient balance" : "Wallet not found" });
    }

    // 3. Book with Duffel (paid from your Duffel balance)
    try {
      const booking = await DuffelService.createStayBooking({
        quote_id: quote.id, guests, email, phone_number,
      });
      await Wallet.updateOne(
        { userId, "transactions.reference": reference },
        { $set: { "transactions.$.status": "success", "transactions.$.token": booking.reference } }
      );
      return res.status(201).json({
        message: "Hotel booked successfully",
        data: { bookingId: booking.id, reference: booking.reference, chargedNGN: price.sell, booking },
      });
    } catch (error) {
      console.log("Duffel stay booking failed:", JSON.stringify(error));
      await refund(userId, price.sell, reference, "Duffel stay booking failed");
      return duffelError(res, 502, "Hotel booking failed, your wallet has been refunded", error);
    }
  }
}

module.exports = DuffelController;

// const DuffelService = require("../services/duffleservice");

// class DuffelController {

//   // POST /api/flights/search
//   static async searchFlights(req, res) {
//     try {
//       const { origin, destination, departure_date } = req.body;

//       if (!origin || !destination || !departure_date) {
//         return res.status(400).json({
//           message: "origin, destination, and departure_date are required",
//         });
//       }

//       const result = await DuffelService.searchFlights({
//         slices: [{ origin, destination, departure_date }],
//         passengers: [{ type: "adult" }],
//         cabin_class: "economy",
//       });

//       return res.status(200).json({
//         message: "Flights fetched successfully",
//         data: result,
//       });
//     } catch (error) {
//       return res.status(500).json({
//         message: "Failed to search flights",
//         error: error?.message || error,
//       });
//     }
//   }

//   // GET /api/flights/offers?offerRequestId=orq_xxx
//   static async getOffers(req, res) {
//     try {
//       const { offerRequestId } = req.query;

//       if (!offerRequestId) {
//         return res.status(400).json({
//           message: "offerRequestId query param is required",
//         });
//       }

//       const result = await DuffelService.getOffers(offerRequestId);

//       return res.status(200).json({
//         message: "Offers fetched successfully",
//         data: result,
//       });
//     } catch (error) {
//       return res.status(500).json({
//         message: "Failed to fetch offers",
//         error: error?.message || error,
//       });
//     }
//   }

//   // POST /api/flights/orders
//   static async createOrder(req, res) {
//     try {
//       const { offerId, passengers, amount, currency } = req.body;

//       if (!offerId || !passengers || !amount || !currency) {
//         return res.status(400).json({
//           message: "offerId, passengers, amount, and currency are required",
//         });
//       }

//       if (!Array.isArray(passengers) || passengers.length === 0) {
//         return res.status(400).json({
//           message: "passengers must be a non-empty array",
//         });
//       }

//       const result = await DuffelService.createOrder({
//         type: "instant",
//         selected_offers: [offerId],
//         passengers,
//         payments: [{ type: "balance", amount, currency }],
//       });

//       return res.status(201).json({
//         message: "Flight booked successfully",
//         data: result,
//       });
//     } catch (error) {
//       console.log("Error creating order:", error);
//       return res.status(500).json({
//         message: "Failed to create order",
//         error: error?.message || error,
//       });
//     }
//   }

// static async searchHotel(req, res) {
//   try {
//     const {
//       accommodation,
//       check_in_date,
//       check_out_date,
//       free_cancellation_only,
//       guests,
//       instant_payment,
//       location,
//       mobile,
//       negotiated_rate_ids,
//       rooms
//     } = req.body;

//     // Required fields validation
//     if (!check_in_date || !check_out_date || !guests || !rooms) {
//       return res.status(400).json({
//         message: "check_in_date, check_out_date, guests, and rooms are required",
//       });
//     }

//     // Must provide either location or accommodation, not both or neither
//     if (!location && !accommodation) {
//       return res.status(400).json({
//         message: "Either location or accommodation must be provided",
//       });
//     }

//     if (location && accommodation) {
//       return res.status(400).json({
//         message: "Provide either location or accommodation, not both",
//       });
//     }

//     // Build payload with only defined fields
//     const payload = {
//       check_in_date,
//       check_out_date,
//       guests,
//       rooms,
//       ...(location && { location }),
//       ...(accommodation && { accommodation }),
//       ...(free_cancellation_only !== undefined && { free_cancellation_only }),
//       ...(instant_payment !== undefined && { instant_payment }),
//       ...(mobile !== undefined && { mobile }),
//       ...(negotiated_rate_ids && { negotiated_rate_ids }),
//     };

//     const result = await DuffelService.searchHotels(payload);

//     return res.status(200).json({
//       message: "Hotels fetched successfully",
//       data: result,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Failed to search hotels",
//       error: error?.message || error,
//     });
//   }
// }


// }

// module.exports = DuffelController;

