"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
// Cloudinary config
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Multer storage using Cloudinary (TS-friendly)
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: async (req, file) => ({
        folder: "truth_dare_uploads",
        format: file.mimetype.split("/")[1],
        public_id: `${Date.now()}-${file.originalname}`,
    }),
});
const upload = (0, multer_1.default)({ storage });
router.post("/", upload.single("file"), (req, res) => {
    console.log("encounter file changing");
    console.log("fike ");
    if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
    console.log("file submitted");
    console.log(req.file.path, "kxknc");
    res.json({
        message: "File uploaded successfully",
        fileUrl: req.file.path,
        publicId: req.file.filename, // direct Cloudinary URL
    });
});
exports.default = router;
