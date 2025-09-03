import { Timestamp, updateDoc } from "firebase/firestore";
import { admin, db, auth } from "../firebase/index";
import { sendInvitation } from "./otplogic";
import dotenv from "dotenv";
dotenv.config();
function generateRandomPassword() {
    const length = 6;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        password += chars[randomIndex];
    }
    return password;
}
interface Room {
    id: string;
    admin: string;
    createdAt: { _seconds: number; _nanoseconds: number };
    createdBy: string;
    endedAt: null | { _seconds: number; _nanoseconds: number };
    gameStatus: string;
    invited: string[];
    isStarted: boolean;
    lastAnswerer: string;
    password: string;
    requested: string[];
    roomName: string;
    type: string;
}

// Example usage:
// console.log(generateRandomPassword()); // e.g., "A3f$1b"
export const createGame = async (req: any, res: any) => {
    try {
        const password = generateRandomPassword();
        const userid = req.user.uid;
        const friendids: string[] = req.body.friends || [];
        // const groupids: string[] = req.body.groups || [];

        const roomType = req.body.type ? req.body.type : "private";

        const userRef = db.collection("users").doc(userid);
        const userDoc = await userRef.get();

        if (!Array.isArray(friendids)) {
            console.log("no Aarray")
            return res.status(400).json({ msg: "Invalid members list" });
        }

        const roomName = req.body.room ? req.body.room : `${userDoc.data()?.name}'s Team`;

        console.log(friendids);
        // Create room
        const roomDoc = await db.collection("rooms").add({
            roomName,
            createdBy: userid,
            admin: userDoc.data()?.name,
            password,
            isStarted: false,
            requested: friendids,
            createdAt: admin.firestore.Timestamp.now(),
            endedAt: null,
            gameStatus: "waiting",
            lastAnswerer: "anyone",
            type: roomType
        });
        console.log("byee");
        console.log("byee");
        // Add creator as player
        // await db.collection("rooms").doc(roomDoc.id).collection("players").doc(userid).set({
        //     name: userDoc.data()?.name || "Unknown",
        //     ref: userRef,
        //     joinedAt: admin.firestore.Timestamp.now(),
        //     admin: true
        // });

        const link = `http://localhost:5173/game/${roomDoc.id}`;
        const invited = new Set<string>();

        // --- Handle friends in parallel ---
        await Promise.all(friendids.map(async (memId) => {
            const [x1, x2] = [userid, memId].sort();
            const docId = `${x1}_${x2}`;
            const friendRef = db.collection("friends").doc(docId);
            const friendDoc = await friendRef.get();

            if (!friendDoc.exists) {
                console.log(`Friend doc ${memId} does not exist`);
                return;
            }

            const members = friendDoc.data()?.members || [];
            const index = members.indexOf(userid);

            if (index !== -1) {
                members.splice(index, 1);
                const otherUserId = members[0];
                invited.add(otherUserId);

                await db.collection("users").doc(otherUserId).collection("notifications").add({
                    msg: `You are invited to join this room ${link}`,
                    time: admin.firestore.Timestamp.now()
                });
            }

            await friendRef.collection("messages").add({
                senderId: userid,
                type: "text",
                text: `Join this link to play => ${link} with the password ${password}`,
                sentAt: admin.firestore.Timestamp.now()
            });

            await Promise.all(
                friendids.map(friend => {
                    const friendRef = db.collection("users").doc(friend);
                    return friendRef.collection("notifications").add({
                        id: roomDoc.id,
                        message: `you are invited in room ${roomName}`,
                        timestamp: new Date(),
                        read: false,
                    });
                })
            );
        }));
        await db.collection("rooms").doc(roomDoc.id).update({
            invited: Array.from(invited)
        });

        res.status(200).json({ link: link, roomId: roomDoc.id, password, invited: Array.from(invited) });
    } catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ error: "Failed to create room" });
    }
};

export const joinGame = async (req: any, res: any) => {
    const roomId = req.body.id;
    const user = req.user.uid;

    if (!roomId) {
        return res.status(400).json({ msg: "Please provide room ID" });
    }

    const userRef = db.collection("users").doc(user);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return res.status(404).json({ msg: "User not found" });
    }

    const roomRef = db.collection("rooms").doc(roomId);
    const roomDoc = await roomRef.get();

    if (!roomDoc.exists) {
        return res.status(404).json({ msg: "Room does not exist" });
    }

    const room = roomDoc.data();
    if (room?.endedAt) {
        return res.status(500).send("room is ended , you can not join");
    }

    if (room?.type === "private") {
        const invited = room?.invited;
        const bool = invited.includes(user) || room?.createdBy === user;
        console.log(invited, user);
        if (!bool) {
            return res.status(500).json({
                msg: "you are not invited in this room"
            })
        }
    }

    const existingPlayer = await roomRef.collection("players").doc(user).get();
    if (existingPlayer.exists) {
        return res.status(200).json({ msg: "You already joined the room", roomId });
    }
    console.log("you are in join game func");


    // ✅ Add to players subcollection
    try {
        await roomRef.collection("players").doc(user).set({
            name: userDoc.data()?.name || "Unknown",
            ref: userRef,
            joinedAt: admin.firestore.Timestamp.now(),
        });

        return res.status(200).json({ msg: "Successfully joined the game", roomId });
    } catch (e: any) {
        return res.status(500).json({ msg: "Failed to join game", error: e.message });
    }
};

export const getRooms = async (req: any, res: any) => {
    try {
        const user = req.user.uid;
        const roomsSnap = await db.collection("rooms").get();

        if (roomsSnap.empty) {
            return res.status(404).json("No rooms exist");
        }

        const twoHoursInMs = 2 * 60 * 60 * 1000;
        const now = Date.now();

        const allRooms = [];

        for (const doc of roomsSnap.docs) {
            const room = { id: doc.id, ...doc.data() };

            console.log(room, "room data");
            // Delete if startedAt exists and is more than 2 hours ago
            //@ts-ignore
            if (room.createdAt) {
                //@ts-ignore
                const startedAtMs = room.createdAt.toDate ? room.createdAt.toDate().getTime() : new Date(room.createdAt).getTime();

                if (now - startedAtMs > twoHoursInMs) {
                    await db.collection("rooms").doc(doc.id).delete();
                    continue; // Skip adding this room
                }
            }

            // Skip ended rooms
            //@ts-ignore
            if (room.endedAt) continue;

            allRooms.push(room);
        }

        return res.status(200).json(allRooms);
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return res.status(500).json({ error: "Failed to fetch rooms" });
    }
};



export const rotateBottle = async (req: any, res: any) => {
    const roomId = req.body.id;

    if (!roomId) {
        return res.status(400).json({
            msg: "roomId doesn't exist"
        });
    }

    try {
        const roomRef = db.collection("rooms").doc(roomId);
        const roomDoc = await roomRef.get();

        if (!roomDoc.exists) {
            return res.status(404).json({ msg: "Room not found" });
        }

        if (!roomDoc.data()?.endTime) {
            return res.status(400).json({
                msg: "currentTurn is not ended"
            })
        }

        const playersSnap = await roomRef.collection("players").get();
        const players = playersSnap.docs.map(doc => doc.id);

        if (players.length < 2) {
            return res.status(400).json({ msg: "Not enough players to start the game" });
        }

        // Shuffle players for randomness (optional)
        const shuffled = players;

        // Pick random answerer
        const answererIndex = Math.floor(Math.random() * shuffled.length);
        const answererId = shuffled[answererIndex];

        // Determine asker (opposite circular logic)
        const askerIndex = (answererIndex + Math.floor(shuffled.length / 2)) % shuffled.length;
        const askerId = shuffled[askerIndex];

        // Start the game if not already started
        if (!roomDoc.data()?.isStarted) {
            await roomRef.update({
                isStarted: true
            });
        }

        // Update current turn details
        await roomRef.update({
            currentTurn: { // <-- Changed 'turn' to 'currentTurn' for frontend real-time listening
                asker: askerId,
                answerer: answererId,
                truthOrDare: null,
                task: null,
                startTime: admin.firestore.Timestamp.now(),
                endTime: null
            }
        });

        return res.status(200).json({
            players: players,
            noOfPlayers: players.length,
            asker: askerId,
            answerer: answererId,
            msg: "Bottle rotated successfully 🎯"
        });

    } catch (e: any) {
        return res.status(500).json({
            msg: "Failed to rotate bottle",
            error: e.message
        });
    }
};
export const selectTruthDare = async (req: any, res: any) => {
    const roomRef = req.room;
    const choosed = req.body.choosen;
    const user = req.user.uid;

    const roomDoc = await roomRef.get();
    const currentTurn = roomDoc.data()?.currentTurn;

    if (currentTurn.answerer !== user) {
        return res.status(404).json({
            msg: "user is not an answerer"
        })
    }

    if (choosed !== "truth" && choosed !== "dare") {
        return res.status(400).json({
            msg: "invalid inputs truth||dare"
        })
    }

    try {
        await roomRef.update({
            currentTurn: {
                truthOrDare: choosed
            }
        })
        return res.status(200).json({
            msg: `selected ${choosed}`
        })
    } catch (e) {
        return res.status(500).json({
            msg: e
        })
    }
}
export const endTurn = async (req: any, res: any) => {
    const roomRef = req.room;
    const user = req.user.id;

    try {
        const roomData = await roomRef.get();
        const currentTurn = roomData.data()?.currentTurn;

        if (currentTurn.asker !== user) {
            return res.status(403).json({
                msg: "User is not allowed to end turn"
            });
        }

        const updatedTurn = {
            asker: null,
            answerer: null,
            truthOrDare: null,
            startTime: null,
            endTime: admin.firestore.Timestamp.now()
        };

        await roomRef.update({
            currentTurn: updatedTurn
        });

        return res.status(200).json({
            turn: updatedTurn,
            msg: "Turn ended successfully"
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({
            msg: "Something went wrong"
        });
    }
};

export const exitGame = async (req: any, res: any) => {
    const room = req.room; // This will be DocumentReference now
    const user = req.user.uid;
    console.log("you are in exit game func");
    try {
        await room.collection("players").doc(user).delete();
        return res.status(200).json({
            msg: "Player removed successfully",
            id: user
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ msg: "Unable to delete player" });
    }
};

export const getPlayer = async (req: any, res: any) => {
    const room = req.room;
    const user = req.user.uid;

    try {
        const snap = await room.collection("players").get()
        //@ts-ignore
        const players = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return res.status(200).json({
            msg: "players obtained",
            players,
        })
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            msg: "unable to access players",
            e
        })
    }
}

export const endgame = async (req: any, res: any) => {
    const roomRef = req.room;
    const userId = req.user?.uid;

    if (!roomRef || !userId) {
        return res.status(400).json({
            msg: "Missing room or user information"
        });
    }

    try {
        const roomSnap = await roomRef.get();

        if (!roomSnap.exists) {
            return res.status(404).json({
                msg: "Room does not exist"
            });
        }

        // Directly delete the room
        await roomRef.delete();

        return res.status(200).json({
            msg: "Game deleted successfully"
        });

    } catch (e) {
        console.error("Error deleting game:", e);
        return res.status(500).json({
            msg: "Internal server error",
            error: e
        });
    }
};


export const getGameStatus = async (req: any, res: any) => {
    const roomid = req.body.id;
    const roomRef = db.collection("rooms").doc(roomid);
    try {
        const roomSnap = await roomRef.get();
        const data = roomSnap.data();
        let status = "waiting";

        if (data?.endedAt) {
            status = "ended";
        } else if (data?.startedAt) {
            status = "ongoing";
        }

        return res.status(200).json({
            status,
            startedAt: data?.startedAt,
            endedAt: data?.endedAt,
            msg: "Game status fetched"
        });

    } catch (error) {
        return res.status(500).json({
            msg: "Error getting game status",
            error: error
        });
    }
};

export const roomDetails = async (req: any, res: any) => {
    const roomRef = req.room;
    const userId = req.user.uid;

    try {
        const roomSnap = await roomRef.get();

        if (!roomSnap.exists) {
            return res.status(404).json({
                msg: "Room not found"
            });
        }

        const data = roomSnap.data();

        return res.status(200).json({
            data
        });

    } catch (e) {
        console.error("Error fetching room:", e);
        return res.status(500).json({
            msg: "Internal server error",
            error: e
        });
    }
};

