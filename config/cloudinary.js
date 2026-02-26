const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const dotenv = require("dotenv");

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedMimeTypes = ["image/jpeg", "image/png", "video/mp4", "video/mpeg"];

 const uploadManager = (destination) => {

    const storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req, file) => {
        const isVideo = file.mimetype.startsWith("video/");
        return {
          folder: `Rentals/${destination}`,
          resource_type: isVideo ? "video" : "image",
          format: isVideo ? "mp4" : "jpg",
        };
      },
    });
  
    return multer({
      storage,
      fileFilter: (req, file, cb) => {
        // Check if no file is uploaded
        if (!file) {
          return cb(new Error("No file uploaded"));
        }
  
        // Check for empty files (file size of 0)
        if (file.size === 0) {
          return cb(new Error("Uploaded file is empty"));
        }
  
        // Check for allowed mime types
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return cb(
            new Error("Invalid file type. Only images and videos are allowed.")
          );
        }
  
        // Allow the file
        cb(null, true);
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // Limit file size to 50MB
      },
    });
  };

module.exports = uploadManager;