import { Router } from 'express';
import { getUsers, sendFriendReq, acceptFriendReq, sendMessage, getPendingReq, getFriends } from '../controllers/friends.controller';
import { verifyToken } from "../middlewares/user"
const router = Router();

router.route('/getUsers').get(verifyToken, getUsers);
router.route('/sendreq').post(verifyToken, sendFriendReq);
router.route("/acceptReq").post(verifyToken, acceptFriendReq);
router.route("/sendMsg").post(verifyToken, sendMessage);
router.route("/allFriends").get(verifyToken, getFriends);
router.route("/getPendingReq").get(verifyToken, getPendingReq);
export default router;                       