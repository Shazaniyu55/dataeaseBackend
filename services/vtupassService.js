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

    console.error("Error buying airtime:", error.response ? error.response.data : error.message);
    throw error; // let the controller's catch block handle it
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
}


}

module.exports = vtuPassService;