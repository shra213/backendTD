"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInvitation = exports.sendOtpMail = exports.generateOtp = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Setup mail transporter
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});
// Generate a random 3-digit OTP
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000);
};
exports.generateOtp = generateOtp;
// Send OTP email
const sendOtpMail = async (email, otp) => {
    console.log('Pass:', process.env.MAIL_PASS ? 'Loaded' : 'Missing');
    try {
        await transporter.sendMail({
            from: `"Truth & Dare <${process.env.MAIL_USER}>`,
            to: email,
            subject: 'Email Verification OTP',
            html: `
        <h2>Your OTP Code</h2>
        <p>Use the following OTP to verify your email:</p>
        <h3>${otp}</h3>
        <p>This OTP is valid for 10 minutes.</p>
      `,
        });
        console.log("sent");
        return true;
    }
    catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};
exports.sendOtpMail = sendOtpMail;
const sendInvitation = async (emails, link) => {
    try {
        await transporter.sendMail({
            from: `"Truth & Dare Game" <${process.env.MAIL_USER}>`,
            bcc: emails, // send to multiple users privately
            subject: "🎉 You're Invited! Join the Truth & Dare Game",
            html: `
        <div style="font-family: Arial, sans-serif; padding: 16px; background: #f9f9f9; border-radius: 8px;">
          <h2 style="color: #333;">You've been invited to play Truth & Dare! 🎲</h2>
          <p style="font-size: 16px;">Click the link below to join the game room:</p>
          <a href="${link}" target="_blank" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            Join Game
          </a>
          <p style="margin-top: 20px; color: #777;">Have fun and play fair! 🎉</p>
        </div>
      `
        });
        return true;
    }
    catch (e) {
        console.error("Error sending invite:", e);
        return false;
    }
};
exports.sendInvitation = sendInvitation;
