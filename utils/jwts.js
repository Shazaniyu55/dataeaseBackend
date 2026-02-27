const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
console.log("JWT Secret:", JWT_SECRET); // Debugging line to check if JWT_SECRET is loaded correctly

const jwtSign = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "15m",
  });
};

const jwtVerify = (token, callback) => {
  jwt.verify(token, JWT_SECRET, callback);
};

module.exports = {
  jwtSign,
  jwtVerify,
};
