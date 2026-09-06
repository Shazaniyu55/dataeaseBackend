const {z} = require("zod");

 const registerUserSchema = z.object({
   fullName: z.string({ message: "First name is required" }),
   userType:z.string({ message: "usertype is required" }),
    phoneNumber: z.string({ message: "Phone number is required" }),
    email: z
      .string({ message: "Email is required" })
      .email({ message: "Invalid email" }),
    password: z
      .string({ message: "Password must be at least 6 characters long" })
      .min(6),
  });
  
 const loginSchema = z.object({
    email: z
      .string({ message: "Email is required" })
      .email({ message: "Invalid email" }),
    password: z
      .string({ message: "Password must be at least 6 characters long" })
      .min(6),
  });

  const fundWalletSchema = z.object({
  amount: z
    .string({
      message: "Amount is required"
    }),

  bankName: z
    .string({
      required_error: "Bank name is required",
    })
    .min(2, "Bank name must be at least 2 characters"),

  senderName: z
    .string({
      required_error: "Sender name is required",
    })
    .min(2, "Sender name must be at least 2 characters"),

  narration: z
    .string()
    .max(200, "Narration must not exceed 200 characters")
    .optional(),
});


const verifyOtpSchema = z.object({
  email: z
    .string({
      required_error: "Email is required",
    })
    .email("Invalid email address"),

  otp: z
    .string({
      required_error: "OTP is required",
    })
    .regex(/^\d{5}$/, "OTP must be exactly 5 digits"),
});


const vendorSchema = z.object({
  //  AUTH
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email"),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),

  //  PROFILE
  fullName: z
    .string({ required_error: "Full name is required" })
    .min(2),

  phoneNumber: z
    .string({ required_error: "Phone number is required" })
    .min(10, "Invalid phone number"),

  profilePic: z.string().url("Profile pic must be a valid URL").optional(),
  bio: z.string().optional(),
  location: z.string().optional(),

  // BUSINESS INFO
  businessName: z
    .string({ required_error: "Business name is required" }),

  businessType: z.enum(["individual", "company"], {
    errorMap: () => ({ message: "Business type must be individual or company" }),
  }),

  businessAddress: z
    .string({ required_error: "Business address is required" }),

  // KYC (INSIDE SAME SCHEMA)
  kyc: z
    .object({
      idType: z.enum(["NIN", "BVN", "Passport"], {
        errorMap: () => ({ message: "Valid ID type is required" }),
      }),
      idNumber: z.string().min(5, "ID number is required"),
      idImage: z.string().url("ID image must be a valid URL"),
      selfieWithId: z.string().url("Selfie image must be a valid URL"),

      status: z
        .enum(["pending", "approved", "rejected"])
        .default("pending")
        .optional(),

      rejectionReason: z.string().optional(),
      verifiedAt: z.date().optional(),
    })
    .optional(), //  can still submit later

  //  SYSTEM (backend-controlled mostly)
  userType: z.string().default("Reseller"),

  isVerified: z.boolean().optional(),
  isApproved: z.boolean().optional(),

  status: z
    .enum(["active", "suspended", "blocked"])
    .default("active")
    .optional(),

  walletBalance: z.number().optional(),

  //  OTP (optional)
  otp: z.string().optional(),
  otpExpiresAt: z.date().optional(),
});
  

  module.exports = {registerUserSchema, loginSchema, fundWalletSchema, verifyOtpSchema, vendorSchema};