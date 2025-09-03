import { Request, Response, NextFunction } from "express";
import { admin, db } from "../firebase/index";

export const verifyPlayer = async (req: any, res: any, next: any) => {
    const roomId = req.body.id;
    const userId = req.user.uid; // Adjust according to how you attach user info in middleware (e.g., after auth)
    console.log(roomId, userId);
    if (!roomId || !userId) {
        console.log("lakshya");
        return res.status(400).json({
            msg: "Missing roomId or userId"
        });
    }

    try {
        const roomRef = db.collection("rooms").doc(roomId);
        const roomDoc = await roomRef.get();

        if (!roomDoc.exists) {
            return res.status(404).json({
                msg: "Room does not exist"
            });
        }

        const playerDoc = await roomRef.collection("players").doc(userId).get();
        // if (!roomDoc.data()?.players.includes(userId)) {
        //     return res.status(403).json({
        //         msg: "User is not a player in this room"
        //     });
        // }
        if (!playerDoc.exists) {
            return res.status(403).json({
                msg: "User is not a player in this room"
            });
        }
        req.room = roomRef;
        console.log("hii");

        // Player verified, proceed to next middleware/handler
        next();

    } catch (error) {
        console.log("error", error);

        console.error("Error verifying player:", error);
        return res.status(500).json({
            msg: "Internal Server Error"
        });
    }
};
