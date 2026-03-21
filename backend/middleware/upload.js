const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for payment proofs
const paymentProofStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "peace-mindset/payment-proofs",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    resource_type: "auto",
    transformation: [{ quality: "auto" }],
  },
});

// Storage for results
const resultStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "peace-mindset/results",
    allowed_formats: ["pdf"],
    resource_type: "raw",
  },
});

const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, PDF files are allowed"), false);
  },
});

const uploadResult = multer({
  storage: resultStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed for results"), false);
  },
});

module.exports = { cloudinary, uploadPaymentProof, uploadResult };
