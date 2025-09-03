import { Router } from "express";
import { createGrp, sendGroupMessage, getGroups, } from "../controllers/grp.controller";
import { verifyToken } from "../middlewares/user";
const router = Router();

router.route('/createGrp').post(createGrp);
router.route('/sendmsg').post(sendGroupMessage);
router.route('/allgroups').get(getGroups);

export default router;