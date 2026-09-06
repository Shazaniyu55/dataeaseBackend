// config/giftcardPrice.config.js

const pricing = {
  default: {
    markupType: "percentage",
    markupValue: 10,
    minProfit: 1
  },

  products: {
    AMAZON: { markupType: "percentage", markupValue: 12 },
    STEAM: { markupType: "fixed", markupValue: 3 }
  }
};

module.exports = pricing;