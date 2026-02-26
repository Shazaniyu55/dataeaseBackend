const vtuConfig = require('../config/vtu.config');
const dotenv = require('dotenv');
dotenv.config();


const vtuService = {

 generateAccessToken: async () => {
  try {
    const payload = {
      username: process.env.VTU_USERNAME,
      password: process.env.VTU_PASSWORD,
    };

    const response = await vtuConfig.vtuApi.post(
      "/jwt-auth/v1/token",
      payload
    );
    console.log("VTU Token Response:", response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("VFD Token Error:", error.response.data);
      return error.response.data;
    }
    throw error;
  }
},


getBalance: async (token) => {
  try {
    const response = await vtuConfig.vtuApi.get(
      "/api/v2/balance",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
    } catch (error) {
        if (error.response) {
            console.error("VTU Balance Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }
},

purchaseAirtime: async (token, payload) => {
  try {
    const response = await vtuConfig.vtuApi.post(
      "/api/v2/airtime",
      payload,
      {
        headers: {

            Authorization: `Bearer ${token}`,
        },
        }
    );
    return response.data;
    }
    catch (error) {
        if (error.response) {
            console.error("VTU Airtime Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},


DataVariations: async (token, payload) => {
  try {
    const response = await vtuConfig.vtuApi.get(
      "/api/v2/variations/data",
      payload,{
        headers: {

            Authorization: `Bearer ${token}`,
        },
        }
    );
    return response.data;
    }
    catch (error) {
        if (error.response) {
            console.error("VTU Data Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},

purchaseData: async (token, payload) => {
  try {
    const response = await vtuConfig.vtuApi.post(
      "/api/v2/data",
      payload,
      {
        headers: {

            Authorization: `Bearer ${token}`,
        },
        }
    );
    return response.data;
    }
    catch (error) {
        if (error.response) {
            console.error("VTU Data Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},




}

module.exports = vtuService;