const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Toggle with an env var so you can flip environments without touching code.
// Set VTPASS_ENV=live in your production .env / hosting dashboard;
// leave it unset (or "sandbox") everywhere else.
const IS_LIVE = process.env.VTPASS_ENV === "live";

const VTUPASS_API_URL = IS_LIVE
  ? "https://vtpass.com"
  : "https://sandbox.vtpass.com";

// Live and sandbox use *separate* key pairs generated from separate
// VTpass profile pages — a sandbox key will not work against the live
// URL and vice versa. Grab the live ones from your live VTpass profile
// (API Keys tab) and set them as VTPASS_LIVE_API / VTPASS_LIVE_PUBLIC /
// VTPASS_LIVE_SECRET alongside your existing sandbox env vars.
const API_KEY = IS_LIVE ? process.env.VTPASS_LIVE_API : process.env.VTU_PASS_API;
const PUBLIC_KEY = IS_LIVE ? process.env.VTPASS_LIVE_PUBLIC : process.env.VTU_PASS_PUBLIC;
const SECRET_KEY = IS_LIVE ? process.env.VTPASS_LIVE_SECRET : process.env.VTU_PASS_SECRET;

if (!API_KEY || !SECRET_KEY) {
  console.warn(
    `[vtupass.config] Missing VTpass ${IS_LIVE ? "LIVE" : "sandbox"} API/secret key — requests will fail with 401.`
  );
}

const vtuPassConfig = {
  vtuPassApi: axios.create({
    baseURL: VTUPASS_API_URL,
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY,
      "public-key": PUBLIC_KEY,
    },
  }),

  vtuPassPurchaseApi: axios.create({
    baseURL: VTUPASS_API_URL,
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY,
      "secret-key": SECRET_KEY,
    },
  }),

  isLive: IS_LIVE,
};

module.exports = vtuPassConfig;

// const axios  = require('axios');
// const dotenv = require('dotenv');
// dotenv.config();

// const VTUPASS_API_URL = "https://sandbox.vtpass.com";


// const vtuPassConfig = {
//      vtuPassApi: axios.create({
//         baseURL: VTUPASS_API_URL,
//         headers: {
//             "Content-Type": "application/json",
//             "api-key": process.env.VTU_PASS_API,
//             "public-key": process.env.VTU_PASS_PUBLIC,
//         },
// }),

//     vtuPassPurchaseApi: axios.create({
//         baseURL: VTUPASS_API_URL,
//         headers: {
//             "Content-Type": "application/json",
//             "api-key": process.env.VTU_PASS_API,
//             "secret-key": process.env.VTU_PASS_SECRET,
//         },
// }),




// }

// module.exports = vtuPassConfig;