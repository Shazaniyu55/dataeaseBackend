const axios  = require('axios');
const dotenv = require('dotenv');
dotenv.config();


const reloadlyConfig = {
     reloadlyApi: axios.create({
  baseURL: "https://auth.reloadly.com",
  headers: {
    "Content-Type": "application/json",
  },
}),


 reloadlyGiftApi: axios.create({
  baseURL: "https://giftcards-sandbox.reloadly.com",
  headers: {
    "Content-Type": "application/json",
  },
}),



 reloadlyAirtime: axios.create({
  baseURL: "https://giftcards-sandbox.reloadly.com",
  headers: {
    "Content-Type": "application/json",
  },
})

}

module.exports = reloadlyConfig;