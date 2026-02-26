const { jwtVerify } = require("../utils/jwts");

/**
 * Authentication middleware
 */
const authMiddleWare = async (req, res, next) => {
  const bearer = req.header("Authorization");

  if (bearer) {
    if (bearer.startsWith("Bearer ")) {
      const token = bearer.split(" ")[1];

      jwtVerify(token, (error, user) => {
        if (error) {
          if (error.name === "TokenExpiredError") {
            return res.status(401).json({
              status: 401,
              success: false,
              message: "Token has expired",
              error,
            });
          }
          return res.status(401).json({
            status: 401,
            success: false,
            message: "Invalid token",
            error,
          });
        }

        req.user = user;
        next();
      });
    } else {
      return res.status(401).json({
        status: 401,
        success: false,
        message: "Authorization type is Bearer <token>",
      });
    }
  } else {
    return res.status(403).json({
      status: 403,
      success: false,
      message: "Access denied",
    });
  }
};

module.exports = { authMiddleWare };
