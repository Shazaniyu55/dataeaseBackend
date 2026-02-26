const axios  = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const VTU_API_URL = "https://vtu.ng/wp-json";


const vtuConfig = {
     vtuApi: axios.create({
        baseURL: VTU_API_URL,
        headers: {
            "Content-Type": "application/json",
        },
}),

}

module.exports = vtuConfig;