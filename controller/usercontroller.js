const userService = require("../services/userservice");
const {registerUserSchema, loginSchema} = require("../validations/authvalidation");
const {hashPassword, comparePasswords} = require("../utils/bcrypt");
const {generateOtp} = require("../utils/generateOtp");
const {sendOtpEmail} = require("../utils/emailserivce");
const STATUSCODES = require('../constant/statuscode');
const successResponse = require("../utils/successresponse");
const {jwtSign} = require('../utils/jwts');
const fundingService = require("../services/fundingService");
const User= require("../model/usermodel");
const {sendForgotPasswordEmail} = require("../utils/emailserivce")
const crypto = require("crypto");
const dotenv = require("dotenv");
const vtuService = require("../services/vtuService");
const {calculateAirtimePricing, calculateElectricPricing, calculateDataPricing} =  require("../utils/calculateProfit");
const Wallet = require("../model/walletmodel");

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

           return res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email for OTP.",
      data: {
        token,
        user,
      },
    });
          

          //successResponse(res, {token, user}, "User registered successfully. Please check your email for the OTP to verify your account.", STATUSCODES.CREATED);

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

 
},


buyAirtime: async (req, res) => {
  try {
    const {request_id, phone, amount, service_id } = req.body;
    const userId = req.user.userId; // Assuming user ID is available in req.user from auth middleware

    if (!request_id || !phone || !amount || !service_id) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ status: "failed", message: "Amount must be a positive number" });
    }

    if (amount < 50) {
  return res.status(400).json({ status: "failed", message: "Minimum amount is ₦50" });
}

    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }
    //calculate pricing
    const pricing   = calculateAirtimePricing(service_id, amount);
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ status: "failed", message: "Wallet not found" });
    }

    if (wallet.balance < pricing.sellingPrice) {
      return res.status(400).json({ status: "failed", message: "Insufficient balance" });
    }

   

    await wallet.save();

    const payload = {
      phone,
      amount,
      service_id,
      request_id
    };

    const response = await vtuService.purchaseAirtime(payload);
    const transaction = wallet.transactions.find(
      (t) => t.reference === request_id
    );
    //console.log("VTU Airtime Purchase Response:", response);

    if (response.code === "success") {
      // transaction.status = "success";
      wallet.balance -= pricing.sellingPrice;
    wallet.transactions.push({
      reference: request_id,
      type: "airtime",
      network: service_id,
      phoneOrAccount: phone,
      amount: amount,
      costPrice: pricing.costPrice,
      sellingPrice: pricing.sellingPrice,
      profit: pricing.profit,
      status: "success"
    });
      await wallet.save();
      successResponse(res, response.data, "Airtime purchase successful", STATUSCODES.SUCCESS);
    } else {
      wallet.balance += pricing.sellingPrice;
      transaction.status = "failed";

      await wallet.save();
      res.status(400).json({ status: "failed", message: response.message });
    }
  } catch (error) {
    console.error("Error purchasing airtime:", error);
    res.status(500).json({ status: "failed", message: error.message });
  } 

},


getDataVariations: async (req, res) => {
  try {
    const { service_id } = req.query;

    const response = await vtuService.DataVariations(service_id);
    //console.log("VTU Data Variations Response:", response);

    if (response.code === "success") {
      successResponse(res, response.data, "Data variations retrieved successfully", STATUSCODES.SUCCESS);
    } else {
      res.status(400).json({ status: "failed", message: response.message });
    }
  } catch (error) {
    console.error("Error retrieving data variations:", error);
    res.status(500).json({ status: "failed", message: error.message });
  }

},

getUserWalletBalance: async (req, res) => {
  try {
    const userId = req.user.userId; // Assuming user ID is available in req.user from auth middleware
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ status: "failed", message: "Wallet not found" });
    }

    successResponse(res, { balance: wallet.balance }, "Wallet balance retrieved successfully", STATUSCODES.SUCCESS);
  } catch (error) {
    console.error("Error retrieving wallet balance:", error);
    res.status(500).json({ status: "failed", message: error.message });
  } 


},




buyData: async (req, res) => {
  try {
    const { request_id, phone, amount, service_id } = req.body;
    const userId = req.user.userId;

    // -------------------------------
    // 1. Validation
    // -------------------------------
    if (!request_id || !phone || !amount || !service_id) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ status: "failed", message: "Amount must be a positive number" });
    }

    // -------------------------------
    // 2. Fetch user
    // -------------------------------
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }

    // -------------------------------
    // 3. Fetch wallet
    // -------------------------------
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ status: "failed", message: "Wallet not found" });
    }

    // -------------------------------
    // 4. Calculate pricing
    // -------------------------------
    let pricing;
    try {
      pricing = calculateDataPricing(service_id.toLowerCase(), numericAmount);
    } catch (err) {
      return res.status(400).json({ status: "failed", message: err.message });
    }

    // -------------------------------
    // 5. Check wallet balance
    // -------------------------------
    if (wallet.balance < pricing.sellingPrice) {
      return res.status(400).json({ status: "failed", message: "Insufficient balance" });
    }

    // -------------------------------
    // 6. Deduct wallet and create pending transaction
    // -------------------------------
    wallet.balance -= pricing.sellingPrice;
    wallet.transactions.push({
      reference: request_id,
      type: "data",
      network: service_id.toLowerCase(),
      phoneOrAccount: phone,
      amount: numericAmount,
      costPrice: pricing.costPrice,
      sellingPrice: pricing.sellingPrice,
      profit: pricing.profit,
      status: "pending",
    });

    await wallet.save();

    // -------------------------------
    // 7. Call VTU API
    // -------------------------------
    const payload = { request_id, phone, amount: numericAmount, service_id: service_id.toLowerCase() };
    const response = await vtuService.purchaseData(payload);

    const transaction = wallet.transactions.find(t => t.reference === request_id);

    if (!transaction) {
      throw new Error("Transaction not found after creation");
    }

    // -------------------------------
    // 8. Handle VTU response
    // -------------------------------
    if (response.code === "success") {
      transaction.status = "success";
      await wallet.save();
      return successResponse(res, response.data, "Data purchase successful", STATUSCODES.SUCCESS);
    } else {
      // Rollback wallet balance if VTU fails
      wallet.balance += pricing.sellingPrice;
      transaction.status = "failed";
      await wallet.save();

      return res.status(400).json({ status: "failed", message: response.message || "VTU purchase failed" });
    }

  } catch (error) {
    console.error("Error purchasing data:", error);
    return res.status(500).json({ status: "failed", message: error.message || "Internal server error" });
  }
},


verifyelectricCustomer: async (req, res) => {
  try {
    const {customer_id, variation_id, service_id } = req.body;
    const userId = req.user.userId; // Assuming user ID is available in req.user from auth middleware

    if (!customer_id || !variation_id  || !service_id) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }
    


    const payload = {
      variation_id,
      service_id,
      customer_id
    };

    const response = await vtuService.verifycustomerElectricity(payload);
    
    if (response.code === "success") {
     
      successResponse(res, response.data, "customer verified successful", STATUSCODES.SUCCESS);
    } else {
     
      res.status(400).json({ status: "failed", message: response.message });
    }
  } catch (error) {
    console.error("Error purchasing airtime:", error);
    res.status(500).json({ status: "failed", message: error.message });
  } 

},

verifybettingCustomer: async (req, res) => {
  try {
    const {customer_id, service_id } = req.body;
    const userId = req.user.userId; // Assuming user ID is available in req.user from auth middleware

    if (!customer_id   || !service_id) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }
    


    const payload = {
      service_id,
      customer_id
    };

    const response = await vtuService.verifybetting(payload);
    
    if (response.code === "success") {
     
      successResponse(res, response.data, "customer verified successful", STATUSCODES.SUCCESS);
    } else {
     
      res.status(400).json({ status: "failed", message: response.message });
    }
  } catch (error) {
    console.error("Error purchasing airtime:", error);
    res.status(500).json({ status: "failed", message: error.message });
  } 

},

verifycableCustomer: async (req, res) => {
  try {
    const {customer_id, service_id } = req.body;
    const userId = req.user.userId; // Assuming user ID is available in req.user from auth middleware

    if (!customer_id   || !service_id) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }
    


    const payload = {
      service_id,
      customer_id
    };

    const response = await vtuService.verifycable(payload);
    
    if (response.code === "success") {
     
      successResponse(res, response.data, "customer verified successful", STATUSCODES.SUCCESS);
    } else {
     
      res.status(400).json({ status: "failed", message: response.message });
    }
  } catch (error) {
    console.error("Error purchasing airtime:", error);
    res.status(500).json({ status: "failed", message: error.message });
  } 

},

buyElectricity: async (req, res) => {
  try {
    const {request_id, customer_id, variation_id, amount, service_id } = req.body;
    const userId = req.user.userId; // Assuming user ID is available in req.user from auth middleware

    if (!request_id || !customer_id || !amount  || !service_id || !variation_id) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ status: "failed", message: "Amount must be a positive number" });
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }
    //calculate pricing
    const pricing   = calculateElectricPricing(service_id, amount);
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ status: "failed", message: "Wallet not found" });
    }

    if (wallet.balance < pricing.sellingPrice) {
      return res.status(400).json({ status: "failed", message: "Insufficient balance" });
    }

    wallet.balance -= pricing.sellingPrice;

    wallet.transactions.push({
      reference: request_id,
      type: "electricity",
      network: service_id,
      phoneOrAccount: customer_id,
      amount: amount,
      costPrice: pricing.costPrice,
      sellingPrice: pricing.sellingPrice,
      profit: pricing.profit,
      status: "pending"
    });

    await wallet.save();

    const payload = {
      phone,
      amount,
      service_id,
      request_id
    };

    const response = await vtuService.purchaseElectricity(payload);
    const transaction = wallet.transactions.find(
      (t) => t.reference === request_id
    );
    //console.log("VTU Airtime Purchase Response:", response);

    if (response.code === "success") {
      transaction.status = "success";
      await wallet.save();
      successResponse(res, response.data, "Airtime purchase successful", STATUSCODES.SUCCESS);
    } else {
      wallet.balance += pricing.sellingPrice;
      transaction.status = "failed";

      await wallet.save();
      res.status(400).json({ status: "failed", message: response.message });
    }
  } catch (error) {
    console.error("Error purchasing airtime:", error);
    res.status(500).json({ status: "failed", message: error.message });
  } 

},

getUserTransactions: async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(400).json({ status: "failed", message: "userId is required" });
    }

    // Check if user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ status: "failed", message: "Wallet not found" });
    }

    // Return the transactions
    return res.status(200).json({
      status: "success",
      message: "User transactions retrieved successfully",
      data: wallet.transactions || [],
    });

  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return res.status(500).json({ status: "failed", message: "Internal server error" });
  }
}


}


module.exports = authController;