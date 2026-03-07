const AdminService = require("../services/adminservice");
const successResponse = require("../utils/successresponse");
const HttpException = require("../utils/httpException");
const {comparePasswords, hashPassword} = require("../utils/bcrypt")
const STATUSCODES = require('../constant/statuscode');
const {jwtSign} = require('../utils/jwts');


const AdminController = {
  createAdmin: async (req, res)=>{
    try{
        const{email, password, fullname} = req.body;

        if(!email || !password || !fullname){
            throw new HttpException(404, "all fields required");
        }

        const existingUser = await AdminService.getUserByEmail(email);

        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashed = await hashPassword(password);


        const newuser = await AdminService.createAdmin({
            email,
            password: hashed,
            fullname,
            isAdmin:true
        })

                  const token = jwtSign({
                    userId: newuser.id,
                    email: newuser.email
                  });
        
                  successResponse(res, {token, newuser}, "Admin registered successfully. ", STATUSCODES.CREATED);
        
                



    }catch(error){

    }
  },

  loginAdmin: async(req, res)=>{

        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ status: "failed", message: "Email and password are required" });
          }

           const user = await AdminService.getUserByEmail(email);
            if (!user) {
               return res.status(404).json({ status: "failed", message: "User with this email does not exist" });
             }
           
             const isPasswordValid = await comparePasswords(password, user.password);
             if (!isPasswordValid) {
                 return res.status(401).json({ status: "failed", message: "Invalid password" });
               }
             
                 const userResponse = {
                   _id: user._id,
                   fullName: user.fullName,
                   username: user.username,
                   phoneNumber: user.phoneNumber,
                   email: user.email,
                   createdAt: user.createdAt,
                   updatedAt: user.updatedAt,
                 };
               
                 const token = jwtSign({
                   userId: user._id,
                   email: user.email
                 });
               
                 return successResponse(res, { token, user: userResponse }, "Login successful", STATUSCODES.SUCCESS);
    
  

                },


 getAllUsers: async (req, res) => {
  try {
    // // Optional: Ensure only admin can access
    // if (!req.user || !req.user.userId) {
    //   throw new HttpException(401, "Unauthorized access");
    // }

    const users = await AdminService.getAllUsers();

    if (!users || users.length === 0) {
      return successResponse(
        res,
        [],
        "No users found",
        STATUSCODES.SUCCESS
      );
    }

    return successResponse(
      res,
      users,
      "Users fetched successfully",
      STATUSCODES.SUCCESS
    );

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},

deleteUsers: async (req, res) => {
  try {
    const {userId} = req.params;
    // // Optional: Ensure only admin can access
    // if (!req.user || !req.user.userId) {
    //   throw new HttpException(401, "Unauthorized access");
    // }

    const users = await AdminService.deleteUser(userId);

    if (!users || users.length === 0) {
      return successResponse(
        res,
        [],
        "No users found",
        STATUSCODES.SUCCESS
      );
    }

    return successResponse(
      res,
      users,
      "Users fetched successfully",
      STATUSCODES.SUCCESS
    );

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},


getDashboard: async(req, res)=>{
  try {
    // // Optional: Ensure only admin can access
    // if (!req.user || !req.user.userId) {
    //   throw new HttpException(401, "Unauthorized access");
    // }

    const users = await AdminService.getDashboardStats();

    if (!users || users.length === 0) {
      return successResponse(
        res,
        [],
        "No users found",
        STATUSCODES.SUCCESS
      );
    }

    return successResponse(
      res,
      users,
      "Users fetched successfully",
      STATUSCODES.SUCCESS
    );

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},

getRevenue: async(req, res)=>{
  try {
    // // Optional: Ensure only admin can access
    // if (!req.user || !req.user.userId) {
    //   throw new HttpException(401, "Unauthorized access");
    // }

    const users = await AdminService.getRevenueDashboard();

    if (!users || users.length === 0) {
      return successResponse(
        res,
        [],
        "No users found",
        STATUSCODES.SUCCESS
      );
    }

    return successResponse(
      res,
      users,
      "Users fetched successfully",
      STATUSCODES.SUCCESS
    );

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},

 getUsersById: async (req, res) => {
  try {
    const {id} = req.params
    // // Optional: Ensure only admin can access
    // if (!req.user || !req.user.userId) {
    //   throw new HttpException(401, "Unauthorized access");
    // }

    const users = await AdminService.getUserById(id);

    if (!users || users.length === 0) {
      return successResponse(
        res,
        [],
        "No users found",
        STATUSCODES.SUCCESS
      );
    }

    return successResponse(
      res,
      users,
      "Users fetched successfully",
      STATUSCODES.SUCCESS
    );

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "failed",
      message: error.message || "Something went wrong",
    });
  }
},





}


module.exports = AdminController;