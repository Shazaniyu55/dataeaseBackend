const userService = require("../services/userservice");
const {registerUserSchema, loginSchema} = require("../validations/authvalidation");
const {hashPassword, comparePasswords} = require("../utils/bcrypt");
const {generateOtp} = require("../utils/generateOtp");
const {sendOtpEmail} = require("../utils/emailserivce");
const STATUSCODES = require('../constant/statuscode');
const NotificationService = require("../services/notificationservice");
const successResponse = require("../utils/successresponse");




const authController = {

  register: async (req, res)=>{
        const {fullName, email, password, phoneNumber, userType} = req.body;

        

        const result = registerUserSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }
        const existingUser = await userService.getUserByEmail(email);

        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }
        
        const hashed = await hashPassword(password);

        const { otp, otpExpiresAt } = await generateOtp();
        await sendOtpEmail(email, otp);

        const user = await userService.createUser({
            fullName,
            email: email,
            password: hashed,
            phoneNumber:phoneNumber,
            otp,
            otpExpiresAt,
            userType: userType
        });


        if (!user) {
            return res.status(500).json({ message: "User registration failed" });
        }else{

          successResponse(res, user, "User registered successfully. Please check your email for the OTP to verify your account.", STATUSCODES.CREATED);

        }

        




  },

  verifyOtp: async (req, res) => {
    
     const { email, otp } = req.body;
  
    let user;
    let proof = [];

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    if(email){
      const lowerCaseEmail = email.toLowerCase();
        user = await userService.getUserByEmail(lowerCaseEmail);

    }

    if (!user) {
      const users = await userService.getUserByOtp(otp);
      if (!users.length) {
        return res.status(404).json({ message: "User not found" });
      }

      user = findMostSimilarUser(users, otp);
    }

    if(!user) {
      return res.status(404).json({ message: "User not found" });
    }

      if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(404).json({status: "failed", message:"OTP has expired."});
    }

    if (user.otp !== otp) {
      return res.status(404).json({status: "failed", message:"Invalid OTP."});
    }

    const updateOtp = await userService.updateUser(user._id, {
      otp: undefined,
      otpExpiresAt: undefined,
      isVerified: true,
    });

        const userResponse = {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      otp: updateOtp.otp,
      otpExpiresAt: updateOtp.otpExpiresAt,
      isVerified: updateOtp.isVerified,
      joined_date: user.joined_date,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

       res.redirect('/login')
    // if(user.userType === "House Owners"){
    //     res.render('house_owner_dash/dashboard',{user, proof})
    //     //console.log("welcome house owner")
    // }else if(user.userType === "Users"){
    //   res.render('dashboard/dashboard', {user, proof})
    //   //console.log("welcome users")
    // }else{
    //   console.log("falsify")
    // }



  },

 login: async (req, res) => {
  const { email, password } = req.body;
  console.log("Email:", email, "Password:", password);

  let proof = [];

  if (!email || !password) {
    return res.status(400).json({ status: "failed", message: "Email and password are required" });
  }

  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ status: "failed", message: "Invalid input data" });
  }

  const user = await userService.getUserByEmail(email); // <-- Add await

  if (!user) {
    return res.status(404).json({ status: "failed", message: "User with this email does not exist" });
  }

  // const isPasswordValid = await comparePasswords(password, user.password);
  // if (!isPasswordValid) {
  //   return res.status(401).json({ status: "failed", message: "Invalid password" });
  // }

  const userResponse = {
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    phoneNumber: user.phoneNumber,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  // Render based on userType
  if (user.userType === "House Owners") {
    return res.render("house_owner_dash/dashboard", { user: userResponse, proof });
  } else if (user.userType === "Users") {
    return res.render("dashboard/dashboard", { user: userResponse, proof });
  } else {
    console.log("Invalid userType:", user.userType);
    return res.status(400).json({ status: "failed", message: "Unknown user type" });
  }
},


  getUserProfile: async (req, res) => {
    const userId = req.body;
    const user = await userService.getUserById(userId);


  },


 
}



module.exports = authController;