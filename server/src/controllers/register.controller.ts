import { sendOtpMail, generateOtp } from "./otplogic";
import { saveOTP, getOTP, removeOTP, updateOtp } from "./otpStore";
import { admin, db, auth } from "../firebase/index";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { deleteFile } from "../routes/deleteFile";
dotenv.config();
import z from "zod";


const secret = process.env.JWT_SECRET
// Ensure .env loads here

// =======================
// ✅ Send OTP Controller
// =======================
const emailSchema = z.string().email();
export const sendOtp = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const suc = emailSchema.safeParse(email);
    if (!suc.success) {
      return res.status(404).json({
        msg: "Give a valid email"
      });
    }
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const otp = generateOtp();

    await saveOTP(email, String(otp), password);
    await sendOtpMail(email, otp);

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

export const resendOtp = async (req: any, res: any) => {
  try {
    const email = req.body.email;
    if (!email) {
      return res.status(400).json({ message: 'Provide email and OTP' });
    }

    const otp = generateOtp();
    const generated = updateOtp(email, String(otp));

    if (!generated) {
      return res.status(500).json({
        msg: "otp cant be resend"
      })
    }

    console.log(` ${email}  ${otp}`)
    await sendOtpMail(email, otp);
    return res.json(200).json({
      msg: "otp sent successfully"
    })
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      msg: e
    })
  }
}
// ==========================
// ✅ Verify OTP & Create User
// ==========================
export const verifyOtp = async (req: any, res: any) => {
  try {
    const { email, otp: userOtp } = req.body;
    const name = req.body.name ? req.body.name : "shraddha chaudhari";
    const prf = req.body.publicId;
    if (!prf) {
      return res.status(404).json({ msg: "prf is not provided" });
    }
    if (!email || !userOtp) {
      return res.status(400).json({ message: 'Provide email and OTP' });
    }

    const record = getOTP(email);
    console.log("Stored OTP Record:", record);

    if (!record) {
      return res.status(404).json({ message: "No OTP record found" });
    }

    const { otp, password, expiresAt } = record;

    if (Date.now() > expiresAt) {
      deleteFile(prf);
      removeOTP(email);
      return res.status(410).json({ message: "OTP expired" });
    }

    if (String(otp) !== String(userOtp)) {
      return res.status(401).json({ message: "Invalid OTP" });
    }
    console.log("bef");

    // Create Firebase user
    console.log("Password Type:", typeof password, otp);

    const user = await admin.auth().createUser({
      email,
      password,
      emailVerified: true,
    });

    console.log("i am shraddhaaaa");
    const newUser = {
      name,
      email,
      mediaUrl: prf,
      createdAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('users').doc(user.uid).set(newUser);

    if (!secret) {
      return res.status(400).send("no jwt secret");
    }


    const token = jwt.sign(
      { email, id: user.uid },
      secret, // type-safe since we checked above
      // { expiresIn: "1h" }
    );
    removeOTP(email); // Clear OTP after success

    const options = {
      httpOnly: true,
      secure: true, // Set to true in production
      // sameSite: 'Lax'
    };

    return res
      .cookie('accessToken', token, options)
      .status(201)
      .json({ message: "User created successfully", newUser, token });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ message: "Failed to verify OTP or create user" });
  }
};

