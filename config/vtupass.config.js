const axios  = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const VTUPASS_API_URL = "https://sandbox.vtpass.com";


const vtuPassConfig = {
     vtuPassApi: axios.create({
        baseURL: VTUPASS_API_URL,
        headers: {
            "Content-Type": "application/json",
            "api-key": process.env.VTU_PASS_API,
            "public-key": process.env.VTU_PASS_PUBLIC,
        },
}),

    vtuPassPurchaseApi: axios.create({
        baseURL: VTUPASS_API_URL,
        headers: {
            "Content-Type": "application/json",
            "api-key": process.env.VTU_PASS_API,
            "secret-key": process.env.VTU_PASS_SECRET,
        },
}),




}

module.exports = vtuPassConfig;