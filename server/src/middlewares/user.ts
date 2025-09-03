import { admin, db } from "../firebase/index";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();


export const verifyToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // contains uid, email, etc.
    next();
  } catch (error) {
    console.error('Invalid token:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// export const verifyToken = async (req: any, res: any, next: any) => {
//   try {
//     // const token = req.headers['authorization']?.split(' ')[1];
//     console.log("middleware");
//     const token = req.headers['authorization']?.split(' ')[1] || req.cookies?.accessToken;

//     // const token = req.cookies?.accessToken||req.header('authorization')?.replace('Bearer ', '');
//     console.log("Token:", token);

//     if (!token) {
//       return res.status(404).json({
//         msg: "provide token "
//       })
//       // throw new ApiError(401, 'Token not found');
//     }
//     if (!process.env.JWT_SECRET) {
//       return res.status(400).json({
//         msg: "var not found"
//       })
//     }
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     //@ts-ignore
//     console.log(decoded);
//     const userDoc = await db.collection("users").doc(decoded?.id).get();
//     if (!userDoc.exists) {
//       return res.status(404).send("user doesent exist");
//     }
//     const user = userDoc.data();
//     req.user = user;
//     console.log('User found:', user?.id);
//     console.log('Decoded token:', decoded);
//     next();
//   } catch (error) {
//     next(error);
//   }
// }