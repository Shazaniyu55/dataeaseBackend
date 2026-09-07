const vtuPassConfig = require('../config/vtupass.config');
const dotenv = require('dotenv');
dotenv.config();


const vtuPassService = {
//check your balance
checkBalance: async () => {
  try{
      const response = await vtuPassConfig.vtuPassApi.get('/api/balance');
      return response;
  }catch (error) {

    console.error("Error checking balance:", error.response ? error.response.data : error.message);
    throw error; // let the controller's catch block handle it
  }
},


// GET variation codes (data plans, cable bouquets) for a serviceID
getVariations: async (serviceID) => {
  try {
    const response = await vtuPassConfig.vtuPassApi.get('/api/service-variations', {
      params: { serviceID },
    });
    return response;
  } catch (error) {
    console.error("Error fetching variations:", error.response ? error.response.data : error.message);
    throw error;
  }
},


// Verify a meter number (electricity) or smartcard/IUC (cable) before charging.
// payload: { billersCode, serviceID, type? }  ('type' only for electricity: prepaid|postpaid)
verifyMerchant: async (payload) => {
  try {
    const response = await vtuPassConfig.vtuPassPurchaseApi.post('/api/merchant-verify', payload);
    return response;
  } catch (error) {
    console.error("Error verifying merchant:", error.response ? error.response.data : error.message);
    throw error;
  }
},


buyAirtime: async (payload) => {
  try {
    const response = await vtuPassConfig.vtuPassPurchaseApi.post('/api/pay', payload);
    return response;
  } catch (error) {
    console.error("Error buying airtime:", error.response ? error.response.data : error.message);
    throw error; // let the controller's catch block handle it
  }
},


buyData: async (payload) => {
  try {
    const response = await vtuPassConfig.vtuPassPurchaseApi.post('/api/pay', payload);
    return response;
  } catch (error) {
    console.error("Error buying data:", error.response ? error.response.data : error.message);
    throw error;
  }
},


buyCable: async (payload) => {
  try {
    const response = await vtuPassConfig.vtuPassPurchaseApi.post('/api/pay', payload);
    return response;
  } catch (error) {
    console.error("Error buying cable subscription:", error.response ? error.response.data : error.message);
    throw error;
  }
},


buyElectricity: async (payload) => {
  try {
    const response = await vtuPassConfig.vtuPassPurchaseApi.post('/api/pay', payload);
    return response;
  } catch (error) {
    console.error("Error buying electricity:", error.response ? error.response.data : error.message);
    throw error;
  }
},


// Confirm the real status of a transaction using the request_id you sent.
requery: async (payload) => {
  try {
    const response = await vtuPassConfig.vtuPassPurchaseApi.post('/api/requery', payload);
    return response;
  } catch (error) {
    console.error("Error requerying transaction:", error.response ? error.response.data : error.message);
    throw error;
  }
}


}

module.exports = vtuPassService;

// const vtuPassConfig = require('../config/vtupass.config');
// const dotenv = require('dotenv');
// dotenv.config();


// const vtuPassService = {
// //check your balance
// checkBalance: async () => {
//   try{
//       const response = await vtuPassConfig.vtuPassApi.get('/api/balance');
//       return response;
//   }catch (error) {

//     console.error("Error buying airtime:", error.response ? error.response.data : error.message);
//     throw error; // let the controller's catch block handle it
//   }
// },


// buyAirtime: async (payload) => {
//   try {
//     const response = await vtuPassConfig.vtuPassPurchaseApi.post('/api/pay', payload);
//     return response;
//   } catch (error) {
//     console.error("Error buying airtime:", error.response ? error.response.data : error.message);
//     throw error; // let the controller's catch block handle it
//   }
// }


// }

// module.exports = vtuPassService;