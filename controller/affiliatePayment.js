// services/commissionService.js

const User = require("../model/usermodel");

// package → points
const packagePoints = {
  500: 10,
  1000: 20,
  2000: 40,
  3000: 100,

};

// tier → percentage
const referralPercentages = {
  1: { 500: 0.2, 1000: 0.2, 2000: 0.2, 3000: 0.2,},
  2: { 500: 0.05, 1000: 0.05, 2000: 0.05, 3000: 0.05 },
  3: { 500: 0.03, 1000: 0.03, 2000: 0.03, 3000: 0.03  },
  4: { 500: 0.02, 1000: 0.02, 2000: 0.02, 3000: 0.02 },
  // 5: { 2500: 0.02, 5000: 0.02, 10000: 0.02, 25000: 0.02, 50000: 0.02, 100000: 0.02, 500000: 0.02 },
  // 6: { 2500: 0.01, 5000: 0.01, 10000: 0.01, 25000: 0.01, 50000: 0.01, 100000: 0.01, 500000: 0.01 },
  // 7: { 2500: 0.01, 5000: 0.01, 10000: 0.01, 25000: 0.01, 50000: 0.01, 100000: 0.01, 500000: 0.01 },
  // 8: { 2500: 0.01, 5000: 0.01, 10000: 0.01, 25000: 0.01, 50000: 0.01, 100000: 0.01, 500000: 0.01 },
  // 9: { 2500: 0.01, 5000: 0.01, 10000: 0.01, 25000: 0.01, 50000: 0.01, 100000: 0.01, 500000: 0.01 },
  // 10:{ 2500: 0.01, 5000: 0.01, 10000: 0.01, 25000: 0.01, 50000: 0.01, 100000: 0.01, 500000: 0.01 }
};

const distributeCommissions = async (userId, packageAmount) => {
  try {
    console.log("START COMMISSION", userId, packageAmount);

    const amount = Number(packageAmount);
    const user = await User.findById(userId);

    if (!user) {
      console.log("User not found");
      return;
    }

    console.log("User found:", user._id);

    let currentUserId = user.referredBy;
    let tier = 1;

    while (currentUserId && tier <= 10) {
      console.log("Checking tier:", tier, "User:", currentUserId);

      const currentUser = await User.findById(currentUserId);

      if (!currentUser) {
        console.log("No more uplines");
        break;
      }

      const percentage = referralPercentages[tier]?.[packageAmount] || 0;
      const commission = amount * percentage;

      console.log(`Tier ${tier} commission:`, commission);

      if (commission > 0) {
        await User.updateOne(
          { _id: currentUser._id },
          {
            $inc: { commissions: commission },
            $push: {
              points: {
                packageAmount: amount,
                points: packagePoints[packageAmount] || 0
              }
            }
          }
        );
      }

      currentUserId = currentUser.referredBy;
      tier++;
    }

    console.log("COMMISSION COMPLETE");

  } catch (error) {
    console.error("Commission Error:", error);
  }
};
// const distributeCommissions = async (userId, packageAmount) => {
//   try {
//     const amount = Number(packageAmount);
//     const pointsToAdd = packagePoints[packageAmount] || 0;

//     const user = await User.findById(userId);

//     if (!user) {
//       console.log("User not found");
//       return;
//     }

//     let currentUserId = user.referredBy;
//     let tier = 1;

//     while (currentUserId && tier <= 10) {
//       const currentUser = await User.findById(currentUserId);

//       if (!currentUser) break;

//       const percentage = referralPercentages[tier]?.[packageAmount] || 0;
//       const commission = amount * percentage;

//       if (commission > 0) {
//         await User.updateOne(
//           { _id: currentUser._id },
//           {
//             $inc: { commissions: commission },
//             $push: {
//               points: {
//                 packageAmount: amount,
//                 points: pointsToAdd
//               }
//             }
//           }
//         );

//         console.log(
//           `Tier ${tier}: ${currentUser._id} earned ₦${commission}`
//         );
//       }

//       // move to next upline
//       currentUserId = currentUser.referredBy;
//       tier++;
//     }

//   } catch (error) {
//     console.error("Commission Error:", error);
//   }
// };

module.exports =  distributeCommissions ;