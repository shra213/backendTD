"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtp = exports.resendOtp = exports.sendOtp = void 0;
const otplogic_1 = require("./otplogic");
const otpStore_1 = require("./otpStore");
const index_1 = require("../firebase/index");
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// import { deleteFile } from "../routes/deleteFile";
dotenv_1.default.config();
const zod_1 = __importDefault(require("zod"));
const secret = process.env.JWT_SECRET;
// Ensure .env loads here
// =======================
// ✅ Send OTP Controller
// =======================
const emailSchema = zod_1.default.string().email();
const sendOtp = async (req, res) => {
    try {
        console.log("entered");
        const { email, password } = req.body;
        // Validate email
        const suc = emailSchema.safeParse(email);
        if (!suc.success) {
            return res.status(404).json({ msg: "Give a valid email" });
        }
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }
        // Check if user already exists
        try {
            const userRecord = await index_1.auth.getUserByEmail(email);
            if (userRecord) {
                // console.log("error in deleting file");
                return res.status(409).json({ message: "User already registered" });
            }
        }
        catch (err) {
            // If error.code === 'auth/user-not-found', proceed to OTP
            if (err.code !== 'auth/user-not-found') {
                console.error("Firebase error:", err);
                return res.status(500).json({ message: "Failed to check user" });
            }
        }
        // Generate OTP
        const otp = (0, otplogic_1.generateOtp)();
        // Save OTP and send mail
        await (0, otpStore_1.saveOTP)(email, String(otp), password);
        await (0, otplogic_1.sendOtpMail)(email, otp);
        return res.status(200).json({ message: "OTP sent successfully" });
    }
    catch (error) {
        console.error("Error sending OTP:", error);
        return res.status(500).json({ message: "Failed to send OTP" });
    }
};
exports.sendOtp = sendOtp;
const resendOtp = async (req, res) => {
    try {
        const email = req.body.email;
        if (!email) {
            return res.status(400).json({ message: 'Provide email and OTP' });
        }
        const otp = (0, otplogic_1.generateOtp)();
        const generated = (0, otpStore_1.updateOtp)(email, String(otp));
        if (!generated) {
            return res.status(500).json({
                msg: "otp cant be resend"
            });
        }
        console.log(` ${email}  ${otp}`);
        await (0, otplogic_1.sendOtpMail)(email, otp);
        return res.json(200).json({
            msg: "otp sent successfully"
        });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({
            msg: e
        });
    }
};
exports.resendOtp = resendOtp;
// ==========================
// ✅ Verify OTP & Create User
// ==========================
const verifyOtp = async (req, res) => {
    try {
        const { email, otp: userOtp } = req.body;
        const name = req.body.name ? req.body.name : "shraddha chaudhari";
        const publicId = req.body.publicId || "";
        const profileLink = req.body.profile || "";
        // if (!publicId) {
        //   return res.status(404).json({ msg: "publicId is not provided" });
        // }
        if (!email || !userOtp) {
            return res.status(400).json({ message: 'Provide email and OTP' });
        }
        console.log(publicId, "publicId povided");
        // console.log(profileLink, "publicId povided");
        const record = (0, otpStore_1.getOTP)(email);
        console.log("Stored OTP Record:", record);
        if (!record) {
            return res.status(404).json({ message: "No OTP record found" });
        }
        const { otp, password, expiresAt } = record;
        if (Date.now() > expiresAt) {
            // deleteFile(publicId);
            (0, otpStore_1.removeOTP)(email);
            return res.status(410).json({ message: "OTP expired" });
        }
        if (String(otp) !== String(userOtp)) {
            return res.status(401).json({ message: "Invalid OTP" });
        }
        console.log("bef");
        // Create Firebase user
        console.log("Password Type:", typeof password, otp);
        const user = await index_1.admin.auth().createUser({
            email,
            password,
            emailVerified: true,
        });
        console.log("i am shraddhaaaa");
        const newUser = {
            name,
            email,
            publicId: publicId,
            mediaUrl: profileLink,
            birthdate: "1 / 1 / 2005",
            createdAt: index_1.admin.firestore.Timestamp.now(),
        };
        await index_1.db.collection('users').doc(user.uid).set(newUser);
        if (!secret) {
            return res.status(400).send("no jwt secret");
        }
        const token = jsonwebtoken_1.default.sign({ email, id: user.uid }, secret);
        (0, otpStore_1.removeOTP)(email); // Clear OTP after success
        const options = {
            httpOnly: true,
            secure: true, // Set to true in production
            // sameSite: 'Lax'
        };
        return res
            .cookie('accessToken', token, options)
            .status(201)
            .json({ message: "User created successfully", newUser, token });
    }
    catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({ message: "Failed to verify OTP or create user" });
    }
};
exports.verifyOtp = verifyOtp;
