import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
const router = express.Router();
import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads")); // store in /uploads
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Upload single file
router.post("/", upload.single("file"), (req: Request, res: Response) => {
    if (!req.file) {
        console.log("hu");
        return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        message: "File uploaded successfully",
        fileUrl,
    });
});

export default router;
