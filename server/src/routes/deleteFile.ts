// DELETE /api/upload
import express, { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const deleteFile = async (publicId: string) => {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok") {
        return true;
    } else {
        return false;
    }
}
// Pass publicId in body: { publicId: "folder/file_name" }
router.delete("/", async (req: Request, res: Response) => {
    const { publicId } = req.body;

    if (!publicId) {
        return res.status(400).json({ message: "publicId is required" });
    }

    try {
        const result = await cloudinary.uploader.destroy(publicId);
        if (result.result === "ok") {
            return res.json({ message: "File deleted successfully" });
        } else {
            return res.status(500).json({ message: "Failed to delete file", result });
        }
    } catch (err) {
        console.error("Error deleting file:", err);
        return res.status(500).json({ message: "Server error", error: err });
    }
});

export default router;
