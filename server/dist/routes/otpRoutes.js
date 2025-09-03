"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const register_controller_js_1 = require("../controllers/register.controller.js");
const router = (0, express_1.Router)();
router.route('/sendOtp').post(register_controller_js_1.sendOtp);
router.route('/verifyOtp').post(register_controller_js_1.verifyOtp);
router.route('/resend').post(register_controller_js_1.resendOtp);
exports.default = router;
