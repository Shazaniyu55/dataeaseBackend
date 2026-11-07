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

flightRouter.post("/hotels/rates", killSwitchGuard('vtu'),authMiddleware, errorHandler(DuffelController.hotelRates));
flightRouter.post("/hotels/book",  killSwitchGuard('vtu'),authMiddleware, errorHandler(DuffelController.bookHotel));

module.exports = flightRouter;