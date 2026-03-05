const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Define the admin schema
const adminSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true, // Ensure no leading/trailing spaces
    },
    email: {
        type: String,
        required: true,
        unique: true, // Ensure email uniqueness
        trim: true,
        lowercase: true, // Convert email to lowercase
    },
    proofPayment:{
        url: { type: String }, // Changed to an object with a url field
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    password: {
        type: String,
        required: true,
        minlength: 6, // Ensure password is at least 6 characters
    },
    isAdmin: {
        type: Boolean,
        required: true,
        default: false, // Default to false, can be set explicitly
    },
}, {
    timestamps: true,
});

// Hash password before saving
// adminSchema.pre('save', async function (next) {
//     if (this.isModified('password') || this.isNew) {
//         try {
//             this.password = await bcrypt.hash(this.password, 10);
//             next();
//         } catch (err) {
//             next(err);
//         }
//     } else {
//         next();
//     }
// });

// // Method to compare hashed passwords
// adminSchema.methods.comparePassword = function (candidatePassword) {
//     return bcrypt.compare(candidatePassword, this.password);
// };

// Method to generate JWT
// adminSchema.methods.generateAuthToken = function () {
//     return jwt.sign(
//         { id: this._id, email: this.email },
//         process.env.JWT_SECRET || "Adain", // Use environment variable for secret
//         { expiresIn: '1h' }
//     );
// };

// Export the model
module.exports = mongoose.model('Admin', adminSchema);
