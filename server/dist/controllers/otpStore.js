"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveOTP = saveOTP;
exports.updateOtp = updateOtp;
exports.getOTP = getOTP;
exports.removeOTP = removeOTP;
const otpMap = new Map();
function saveOTP(email, otp, password) {
    otpMap.set(email, {
        otp,
        password,
        expiresAt: Date.now() + 10 * 60 * 1000, // 5 minutes
    });
}
function updateOtp(email, newOtp) {
    const existingData = otpMap.get(email);
    console.log(existingData ? existingData : "there is no existiing daaata");
    if (!existingData)
        return false;
    otpMap.set(email, {
        ...existingData,
        otp: newOtp,
    });
    return true;
}
function getOTP(email) {
    return otpMap.get(email);
}
function removeOTP(email) {
    return otpMap.delete(email);
}
