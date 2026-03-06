// utils/calculateProfit.js
const pricing = require("../config/price.config");

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
  const discountPercent = pricing.electricity[service.toLowerCase()];

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


function calculateDataPricing(service, amount) {
  if (!service) throw new Error("Service is required for data");

  // Trim and lowercase the service
  const serviceKey = service.trim().toLowerCase();

  const discountPercent = pricing.data[serviceKey];

  if (!discountPercent) {
    console.error("Invalid data service received:", serviceKey);
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
module.exports = { calculateAirtimePricing, calculateCablePricing, calculateElectricPricing, calculateDataPricing };