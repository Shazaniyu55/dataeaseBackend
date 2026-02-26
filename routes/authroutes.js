const express= require("express");
const authController = require("../controller/usercontroller");
const {errorHandler} = require("../utils/errorHandle");
const {authMiddleware} = require("../middlewares/authMiddleware");

const authRouter = express.Router();



authRouter.post('/register', errorHandler(authController.register));
authRouter.post('/login', errorHandler(authController.login));


module.exports = authRouter;