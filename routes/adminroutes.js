const express= require("express");
const AdminController = require("../controller/admincontroller");
const {errorHandler} = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");
const adminRouter = express.Router();


adminRouter.post('/register', errorHandler(AdminController.createAdmin));
adminRouter.post('/login', errorHandler(AdminController.loginAdmin));
adminRouter.get('/users', errorHandler(AdminController.getAllUsers));
adminRouter.delete('/delete/users/:userId', errorHandler(AdminController.deleteUsers));
adminRouter.get('/dashboard-stats', errorHandler(AdminController.getDashboard));
adminRouter.get('/revenue-stats', errorHandler(AdminController.getRevenue));

adminRouter.get('/users/:id', errorHandler(AdminController.getUsersById));


module.exports = adminRouter;
