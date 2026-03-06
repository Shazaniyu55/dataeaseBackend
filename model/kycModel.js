const mongoose = require("mongoose");
const { Schema } = mongoose;

const KycSchema = new Schema(
  {
  
 userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
   
    idFront: {
      type: String,
    },
    idBack: {
      type: String,
    },
    selfie: {
      type: String,
    },

  },
  { timestamps: true }
);

const Kyc = mongoose.model("Kyc", KycSchema);
module.exports = Kyc;
