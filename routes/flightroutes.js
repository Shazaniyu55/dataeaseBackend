const express = require("express");
const DuffelController = require("../controller/duffleController");
const flightRouter = express.Router();
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");
const {killSwitchGuard} = require("../middlewares/killswitchmiddleware");



flightRouter.post("/search",killSwitchGuard('vtu'),authMiddleware,  errorHandler(DuffelController.searchFlights));
flightRouter.get("/offers/:offerRequestId",killSwitchGuard('vtu'),authMiddleware, errorHandler(DuffelController.getOffers));
flightRouter.post("/book", killSwitchGuard('vtu'),authMiddleware, errorHandler(DuffelController.createOrder));

flightRouter.post("/hotels/search",killSwitchGuard('vtu'),authMiddleware, errorHandler(DuffelController.searchHotel));


module.exports = flightRouter;