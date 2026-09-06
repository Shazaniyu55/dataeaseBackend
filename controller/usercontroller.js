const userService = require("../services/userservice");
const {registerUserSchema, loginSchema, fundWalletSchema, verifyOtpSchema, vendorSchema} = require("../validations/authvalidation");
const {hashPassword, comparePasswords} = require("../utils/bcrypt");
const {generateOtp} = require("../utils/generateOtp");
const {sendOtpEmail, sendLoginNotificationEmail} = require("../utils/emailserivce");
const STATUSCODES = require('../constant/statuscode');
const successResponse = require("../utils/successresponse");
const {jwtSign} = require('../utils/jwts');
const fundingService = require("../services/fundingService");
const User= require("../model/usermodel");
const {sendForgotPasswordEmail} = require("../utils/emailserivce")
const crypto = require("crypto");
const NotificationService = require("../services/notificationservice");
const dotenv = require("dotenv");
const vtuService = require("../services/vtuService");
const {calculateAirtimePricing, calculateElectricPricing,calculateCablePricing, calculateDataPricing, calculateEpinPricing} =  require("../utils/calculateProfit");
const Wallet = require("../model/walletmodel");
const HttpException = require('../utils/httpException');
const distributeCommissions = require("./affiliatePayment")
const Activity= require("../model/activitymodel");
const {hashToken, deviceLabel} = require("../utils/helper");
const { isEmailBlocked } = require("../utils/emailblocker");


dotenv.config();


const pollAndUpdateEpins = async (userId, requestId, orderId, retries = 10, intervalMs = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, intervalMs));

      // Use your existing Requery service
      const statusResponse = await vtuService.Requery({ request_id: requestId });
      console.log(`[ePIN Poll] Attempt ${attempt} for order ${orderId}:`, statusResponse?.data?.status);

      const orderData = statusResponse?.data;
      if (!orderData) continue;

      if (orderData.status === "completed-api" && orderData.epins?.length) {
        await Wallet.findOneAndUpdate(
          { userId, "transactions.reference": requestId },
          {
            $set: {
              "transactions.$.epins":  orderData.epins,
              "transactions.$.status": "success",
            }
          }
        );
        console.log(`[ePIN Poll] Order ${orderId} completed — PINs saved.`);
        return;
      }

      if (orderData.status === "refunded") {
        // Mark transaction as refunded
        await Wallet.findOneAndUpdate(
          { userId, "transactions.reference": requestId },
          { $set: { "transactions.$.status": "refunded" } }
        );

        // Restore wallet balance
        const wallet = await Wallet.findOne({ userId });
        const txn = wallet.transactions.find(t => t.reference === requestId);
        if (txn) {
          wallet.balance += txn.sellingPrice;
          await wallet.save();
        }

        console.log(`[ePIN Poll] Order ${orderId} refunded — balance restored.`);
        return;
      }

      // Still processing — continue polling
      console.log(`[ePIN Poll] Order ${orderId} still processing, retrying...`);

    } catch (err) {
      console.error(`[ePIN Poll] Error on attempt ${attempt} for order ${orderId}:`, err.message);
    }
  }

  console.warn(`[ePIN Poll] Gave up polling order ${orderId} after ${retries} attempts.`);
};



const pollAndUpdateElectric = async (userId, requestId, orderId, pricing, retries = 20, intervalMs = 6000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, intervalMs));

      const statusResponse = await vtuService.Requery({ request_id: requestId });
      console.log(`[Electric Poll] Attempt ${attempt} for order ${orderId}:`, statusResponse?.data?.status);

      const orderData = statusResponse?.data;
      if (!orderData) continue;

      const status = orderData.status?.toLowerCase();

      //  ORDER COMPLETED
      if (status === "completed-api" || status === "completed") {
        await Wallet.findOneAndUpdate(
          { userId, "transactions.reference": requestId },
          {
            $set: {
              "transactions.$.status": "success",
              "transactions.$.token": orderData.token || null,
              "transactions.$.units": orderData.units?.toString() || null,
              "transactions.$.orderId": orderData.order_id || orderId,
              "transactions.$.electric": [
                {
                  token: orderData.token || null,
                  unit: orderData.units?.toString() || null,
                  band: orderData.band || null,
                  amount: orderData.amount?.toString() || null,
                },
              ],
            },
          }
        );
        console.log(`[Electric Poll] Order ${orderId} completed — token saved: ${orderData.token}`);
        return;
      }

      //  ORDER REFUNDED
      if (status === "refunded") {
        // Mark as refunded first
        await Wallet.findOneAndUpdate(
          { userId, "transactions.reference": requestId },
          {
            $set: {
              "transactions.$.status": "refunded",
              "transactions.$.reason": "Order refunded by provider",
            },
          }
        );

        // Restore wallet balance
        const wallet = await Wallet.findOne({ userId });
        if (wallet) {
          const txn = wallet.transactions.find(t => t.reference === requestId);
          if (txn) {
            wallet.balance += txn.sellingPrice;
            await wallet.save();
            console.log(`[Electric Poll] Order ${orderId} refunded — ₦${txn.sellingPrice} restored.`);
          }
        }
        return;
      }

      //  ORDER FAILED
      if (status === "failed") {
        await Wallet.findOneAndUpdate(
          { userId, "transactions.reference": requestId },
          {
            $set: {
              "transactions.$.status": "failed",
              "transactions.$.reason": "Order failed by provider",
            },
          }
        );

        // Restore wallet balance
        const wallet = await Wallet.findOne({ userId });
        if (wallet) {
          const txn = wallet.transactions.find(t => t.reference === requestId);
          if (txn) {
            wallet.balance += txn.sellingPrice;
            await wallet.save();
            console.log(`[Electric Poll] Order ${orderId} failed — ₦${txn.sellingPrice} restored.`);
          }
        }
        return;
      }

      console.log(`[Electric Poll] Order ${orderId} still processing (attempt ${attempt}/${retries}), retrying in ${intervalMs / 1000}s...`);

    } catch (err) {
      console.error(`[Electric Poll] Error on attempt ${attempt} for order ${orderId}:`, err.message);
    }
  }

  //  All retries exhausted — mark as pending for manual review
  console.warn(`[Electric Poll] Gave up polling order ${orderId} after ${retries} attempts. Marking as pending.`);
  await Wallet.findOneAndUpdate(
    { userId, "transactions.reference": requestId },
    {
      $set: {
        "transactions.$.status": "pending",
        "transactions.$.reason": "Polling exhausted — manual review required",
      },
    }
  );
};

const authController = {




  register: async (req, res)=>{
     const result = registerUserSchema.safeParse(req.body);
        if (!result.success) {
      throw new HttpException(
                STATUSCODES.BAD_REQUEST,
                result.error.errors?.[0]?.message
              );        
            
            }

        const {fullName, email, password, phoneNumber, userType} = result.data;

        const profilePic = req.file ? req.file.path : "https://res.cloudinary.com/damufjozr/image/upload/v1772821224/local_zdol1j.png"

          const emailCheck = await isEmailBlocked(email);
  if (emailCheck.blocked) {
    return res.status(400).json({ status: "failed", message: emailCheck.reason });
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
          


        }

        




  },

  verifyOtp: async (req, res) => {
    const result = verifyOtpSchema.safeParse(req.body);
    
    if (!result.success) {
      throw new HttpException(
                STATUSCODES.BAD_REQUEST,
                result.error.errors?.[0]?.message
              );        
            
      }
    
     const { email, otp } = result.data;
  
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

    const user = await userService.getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ status: "failed", message: "User with this email does not exist" });
    }

    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ status: "failed", message: "Invalid password" });
    }

    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    try {
    await Activity.create({
      user: user._id,
      type: "login",
      day: today,
    });
  } catch (err) {
    if (err.code === 11000) {
      //  Already logged today → ignore
      console.log("Login already recorded today");
    } else {
      console.log("Activity log failed:", err.message);
    }
  }


    //  GENERATE TOKEN
    const token = jwtSign({
      userId: user._id,
      email: user.email
    });

     await userService.updateUser(user._id, {
    activeSessionToken: hashToken(token),
    activeSessionAt:    new Date(),
    activeDevice:       deviceLabel(req),
    online:             true,
  });

  await sendLoginNotificationEmail(user.email, user.fullName);
    return successResponse(res, { token, user }, "Login successful", STATUSCODES.SUCCESS);
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
    const parsed = fundWalletSchema.safeParse(req.body);
    
    if (!parsed.success) {
    throw new HttpException(
          STATUSCODES.BAD_REQUEST,
          parsed.error.errors?.[0]?.message
        );
}
    const { amount, bankName, senderName, narration } = parsed.data;
    const userId = req.user.userId; // Assuming user ID is available in req.user from auth middleware
    //console.log("User ID from auth middleware:", userId);

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
  const {fullname, phoneNumber, email, password, package, referralToken} = req.body;

  // Validate input data here (you can use a validation library like Joi or Zod)
  const existingUser = await userService.getUserByEmail(email);


  const cleanPackage = Number(package);

  if (isNaN(cleanPackage)) {
  return res.status(400).json({
    status: "failed",
    message: "Invalid package amount"
  });
}

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
                            fullname: newUser.fullName,
                            email: newUser.email,
                            image: newUser.profilePic,
                            referredUsers:[]
                        }
                    }
                }
    
    );
await distributeCommissions(newUser._id, cleanPackage);

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
                                        fullname: newUser.fullName,
                                        email: newUser.email,
                                        image: newUser.profilePic,
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
  
 
    
  //console.log(newUser)
  const token = jwtSign({
            userId: newUser._id,
            email: newUser.email
          });

            return res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email for OTP.",
      data: {
        token,
        user: newUser,
      },
    });
  // successResponse(res, token,  newUser , "Affiliate user registered successfully", STATUSCODES.CREATED);
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
        const imageURL = "https://res.cloudinary.com/damufjozr/image/upload/v1772821224/local_zdol1j.png";
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
        //console.error('Error generating referral token:', error);
        res.status(500).json({ status: 'Failed', message: error.message });
    }
},


 requestPasswordReset: async (req, res) => {
    const { email } = req.body;
    //console.log(email)

    try {
        const user = await User.findOne({ email });
        //console.log(user)
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

        const resetUrl = `Token:${resetToken}`;
        
        sendForgotPasswordEmail(user.email, resetUrl);
        res.status(200).json({ status: "Success", message: "Password reset email sent successfully Check Your Mail." });


    } catch (error) {
        //console.error("Error sending password reset email:", error);
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
        //console.error("Error resetting password:", error);
        res.status(500).json({ status: "Failed", message: error.message });
    }
},

updateUserPassword: async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;
    

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        status: "Failed",
        message: "Old password and new password are required."
      });
    }

    const user = await userService.getUserById(userId);
    //console.log(user)

    if (!user) {
      return res.status(404).json({
        status: "Failed",
        message: "User not found."
      });
    }

    // Compare old password
    const isMatch = await comparePasswords(oldPassword, user.password);
  

    if (!isMatch) {
      return res.status(400).json({
        status: "Failed",
        message: "Old password is incorrect."
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    const updatePassword = await userService.updateUser(user._id, {
      password: hashedPassword
    });

    successResponse(
      res,
      updatePassword,
      "Password reset successful. You can now log in with your new password.",
      200
    );

  } catch (error) {
    res.status(500).json({
      status: "Failed",
      message: error.message
    });
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
    const { request_id, phone, amount, service_id } = req.body;
    const userId = req.user.userId;

    // ── 1. Input validation ────────────────────────────────────────
    if (!request_id || !phone || !amount || !service_id) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ status: "failed", message: "Amount must be a positive number" });
    }

    if (amount < 50) {
      return res.status(400).json({ status: "failed", message: "Minimum amount is ₦50" });
    }

    // ── 2. Duplicate request_id guard ──────────────────────────────
    const existingTxn = await Wallet.findOne({
      userId,
      "transactions.reference": request_id
    });

    if (existingTxn) {
      return res.status(409).json({ status: "failed", message: "Duplicate transaction reference" });
    }

    // ── 3. Calculate pricing ───────────────────────────────────────
    const pricing = calculateAirtimePricing(service_id, amount);

    // ── 4. ATOMIC balance check + deduction (fixes race condition) ─
    const wallet = await Wallet.findOneAndUpdate(
      {
        userId,
        balance: { $gte: pricing.sellingPrice } // check AND deduct atomically
      },
      {
        $inc: { balance: -pricing.sellingPrice }  // deduct before purchase
      },
      { new: true }
    );

    if (!wallet) {
      // Either wallet not found or insufficient balance
      const walletExists = await Wallet.findOne({ userId });
      if (!walletExists) {
        return res.status(404).json({ status: "failed", message: "Wallet not found" });
      }
      return res.status(400).json({ status: "failed", message: "Insufficient balance" });
    }

    // ── 5. Call VTU API (balance already safely deducted) ──────────
    let response;
    try {
      response = await vtuService.purchaseAirtime({ phone, amount, service_id, request_id });
    } catch (vtuError) {
      // VTU call itself threw — refund and bail
      await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { balance: pricing.sellingPrice } }
      );
      return res.status(500).json({ status: "failed", message: "VTU service error, balance refunded" });
    }

    // ── 6. Handle VTU response ─────────────────────────────────────
    if (response.code === "success") {
      // Push success transaction
      await Wallet.findOneAndUpdate(
        { userId },
        {
          $push: {
            transactions: {
              reference: request_id,
              type: "airtime",
              network: service_id,
              phoneOrAccount: phone,
              amount: amount,
              costPrice: pricing.costPrice,
              sellingPrice: pricing.sellingPrice,
              profit: pricing.profit,
              status: "success"
            }
          }
        }
      );

      return successResponse(res, response.data, "Airtime purchase successful", STATUSCODES.SUCCESS);

    } else {
      // VTU failed — refund the deducted amount
      await Wallet.findOneAndUpdate(
        { userId },
        {
          $inc: { balance: pricing.sellingPrice }, // refund
          $push: {
            transactions: {
              reference: request_id,
              type: "airtime",
              network: service_id,
              phoneOrAccount: phone,
              amount: amount,
              costPrice: pricing.costPrice,
              sellingPrice: pricing.sellingPrice,
              profit: pricing.profit,
              status: "failed"
            }
          }
        }
      );

      return res.status(402).json({ status: "failed", message: response.message });
    }

  } catch (error) {
    console.error("Error purchasing airtime:", error);
    res.status(500).json({ status: "failed", message: error.message });
  }
},

// buyAirtime: async (req, res) => {
//   try {
//     const {request_id, phone, amount, service_id } = req.body;
//     const userId = req.user.userId; // Assuming user ID is available in req.user from auth middleware

//     if (!request_id || !phone || !amount || !service_id) {
//       return res.status(400).json({ status: "failed", message: "All fields are required" });
//     }

//     if (isNaN(amount) || amount <= 0) {
//       return res.status(400).json({ status: "failed", message: "Amount must be a positive number" });
//     }

//     if (amount < 50) {
//   return res.status(400).json({ status: "failed", message: "Minimum amount is ₦50" });
// }

//     const user = await userService.getUserById(userId);

//     if (!user) {
//       return res.status(404).json({ status: "failed", message: "User not found" });
//     }
//     //calculate pricing
//     const pricing   = calculateAirtimePricing(service_id, amount);
//     const wallet = await Wallet.findOne({ userId });

//     if (!wallet) {
//       return res.status(404).json({ status: "failed", message: "Wallet not found" });
//     }

//     if (wallet.balance < pricing.sellingPrice) {
//       return res.status(400).json({ status: "failed", message: "Insufficient balance" });
//     }

   

//     await wallet.save();

//     const payload = {
//       phone,
//       amount,
//       service_id,
//       request_id
//     };

//     const response = await vtuService.purchaseAirtime(payload);
//     const transaction = wallet.transactions.find(
//       (t) => t.reference === request_id
//     );
//     //console.log("VTU Airtime Purchase Response:", response);

//     if (response.code === "success") {
//       // transaction.status = "success";
//       wallet.balance -= pricing.sellingPrice;
//     wallet.transactions.push({
//       reference: request_id,
//       type: "airtime",
//       network: service_id,
//       phoneOrAccount: phone,
//       amount: amount,
//       costPrice: pricing.costPrice,
//       sellingPrice: pricing.sellingPrice,
//       profit: pricing.profit,
//       status: "success"
//     });
//       await wallet.save();
//     //   await Activity.create({
//     //   user: userId,
//     //   type: "airtime",
//     //   amount: amount,
//     //   commissionEarned: amount * 0.02, // example 2%
      
//     // });
//       successResponse(res, response.data, "Airtime purchase successful", STATUSCODES.SUCCESS);
//     } else {
//       wallet.balance += pricing.sellingPrice;
//       transaction.status = "failed";

//       await wallet.save();
//       res.status(402).json({ status: "failed", message: response.message });
//     }
//   } catch (error) {
//     console.error("Error purchasing airtime:", error);
//     res.status(500).json({ status: "failed", message: error.message });
//   } 

// },


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
    //console.error("Error retrieving data variations:", error);
    res.status(500).json({ status: "failed", message: error.message });
  }

},

getCableVariations: async (req, res) => {
  try {
    const { service_id } = req.query;

    const response = await vtuService.cableVariations(service_id);
    //console.log("VTU Data Variations Response:", response);

    if (response.code === "success") {
      successResponse(res, response.data, "Data variations retrieved successfully", STATUSCODES.SUCCESS);
    } else {
      res.status(400).json({ status: "failed", message: response.message });
    }
  } catch (error) {
    //console.error("Error retrieving data variations:", error);
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
    //console.error("Error retrieving wallet balance:", error);
    res.status(500).json({ status: "failed", message: error.message });
  } 


},


buyData: async (req, res) => {
  try {
    const { request_id, phone, amount, service_id, variation_id} = req.body;
    const userId = req.user.userId;

    // -------------------------------
    // 1. Validation
    // -------------------------------
    if (!request_id || !phone || !amount || !service_id || !variation_id) {
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
    const payload = { request_id, phone, service_id: service_id.toLowerCase(), variation_id };
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
//       await Activity.create({
//   user: userId,
//   type: "data",
//   amount: numericAmount,
//   commissionEarned: numericAmount * 0.02, // example 2%
// });
      return successResponse(res, response.data, "Data purchase successful", STATUSCODES.SUCCESS);
    } else {
      // Rollback wallet balance if VTU fails
      wallet.balance += pricing.sellingPrice;
      transaction.status = "failed";
      await wallet.save();

      return res.status(402).json({ status: "failed", message: response.message || "VTU purchase failed" });
    }

  } catch (error) {
    //console.error("Error purchasing data:", error);
    return res.status(500).json({ status: "failed", message: error.message || "Internal server error" });
  }
},

buyCable: async (req, res) => {
  try {
    const { request_id, customer_id, variation_id, service_id, amount } = req.body;
    const userId = req.user.userId;

    // -------------------------------
    // 1. Validation
    // -------------------------------
    if (!request_id || !customer_id || !variation_id || !amount || !service_id) {
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
      pricing = calculateCablePricing(service_id.toLowerCase(), numericAmount);
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
      type: "cable",
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
    const response = await vtuService.purchasecable(payload);

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
      // await Activity.create({
      //   user: userId,
      //   type: "cable",
      //   amount: amount,
      //   commissionEarned: amount * 0.02, // example 2%
      // });
      return successResponse(res, response.data, "Cable purchase successful", STATUSCODES.SUCCESS);
    } else {
      // Rollback wallet balance if VTU fails
      wallet.balance += pricing.sellingPrice;
      transaction.status = "failed";
      await wallet.save();

      return res.status(400).json({ status: "failed", message: response.message || "VTU purchase failed" });
    }

  } catch (error) {
    //console.error("Error purchasing cable:", error);
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
    //console.error("Error purchasing airtime:", error);
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
    console.log("VTU Verify Betting Customer Response:", response);
    
    if (response.code === "success") {
     
      successResponse(res, response.data, "customer verified successful", STATUSCODES.SUCCESS);
    } else {
     
      res.status(400).json({ status: "failed", message: response.message });
    }
  } catch (error) {
    //console.error("Error purchasing airtime:", error);
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
    //console.error("Error purchasing airtime:", error);
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
    //console.error("Error fetching user transactions:", error);
    return res.status(500).json({ status: "failed", message: "Internal server error" });
  }
},

verifyEmailInapp: async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.userId;

    if (!email) {
      return res.status(400).json({
        status: "failed",
        message: "Email is required",
      });
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        status: "failed",
        message: "User does not exist",
      });
    }

    // Optional: ensure user email matches
    if (user.email !== email) {
      return res.status(400).json({
        status: "failed",
        message: "Email does not match logged-in user",
      });
    }

    // Generate OTP
    const { otp, otpExpiresAt } = await generateOtp();

    // Send email
    await sendOtpEmail(email, otp);

    // Save OTP to DB
    await userService.updateUser(user._id, {
      $set: {
        otp: otp,
        otpExpiresAt: otpExpiresAt,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "OTP sent to your email",
    });

  } catch (error) {
    //console.error("verifyEmailInapp error:", error);

    return res.status(500).json({
      status: "failed",
      message: "Internal server error",
    });
  }
},




// controllers/electricityController.js

buyElectricity: async (req, res) => {
  try {
    const { request_id, customer_id, variation_id, service_id, amount } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!request_id || !customer_id || !amount || !service_id || !variation_id) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    const amountNumber = Number(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({ status: "failed", message: "Amount must be a positive number" });
    }

    if (amountNumber < 1000) {
      return res.status(400).json({ status: "failed", message: "Minimum amount is ₦1000" });
    }

    // Fetch user and wallet
    const user = await userService.getUserById(userId);
    if (!user) return res.status(404).json({ status: "failed", message: "User not found" });

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ status: "failed", message: "Wallet not found" });

    wallet.balance = Number(wallet.balance);

    // Calculate pricing
    const pricing = calculateElectricPricing(service_id, amountNumber);
    if (!pricing || isNaN(pricing.sellingPrice)) {
      return res.status(400).json({ status: "failed", message: "Pricing calculation failed" });
    }

    pricing.sellingPrice = Number(pricing.sellingPrice);
    pricing.costPrice = Number(pricing.costPrice);

    if (wallet.balance < pricing.sellingPrice) {
      return res.status(400).json({ status: "failed", message: "Insufficient balance" });
    }

    const initialBalance = wallet.balance;

    // Deduct wallet & create transaction
    wallet.balance -= pricing.sellingPrice;
    const finalBalance = wallet.balance;

    await wallet.addTransaction({
      reference: request_id,
      type: "electricity",
      network: service_id,
      phoneOrAccount: customer_id,
      amount: amountNumber,
      costPrice: pricing.costPrice,
      sellingPrice: pricing.sellingPrice,
      profit: pricing.profit,
      status: "pending",
    });

    // Respond immediately
    res.status(200).json({
      code: "success",
      message: "ORDER PROCESSING",
      data: {
        order_id: null,
        status: "processing-api",
        product_name: "Electricity",
        service_name: service_id,
        customer_id,
        customer_name: user.name,
        customer_address: user.address || null,
        token: null,
        units: null,
        band: null,
        amount: amountNumber,
        amount_charged: pricing.sellingPrice.toFixed(2),
        discount: (pricing.costPrice - pricing.sellingPrice).toFixed(2),
        initial_balance: initialBalance.toFixed(2),
        final_balance: finalBalance.toFixed(2),
        request_id,
        reason: null,
      },
    });

    // ── Background processing starts here ──────────────────────────────────

    // Call VTU API
    const payload = { customer_id, service_id, variation_id, amount: amountNumber, request_id };
    const response = await vtuService.purchaseElectricity(payload);

    const apiData = response?.data || {};
    const apiMessage = response?.message || "";

    // Find the transaction
    const freshWallet = await Wallet.findOne({ userId });
    const transaction = freshWallet?.transactions.find(t => t.reference === request_id);
    if (!transaction) return;

    if (apiMessage === "ORDER COMPLETED") {
      // ✅ Completed immediately — save token directly
      await Wallet.findOneAndUpdate(
        { userId, "transactions.reference": request_id },
        {
          $set: {
            "transactions.$.status": "success",
            "transactions.$.token": apiData.token || null,
            "transactions.$.units": apiData.units?.toString() || null,
            "transactions.$.orderId": apiData.order_id || null,
            "transactions.$.electric": [
              {
                token: apiData.token || null,
                unit: apiData.units?.toString() || null,
                band: apiData.band || null,
                amount: amountNumber.toString(),
              },
            ],
          },
        }
      );
      console.log(`[Electric] Order completed immediately — token: ${apiData.token}`);

    } else if (apiMessage === "ORDER PROCESSING") {
      // ⏳ Still processing — save orderId and start polling
      await Wallet.findOneAndUpdate(
        { userId, "transactions.reference": request_id },
        {
          $set: {
            "transactions.$.status": "pending",
            "transactions.$.orderId": apiData.order_id || null,
          },
        }
      );
      console.log(`[Electric] Order still processing — starting poll for order ${apiData.order_id}`);

      // 🔁 Start polling in background (don't await)
      pollAndUpdateElectric(userId, request_id, apiData.order_id, pricing).catch(err =>
        console.error(`[Electric] Polling crashed for ${request_id}:`, err.message)
      );

    } else if (apiMessage === "ORDER REFUNDED") {
      // Refund immediately
      freshWallet.balance += pricing.sellingPrice;
      transaction.status = "refunded";
      transaction.reason = "Order refunded by provider";
      transaction.orderId = apiData.order_id || null;
      await freshWallet.save();
      console.log(`[Electric] Order refunded immediately.`);

    } else {
      // Unknown/failed — refund
      freshWallet.balance += pricing.sellingPrice;
      transaction.status = "failed";
      transaction.reason = apiMessage || "Unknown error from provider";
      await freshWallet.save();
      console.log(`[Electric] Order failed — balance restored.`);
    }

  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message || "Internal Server Error",
    });
  }
},


registerVendor: async (req, res) => {
  try {
   
    if (req.body.kyc) {
  req.body.kyc = {
    ...req.body.kyc,
    idImage: req.files?.["kyc[idImage]"]?.[0]?.path,
    selfieWithId: req.files?.["kyc[selfieWithId]"]?.[0]?.path,
  };
}

req.body.profilePic =
  req.files?.profilePic?.[0]?.path ||
  "https://res.cloudinary.com/damufjozr/image/upload/v1772821224/local_zdol1j.png";
//     console.log("BODY:", req.body);
// console.log("FILE:", req.file);
// console.log("FILES:", req.files);

    // Validate
    const result = vendorSchema.safeParse(req.body);

    if (!result.success) {
      throw new HttpException(
        STATUSCODES.BAD_REQUEST,
        result.error.errors?.[0]?.message
      );
    }

    const data = result.data;

    // Handle profile image
    data.profilePic =
      req.file?.path ||
      "https://res.cloudinary.com/damufjozr/image/upload/v1772821224/local_zdol1j.png";

    // Check existing user
    const existingNormalUser = await userService.getUserByEmail(data.email);

    const existingUser = await userService.getVendorByEmail(data.email);

    if (existingNormalUser) {
      return res.status(400).json({
        status: "failed",
        message: "Email is a  User Account",
      });
    }


    if (existingUser) {
      return res.status(400).json({
        status: "failed",
        message: "Email already exists",
      });
    }

    // Hash password
    data.password = await hashPassword(data.password);

    // OTP
    const { otp, otpExpiresAt } = await generateOtp();
    data.otp = otp;
    data.otpExpiresAt = otpExpiresAt;

    await sendOtpEmail(data.email, otp);

    // System control
    data.isApproved = false;
    data.isVerified = false;
    data.walletBalance = 0;
    data.status = "active";
    data.userType = data.userType || "Reseller";

    if (data.kyc) {
      data.kyc.status = "pending";
    }

    // Save
    const user = await userService.createVendor(data);

    const token = jwtSign({
      userId: user.id,
      email: user.email,
    });

    return res.status(201).json({
      success: true,
      message: "Vendor registered successfully. Please check your email for OTP.",
      data: {
        token,
        user,
      },
    });

  } catch (error) {
   // console.log(error)
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message,
    });
  }
},

getVendors: async (req, res) => {

  try{

    const userId = req.user.userId;


    if (!userId) {
      return res.status(404).json({ status: "Failed", message: "User not found." });
    }
    
    const user = await userService.getAllVendors();

    successResponse(res, user, "vendor retrieved successfully", STATUSCODES.SUCCESS);

  }catch(error){
    return res.status(400).json({ status: "failed", message: error.message });
}

 
},

getReferredUsers: async (req, res) => {
    try {
      const { userId } = req.params;

      // find the user and build the referral network recursively
      const user = await User.findById(userId)
        .select("fullName image email referredUsers")
        .populate({
          path: "referredUsers",
          select: "fullName email image referredUsers",
          populate: {
            path: "referredUsers",
            select: "fullName email image referredUsers",
          },
        });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Recursive function to get multi-level referrals
      const getNetwork = async (id) => {
        const u = await User.findById(id)
          .select("fullName image email referredUsers")
          .populate({
            path: "referredUsers",
            select: "fullName email image referredUsers",
            populate: {
              path: "referredUsers",
              select: "fullName email image referredUsers",
            },
          });

        if (!u) return [];

        const network = [];
        for (const ref of u.referredUsers) {
          const referrals = await getNetwork(ref._id);
          network.push({
            _id: ref._id,
            fullname: ref.fullname,
            email: ref.email,
            image: ref.image,
            referredUsers: referrals,
          });
        }
        return network;
      };

      const data = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        image: user.image,
        referredUsers: await getNetwork(userId),
      };

      //  Always send a response
      res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching referred users:", error);
      res.status(500).json({ message: "Server error" });
    }
},

deleteNotification: async (req, res)=>{
  try{
      const {notificationId} = req.params;
      // if(!userId){
      //   throw new HttpException(404, "User not authenticated");
      // }
      const deleteNotify = await NotificationService.deleteSendEmailVerificationOnce(notificationId)
      successResponse(res, deleteNotify, "messsage deleted successsfully", STATUSCODES.SUCCESS);

  }catch(error){
    console.log(error)
    res.status(500).json({})
  }
},


 updateProfilePicture: async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const userId = req.user.userId;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // OPTIONAL: Delete old profile image from Cloudinary
    // if (user.profilePic) {
    //   try {
    //     const publicId = user.profilePic.split("/").pop().split(".")[0];

    //     await cloudinary.uploader.destroy(
    //       `Rentals/profile/${publicId}`
    //     );
    //   } catch (err) {
    //     console.log("Error deleting old image:", err.message);
    //   }
    // }

    // Save new image URL
    user.profilePic = req.file.path;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: {
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
},

buyEpins: async (req, res) => {
  try {
    const { request_id, value, quantity, service_id } = req.body;
    //console.log(req.body);
    const userId = req.user.userId;

    // ── 1. Validate inputs ────────────────────────────────────────────────
    if (!request_id || !value || !quantity || !service_id) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    if (isNaN(value) || value <= 0) {
      return res.status(400).json({ status: "failed", message: "Value must be a positive number" });
    }

    if (value < 50) {
      return res.status(400).json({ status: "failed", message: "Minimum value is ₦50" });
    }

    if (!quantity || quantity < 1 || quantity > 40) {
      return res.status(400).json({ status: "failed", message: "Quantity must be between 1 and 40" });
    }

    const validNetworks = ["mtn", "airtel", "glo", "9mobile"];
    if (!validNetworks.includes(service_id.toLowerCase())) {
      return res.status(400).json({ status: "failed", message: "Invalid network provider" });
    }

    // ── 2. Fetch user & wallet ────────────────────────────────────────────
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ status: "failed", message: "Wallet not found" });
    }

    // ── 3. Calculate pricing (total cost for all PINs) ───────────────────
    // value = denomination per PIN, quantity = number of PINs
    const totalValue = value * quantity;
    const pricing = calculateAirtimePricing(service_id, totalValue);
    //const pricing = calculateEpinPricing(totalValue);

    if (wallet.balance < pricing.sellingPrice) {
      return res.status(400).json({ status: "failed", message: "Insufficient balance" });
    }

    // ── 4. Call VTU API ───────────────────────────────────────────────────
    const payload = {
      request_id,
      service_id,
      value,      // denomination per PIN (as required by the API)
      quantity,   // number of PINs
    };

    const response = await vtuService.purchaseEpin(payload);
    //console.log("VTU ePINs Response:", response);

    // ── 5. Handle response ────────────────────────────────────────────────
    if (response.code === "success") {
      //const orderData = response.data;
      const orderData = response?.data?.data ?? response?.data;
      // Deduct balance and record transaction only on success
      wallet.balance -= pricing.sellingPrice;

      wallet.transactions.push({
        reference:      request_id,
        type:           "Epins",
        network:        service_id,
        phoneOrAccount: `ePIN x${quantity}`,   // meaningful label
        amount:         totalValue,
        costPrice:      pricing.costPrice,
        sellingPrice:   pricing.sellingPrice,
        profit:         pricing.profit,
        status:         orderData.status === "completed-api" ? "success" : "processing",
        // Store the returned PINs so user can retrieve them later
        epins:          orderData.epins ?? [],
        orderId:        orderData.order_id,
      });

      await wallet.save();
       // If still processing, poll in background to fetch PINs when ready
  if (orderData.status === "processing-api") {
    pollAndUpdateEpins(userId, request_id, orderData.order_id);
  }

      return successResponse(res, orderData, "ePINs purchase successful", STATUSCODES.SUCCESS);

    } else {
      // API call reached the server but order failed — do NOT deduct balance
      wallet.transactions.push({
        reference:      request_id,
        type:           "Epins",
        network:        service_id,
        phoneOrAccount: `ePIN x${quantity}`,
        amount:         totalValue,
        costPrice:      pricing.costPrice,
        sellingPrice:   pricing.sellingPrice,
        profit:         0,
        status:         "failed",
      });

      await wallet.save();

      return res.status(402).json({ status: "failed", message: response.message });
    }

  } catch (error) {
    console.error("Error purchasing ePINs:", error);
    return res.status(500).json({ status: "failed", message: error.message });
  }
},

requeryOrder: async (req, res) => {
  try {
    const { request_id } = req.body;
    if (!request_id) {
      return res.status(400).json({ code: "missing_request_id", message: "Request ID is required" });
    }
    const response = await vtuService.Requery({ request_id });
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error requerying order:", error);
    return res.status(500).json({ code: "error", message: error.message });
  }
},


fundBettingAccount: async (req, res) => {
  try {
    const { customer_id, service_id, amount } = req.body;
    const userId = req.user.userId;

    if (!customer_id || !service_id || !amount) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    if (amount < 100) {
      return res.status(400).json({ status: "failed", message: "Minimum amount is ₦100" });
    }

    if (amount > 100000) {
      return res.status(400).json({ status: "failed", message: "Maximum amount is ₦100,000" });
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found" });
    }

    const request_id = `req_${userId}_${Date.now()}`;

    const payload = {
      request_id,
      customer_id,
      service_id,
      amount,
    };

    const response = await vtuService.fundBetting(payload);

    if (response.code === "success") {
      const { status } = response.data;

      if (status === "completed-api") {
        return successResponse(res, response.data, "Betting account funded successfully", STATUSCODES.SUCCESS);
      }

      if (status === "processing-api") {
        return successResponse(res, response.data, "Order is being processed", STATUSCODES.SUCCESS);
      }

      if (status === "refunded") {
        return successResponse(res, response.data, "Order was refunded", STATUSCODES.SUCCESS);
      }
    }

    return res.status(400).json({ status: "failed", message: response.message });

  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
},


// ─────────────────────────────────────────────────────────────────────────────
//  LOGOUT — always clear the session
// ─────────────────────────────────────────────────────────────────────────────
logout: async (req, res) => {
  const userId = req.user.userId;
 
  await userService.updateUser(userId, {
    activeSessionToken: null,
    activeSessionAt:    null,
    activeDevice:       null,
    online:             false,
  });
 
  return successResponse(res, null, "Logged out successfully", STATUSCODES.SUCCESS);
},
 


}


module.exports = authController;