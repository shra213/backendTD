import express from "express";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Delete file route
router.delete("/delete-file", async (req, res) => {
    try {
        const { publicId } = req.body; // send { "publicId": "foldername/filename" } in request body
        console.log("tried for deleting");
        if (!publicId) {
            return res.status(400).json({ error: "publicId is required" });
        }

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === "not found") {
            return res.status(404).json({ error: "File not found" });
        }

        res.status(200).json({ message: "File deleted successfully", result });
    } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

export default router;
