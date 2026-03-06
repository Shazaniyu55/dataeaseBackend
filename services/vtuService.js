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
    //console.log("VTU Token Response:", response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      //console.error("VFD Token Error:", error.response.data);
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

purchaseAirtime: async ( payload) => {
  try {
    const tokenResponse = await vtuService.generateAccessToken();
    const token = tokenResponse.token;
    //console.log("Generated VTU Token:", token);
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
            //console.error("VTU Airtime Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},


DataVariations: async ( servieId) => {
  try {
    const tokenResponse = await vtuService.generateAccessToken();
    const token = tokenResponse.token;
    //console.log("Generated VTU Token:", token);
    const response = await vtuConfig.vtuApi.get(
      `/api/v2/variations/data?service_id=${servieId}`,
      {
        params: {
          service_id: servieId,
        },
        headers: {

            Authorization: `Bearer ${token}`,
        },
        }
    );
    return response.data;
    }
    catch (error) {
        if (error.response) {
            //console.error("VTU Data Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},

cableVariations: async ( servieId) => {
  try {
    const tokenResponse = await vtuService.generateAccessToken();
    const token = tokenResponse.token;
    //console.log("Generated VTU Token:", token);
    const response = await vtuConfig.vtuApi.get(
      `/api/v2/variations/tv?service_id=${servieId}`,
      {
        params: {
          service_id: servieId,
        },
        headers: {

            Authorization: `Bearer ${token}`,
        },
        }
    );
    return response.data;
    }
    catch (error) {
        if (error.response) {
            //console.error("VTU Data Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},

purchaseData: async ( payload) => {
  try {
    const tokenResponse =  await vtuService.generateAccessToken();
    const token = tokenResponse.token;
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
            //console.error("VTU Data Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},


purchasecable: async ( payload) => {
  try {
    const tokenResponse =  await vtuService.generateAccessToken();
    const token = tokenResponse.token;
    const response = await vtuConfig.vtuApi.post(
      "/api/v2/tv",
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
            //console.error("VTU Data Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},


verifycustomerElectricity: async ( payload) => {
  try {
    const tokenResponse =  await vtuService.generateAccessToken();
    const token = tokenResponse.token;
    const response = await vtuConfig.vtuApi.post(
      "/api/v2/verify-customer",
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


purchaseElectricity: async ( payload) => {
  try {
    const tokenResponse =  await vtuService.generateAccessToken();
    const token = tokenResponse.token;
    const response = await vtuConfig.vtuApi.post(
      "/api/v2/electricity",
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
            //console.error("Electricity Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},

verifybetting: async ( payload) => {
  try {
    const tokenResponse =  await vtuService.generateAccessToken();
    const token = tokenResponse.token;
    const response = await vtuConfig.vtuApi.post(
      "/api/v2/verify-customer",
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
            //console.error("VTU Data Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},


verifycable: async ( payload) => {
  try {
    const tokenResponse =  await vtuService.generateAccessToken();
    const token = tokenResponse.token;
    const response = await vtuConfig.vtuApi.post(
      "/api/v2/verify-customer",
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
            //console.error("VTU Data Purchase Error:", error.response.data);
            return error.response.data;
        }
        throw error;
    }



},

}

module.exports = vtuService;