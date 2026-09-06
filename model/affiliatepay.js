const mongoose = require('mongoose');


const AffiliatepaymentSchema = new mongoose.Schema({
 reference: { type: String, required: true },

 
  user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
  },
   type: {
    type: String,
    enum: ["affiliate"],
    required: true,
  },
  amount: {
      type: Number,
      required: true
  },
 
  status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
  },

  createdAt: {
      type: Date,
      default: Date.now
  }
});

const AffiliatePay = mongoose.model('Payment', AffiliatepaymentSchema);

module.exports = AffiliatePay;