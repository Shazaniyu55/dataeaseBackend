const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["adult", "child", "infant"],
    default: "adult"
  },
  given_name: String,
  family_name: String,
  gender: String,
  born_on: String, // YYYY-MM-DD
  email: String,
  phone_number: String,

  passport: {
    number: String,
    issuing_country: String,
    expiry_date: String
  }
});

const flightBookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // Search reference
  offerRequestId: {
    type: String,
    required: true
  },

  // Selected flight
  offerId: {
    type: String,
    required: true
  },

  //  Duffel order (after booking)
  orderId: {
    type: String
  },

  bookingReference: {
    type: String // PNR (from Duffel)
  },

  passengers: [passengerSchema],

  amount: {
    type: Number,
    required: true
  },

  currency: {
    type: String,
    default: "USD"
  },

  status: {
    type: String,
    enum: ["pending", "paid", "booked", "failed"],
    default: "pending"
  },

  paymentReference: {
    type: String // Paystack ref
  },

  metadata: {
    type: Object
  }

}, { timestamps: true });

module.exports = mongoose.model("FlightBooking", flightBookingSchema);