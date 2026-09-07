const User = require("../model/usermodel");
const {Document} = require("mongoose");
const Reseller = require("../model/RegisterVendorModel");

const userService = {
    async createUser(data) {
        const user = new User(data);
        return await user.save();
      },

      async getUserByEmail(email) {
        return await User.findOne({ email });
      },
      async checkOtpExists(otp) {
        const user = await User.findOne({ otp });
        return !!user;
      },


      async getUserByOtp(otp) {
          return await User.findOne({ otp });
       },

         async updateUser(id, data) {
        return await User.findByIdAndUpdate(id, data, { new: true });
  },

    async getUserById(id) {
    return await User.findById(id).select("+password");
  },

    // Fetches the user WITH the hidden mfaOtp field for login verification
    async getUserByEmailWithMfaOtp(email) {
    return await User.findOne({ email }).select("+mfaOtp +password");
  },

  async searchUsersService  (query) {
  try {
    if (!query) {
      throw new Error("Search query is required");
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },   // search by name
        { email: { $regex: query, $options: "i" } },  // search by email
      ],
    })
    .select("-password") // remove sensitive data
    .limit(20); // prevent overload

    return users;
  } catch (error) {
    throw error;
  }
},


    /* ===============================
     Vendor MANAGEMENT
  ================================= */

   async createVendor(data) {
        const vendor = new Reseller(data);
        return await vendor.save();
      },

   async getAllVendors() {
    return await Reseller.find().select("-kyc");
  },

   async getVendorByEmail(email) {
        return await Reseller.findOne({ email });
      },

  
    
      
}



module.exports = userService;

// const User = require("../model/usermodel");
// const {Document} = require("mongoose");
// const Reseller = require("../model/RegisterVendorModel");

// const userService = {
//     async createUser(data) {
//         const user = new User(data);
//         return await user.save();
//       },

//       async getUserByEmail(email) {
//         return await User.findOne({ email });
//       },
//       async checkOtpExists(otp) {
//         const user = await User.findOne({ otp });
//         return !!user;
//       },


//       async getUserByOtp(otp) {
//           return await User.findOne({ otp });
//        },

//          async updateUser(id, data) {
//         return await User.findByIdAndUpdate(id, data, { new: true });
//   },

//     async getUserById(id) {
//     return await User.findById(id).select("+password");
//   },

//   async searchUsersService  (query) {
//   try {
//     if (!query) {
//       throw new Error("Search query is required");
//     }

//     const users = await User.find({
//       $or: [
//         { name: { $regex: query, $options: "i" } },   // search by name
//         { email: { $regex: query, $options: "i" } },  // search by email
//       ],
//     })
//     .select("-password") // remove sensitive data
//     .limit(20); // prevent overload

//     return users;
//   } catch (error) {
//     throw error;
//   }
// },


//     /* ===============================
//      Vendor MANAGEMENT
//   ================================= */

//    async createVendor(data) {
//         const vendor = new Reseller(data);
//         return await vendor.save();
//       },

//    async getAllVendors() {
//     return await Reseller.find().select("-kyc");
//   },

//    async getVendorByEmail(email) {
//         return await Reseller.findOne({ email });
//       },

  
    
      
// }



// module.exports = userService;