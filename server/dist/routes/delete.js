"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cloudinary_1 = require("cloudinary");
const router = express_1.default.Router();
// Cloudinary config
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Delete file route
router.delete("/delete-file", async (req, res) => {
    try {
        console.log("hiii");
        const { publicId } = req.body; // send { "publicId": "foldername/filename" } in request body
        console.log("tried for deleting");
        if (!publicId) {
            return res.status(400).json({ error: "publicId is required" });
        }
        const result = await cloudinary_1.v2.uploader.destroy(publicId);
        console.log(res, "deleted");
        if (result.result === "not found") {
            return res.status(404).json({ error: "File not found" });
        }
        res.status(200).json({ message: "File deleted successfully", result });
    }
    catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
});
exports.default = router;
