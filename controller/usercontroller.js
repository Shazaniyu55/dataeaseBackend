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
const User= require("../model/usermodel");
const {sendForgotPasswordEmail} = require("../utils/emailserivce")
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();



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
},

signupAffiliates: async (req, res) => {
  try{
  const {fullname, phoneNumber, country, accountNumber, accountName, accountBank, email, password, package, referralToken} = req.body;

  // Validate input data here (you can use a validation library like Joi or Zod)
  const existingUser = await userService.getUserByEmail(email);

  if (existingUser) {
      return res.status(400).json({ status: "failed", message: "Email already exists" });
  }

  const hashedPassword = await hashPassword(password);
  
  const createUser= async(imageUrl, referedBy) =>{

    const newUser = new User({
      fullName: fullname,
      email: email,
      password: hashedPassword,
      phoneNumber: phoneNumber,
      profilePic: imageUrl,
      referralToken: referralToken,
      referredBy: referedBy,
      userType: "affiliate",
    });

    await newUser.save();
    await User.updateOne(
      { _id: referredBy._id },
      {
                    $inc: { referralCount: 1 },
                    $push: {
                        referredUsers: {
                            _id: newUser._id,
                            fullname: newUser.fullname,
                            email: newUser.email,
                            image: newUser.image,
                            referredUsers:[]
                        }
                    }
                }
    
    );

    const updateUpline = async(user)=>{
      if(user.referredBy){ if (user.referredBy) {
                    const referrer = await User.findById(user.referredBy._id);
                    if (referrer) {
                        await User.updateOne(
                            { _id: referrer._id },
                            {
                                $push: {
                                    referredUsers: {
                                        _id: newUser._id,
                                        fullname: newUser.fullname,
                                        email: newUser.email,
                                        image: newUser.image,
                                        referredUsers: []
                                    }
                                }
                            }
                        );
                        await updateUpline(referrer); // Recursively update the next referrer
                    }
                }
    }

    
  }
  await updateUpline(referedBy);
  successResponse(res, { user: newUser }, "Affiliate user registered successfully", STATUSCODES.CREATED);
}

// Find user with the provided referral token
        const referredBy = await User.findOne({
            referralToken: referralToken,
        }).select('fullname email image');

        if (!referredBy) {
            return res.status(400).json({ status: 'Failed', message: 'Invalid or expired referral token.' });
        }

         // Store the referral token in the session if it's valid
         if (referredBy) {
            // req.session.referralToken = referralToken; // Store in jwt instead of session
        }

        // Handle image upload and user creation
        const imageURL = "";
        await createUser(imageURL, referredBy);
  

  
  
  
  }catch(error){
    return res.status(400).json({ status: "failed", message: error.message });
  }
},


 generateReferralIdToken: async(req, res)=>{
    const {userId} = req.body;
    try {
         // Validate userId
         if (!userId) {
            return res.status(400).json({ status: 'Failed', message: 'User ID is required.' });
        }
         // Generate a unique referral token
         const referralToken = crypto.randomBytes(16).toString('hex'); // 32 characters long token
         const referralTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 1 day expiry

         const user = await User.findByIdAndUpdate(
             userId,
             { referralToken: referralToken, referralTokenExpiry: referralTokenExpiry },
            
         );
         await user.save();

         successResponse(res, { referralToken }, "Referral token generated successfully", STATUSCODES.SUCCESS);
         
    } catch (error) {
        console.error('Error generating referral token:', error);
        res.status(500).json({ status: 'Failed', message: error.message });
    }
},


 requestPasswordReset: async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ status: "Failed", message: "Email does not exist in our records." });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Save the reset token and its expiry date in the user record
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
        await user.save();


        // Send password reset email

        const resetUrl = `http://localhost:3500/reset-password?token=${resetToken}`;
        
        sendForgotPasswordEmail(user.email, resetUrl);
        res.status(200).json({ status: "Success", message: "Password reset email sent successfully Check Your Mail." });


    } catch (error) {
        console.error("Error sending password reset email:", error);
        res.status(500).json({ status: "Failed", message: error.message });
    }
},

 resetPassword: async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // Find the user by reset token
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() } // Check if token is expired
        });

        if (!user) {
            return res.status(400).json({ status: "Failed", message: "Invalid or expired token." });
        }

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);

        // Update user password and clear reset token
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        successResponse(res, null, "Password reset successful. You can now log in with your new password.", STATUSCODES.SUCCESS); 

    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ status: "Failed", message: error.message });
    }
},

getUser: async (req, res) => {

  try{

    const {userId} = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ status: "Failed", message: "User not found." });
    }

    successResponse(res, user, "User retrieved successfully", STATUSCODES.SUCCESS);

  }catch(error){
    return res.status(400).json({ status: "failed", message: error.message });
}

 
}

}


module.exports = authController;