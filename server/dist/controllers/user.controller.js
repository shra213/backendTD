"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.updateProfile = exports.getUser = exports.getMe = void 0;
const firebase_1 = require("../firebase");
const getMe = async (req, res) => {
    console.log(req.user);
    const user = await firebase_1.db.collection("users").doc(req.user.uid).get();
    const userData = user.data();
    res.status(200).json(userData);
};
exports.getMe = getMe;
const getUser = async (req, res) => {
    const userId = req.body.id;
    if (!userId) {
        return res.status(400).json({
            msg: "User ID not provided",
        });
    }
    try {
        const userDoc = await firebase_1.db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                msg: "User not found",
            });
        }
        return res.status(200).json({
            id: userDoc.id,
            ...userDoc.data(),
        });
    }
    catch (e) {
        console.error("Error fetching user:", e.message);
        return res.status(500).json({
            msg: "Internal server error",
        });
    }
};
exports.getUser = getUser;
const updateProfile = async (req, res) => {
    const { name, profile, birthdate, mediaUrl } = req.body;
    if (!name && !profile && !birthdate && !mediaUrl) {
        return res.status(400).json({ error: "No valid input provided" });
    }
    const userId = req.user.uid;
    const userRef = firebase_1.db.collection("users").doc(userId);
    try {
        // Only include fields that are actually provided
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (profile !== undefined)
            updateData.profile = profile;
        if (birthdate !== undefined)
            updateData.birthdate = birthdate;
        if (mediaUrl !== undefined)
            updateData.mediaUrl = mediaUrl;
        await userRef.update(updateData);
        return res.status(200).json({
            msg: "Profile updated successfully",
            updated: updateData,
        });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
};
exports.updateProfile = updateProfile;
// import admin from "firebase-admin";
// import db from "./db"; // your Firestore init
// Delete account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.body.id || req.user.id; // from middleware after auth
        // 1. Delete from Firebase Auth
        console.log("delting account");
        // 2. Delete Firestore document (main user profile)
        // 3. (Optional) Delete user data from other collections
        // Example: friends, posts, groups
        const collectionsToClean = ["friends", "posts", "groups"];
        for (const col of collectionsToClean) {
            const snap = await firebase_1.db.collection(col).where("userId", "==", userId).get();
            const batch = firebase_1.db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        await firebase_1.db.collection("users").doc(userId).delete();
        // await admin.auth().deleteUser(userId);
        return res.status(200).json({ msg: "Account deleted successfully" });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Error deleting account" });
    }
};
exports.deleteAccount = deleteAccount;
