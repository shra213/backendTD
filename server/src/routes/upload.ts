import express, { Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer storage using Cloudinary (TS-friendly)
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: "truth_dare_uploads",
        format: file.mimetype.split("/")[1],
        public_id: `${Date.now()}-${file.originalname}`,
    }),
});

const upload = multer({ storage });

// Upload single file
router.post("/", upload.single("file"), (req: Request, res: Response) => {
    console.log("encounter file changing");
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    console.log("file submitted");
    console.log(req.file.path, "kxknc");
    res.json({
        message: "File uploaded successfully",
        fileUrl: req.file.path,
        publicId: req.file.filename, // direct Cloudinary URL
    });
});

export default router;
