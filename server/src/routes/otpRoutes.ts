import { Router } from 'express';
import { sendOtp, verifyOtp, resendOtp } from '../controllers/register.controller.js';
const router = Router();

router.route('/sendOtp').post(sendOtp);
router.route('/verifyOtp').post(verifyOtp);
router.route('/resend').post(resendOtp);
export default router;