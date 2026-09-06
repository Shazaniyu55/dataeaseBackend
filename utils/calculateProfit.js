// utils/calculateProfit.js
const pricing = require("../config/price.config");
const Giftpricing = require("../config/giftcardprice.config");


function calculateAirtimePricing(service, amount) {
  const discountPercent = pricing.airtime[service.toLowerCase()];

  if (!discountPercent) {
    throw new Error("Invalid service type");
  }

  const discountAmount = (discountPercent / 100) * amount;
  const costPrice = amount - discountAmount;
  const sellingPrice = amount; // Sell at face value
  const profit = sellingPrice - costPrice;

  return {
    sellingPrice,
    costPrice,
    profit,
    discountPercent
  };
}


function calculateCablePricing(service, amount) {
  const discountPercent = pricing.cable[service.toLowerCase()];

  if (!discountPercent) {
    throw new Error("Invalid service type");
  }

  const discountAmount = (discountPercent / 100) * amount;
  const costPrice = amount - discountAmount;
  const sellingPrice = amount; // Sell at face value
  const profit = sellingPrice - costPrice;

  return {
    sellingPrice,
    costPrice,
    profit,
    discountPercent
  };
}

function calculateElectricPricing(service, amount) {
  // Get discount percent safely
  const discountPercent = (pricing?.electricity?.default ?? 0); // fallback to 0 if undefined

  const discountAmount = (discountPercent / 100) * Number(amount); // ensure number
  const costPrice = Number(amount); // what it costs you
  const sellingPrice = Number(amount) - discountAmount; // what user pays after discount
  const profit = sellingPrice - costPrice; // can be negative if discount > cost

  return {
    sellingPrice,
    costPrice,
    profit,
    discountPercent
  };
}

function calculateDataPricing(service, amount) {
  if (!service) throw new Error("Service is required for data");

  // Trim and lowercase the service
  const serviceKey = service.trim().toLowerCase();

  const discountPercent = pricing.data[serviceKey];

  if (!discountPercent) {
    //console.error("Invalid data service received:", serviceKey);
    throw new Error(`Invalid service type for data: ${service}`);
  }

  const discountAmount = (discountPercent / 100) * amount;
  const costPrice = amount - discountAmount;
  const sellingPrice = amount; // sell at face value
  const profit = sellingPrice - costPrice;

  return {
    sellingPrice,
    costPrice,
    profit,
    discountPercent
  };
}



function calculateSellingPrice ({ costPrice, productName }) {
  let config = Giftpricing.default;

  // match product name (important)
  const productKey = Object.keys(Giftpricing.products).find((key) =>
    productName.toUpperCase().includes(key)
  );

  if (productKey) {
    config = { ...config, ...Giftpricing.products[productKey] };
  }

  let sellingPrice;

  if (config.markupType === "percentage") {
    sellingPrice = costPrice + (costPrice * config.markupValue) / 100;
  } else {
    sellingPrice = costPrice + config.markupValue;
  }

  // enforce minimum profit
  if (sellingPrice - costPrice < config.minProfit) {
    sellingPrice = costPrice + config.minProfit;
  }

  return Number(sellingPrice.toFixed(2));
}


function calculateEpinPricing(amount) {
  // Get discount percent safely
  const discountPercent = (pricing?.epin?.default ?? 0); // fallback to 0 if undefined

  const discountAmount = (discountPercent / 100) * Number(amount); // ensure number
  const costPrice = Number(amount); // what it costs you
  const sellingPrice = Number(amount) - discountAmount; // what user pays after discount
  const profit = sellingPrice - costPrice; // can be negative if discount > cost

  return {
    sellingPrice,
    costPrice,
    profit,
    discountPercent
  };
}

const getUSDtoNGN = async () => {
  const res = await fetch("https://fxapi.app/api/USD/NGN.json");
  const data = await res.json();
//console.log(data)
  return data.rate;
}

module.exports = { calculateAirtimePricing, calculateCablePricing, calculateElectricPricing, calculateDataPricing, calculateSellingPrice, calculateEpinPricing, getUSDtoNGN };