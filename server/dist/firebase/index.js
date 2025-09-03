"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucket = exports.auth = exports.db = exports.admin = void 0;
// src/firebase/index.ts
const firebase_admin_1 = __importDefault(require("firebase-admin"));
exports.admin = firebase_admin_1.default;
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccount),
    storageBucket: "truth---dare.appspot.com"
});
const db = firebase_admin_1.default.firestore();
exports.db = db;
const auth = firebase_admin_1.default.auth();
exports.auth = auth;
const bucket = firebase_admin_1.default.storage().bucket();
exports.bucket = bucket;
