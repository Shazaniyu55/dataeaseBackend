const axios  = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const DUFFLE_API_URL = "https://api.duffel.com";


const duffleConfig = {
     duffleApi: axios.create({
        baseURL: DUFFLE_API_URL,
        headers: {
            "Authorization": `Bearer ${process.env.DUFFLE_TOKEN}`,
            "Content-Type": "application/json",
    "Accept": "application/json",
    "Duffel-Version": "v2"

        },
        timeout: 130000
}),

}

module.exports = duffleConfig;