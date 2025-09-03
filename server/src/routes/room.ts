import { Router } from "express";
import { createGame, joinGame, rotateBottle, selectTruthDare, endTurn, exitGame, getPlayer, endgame, getGameStatus, roomDetails, getRooms } from "../controllers/room.controller";
import { verifyPlayer } from "../middlewares/game";
const router = Router();

router.route('/createGame').post(createGame);
router.route('/joinGame').post(joinGame);
router.route('/rotateBottle').post(verifyPlayer, rotateBottle);
router.route('/choose').post(verifyPlayer, selectTruthDare);
router.route('/endTurn').delete(verifyPlayer, endTurn);
router.route('/exit').post(verifyPlayer, exitGame);
router.route('/getPlayers').post(verifyPlayer, getPlayer);
router.route('/terminate').post(verifyPlayer, endgame);
router.route('/game/status').get(getGameStatus);
router.route('/room/roomDetails').get(verifyPlayer, roomDetails);
router.route('/getRooms').get(getRooms);
export default router;
