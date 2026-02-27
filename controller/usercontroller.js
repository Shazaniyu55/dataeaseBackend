const userService = require("../services/userservice");
const {registerUserSchema, loginSchema} = require("../validations/authvalidation");
const {hashPassword, comparePasswords} = require("../utils/bcrypt");
const {generateOtp} = require("../utils/generateOtp");
const {sendOtpEmail} = require("../utils/emailserivce");
const STATUSCODES = require('../constant/statuscode');
const NotificationService = require("../services/notificationservice");
const successResponse = require("../utils/successresponse");
const {jwtSign} = require('../utils/jwts');
const fundingService = require("../services/fundingService");





const authController = {

  register: async (req, res)=>{
        const {fullName, email, password, phoneNumber, userType} = req.body;

        const profilePic = req.file ? req.file.path : null;

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
            profilePic:profilePic,
            password: hashed,
            phoneNumber:phoneNumber,
            otp,
            otpExpiresAt,
            userType: userType
        });


        if (!user) {
            return res.status(500).json({ message: "User registration failed" });
        }else{
          const token = jwtSign({
            userId: user.id,
            email: user.email
          });

          successResponse(res, {token, user}, "User registered successfully. Please check your email for the OTP to verify your account.", STATUSCODES.CREATED);

        }

        




  },

  verifyOtp: async (req, res) => {
    
     const { email, otp } = req.body;
  
    let user;
    

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
          $unset: {
            otp: "",
            otpExpiresAt: "",
          },
          isVerified: true,
          online: true
        });

    // const updateOtp = await userService.updateUser(user._id, {
    //   otp: undefined,
    //   otpExpiresAt: undefined,
    //   isVerified: true,
    // });

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

       return successResponse(res, userResponse, "OTP verified successfully", STATUSCODES.SUCCESS);


  },

 login: async (req, res) => {
  const { email, password } = req.body;


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


  getUserProfile: async (req, res) => {
    const userId = req.user.userId; // Assuming user ID is available in req.user from auth middleware
    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }

    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePic: user.profilePic,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return successResponse(res, userResponse, "User profile retrieved successfully", STATUSCODES.SUCCESS);
  },

  getWalletBalance: async (req, res) => {
    const userId = req.user.userId;
    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }

    

    return successResponse(res, { balance: user.walletBalance }, "Wallet balance retrieved successfully", STATUSCODES.SUCCESS);
  },

 fundWalletManual:async (req, res) => {
  try {
    const { amount, bankName, senderName, narration } = req.body;
    const userId = req.user.userId; // Assuming user ID is available in req.user from auth middleware
    console.log("User ID from auth middleware:", userId);

    const funding = await fundingService.createFundingRequest({
      userId: req.user.userId, // from auth middleware
      amount,
      bankName,
      senderName,
      narration,
    });

    res.status(201).json({
      success: true,
      message: "Funding request submitted successfully",
      data: funding,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

 
}



module.exports = authController;