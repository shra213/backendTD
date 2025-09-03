import { string } from "zod";
import { admin, db } from "../firebase/index";

type members = string[];
import { Request, Response } from "express";


export const createGrp = async (req: any, res: Response) => {
    const grpName: string = req.body.groupName;
    const memberIds: string[] = req.body.members;
    const adminId: string = req.user.uid;

    if (!grpName || !Array.isArray(memberIds)) {
        return res.status(400).json({ msg: "Group must have a name and at least 2 members." });
    }

    memberIds.push(String(adminId));
    try {
        const adminRef = db.collection("users").doc(adminId);

        // Optional: Ensure admin user exists
        const adminSnap = await adminRef.get();
        if (!adminSnap.exists) {
            return res.status(404).json({ msg: "Admin user not found." });
        }

        const members = await Promise.all(
            memberIds.map(async (mem) => {
                const memRef = db.collection("users").doc(mem);
                const memDoc = await memRef.get();

                if (!memDoc.exists) {
                    throw new Error(`User ${mem} not found`);
                }

                return memDoc.id;
            })
        );

        const groupDoc = await db.collection("groups").add({
            name: grpName,
            adminId,
            admin: adminRef,
            members: memberIds,
            createdAt: admin.firestore.Timestamp.now(),
        });

        const usersRef = db.collection("users");

        await Promise.all(memberIds.map(async (member) => {
            await usersRef.doc(member).collection("groups").doc(groupDoc.id).set({
                groupRef: db.collection("groups").doc(groupDoc.id)
            })

            await usersRef.doc(member).collection("notifications").add({
                msg: `you are added in group ${grpName}`,
                time: admin.firestore.Timestamp.now()
            })
        }))
        //@ts-ignore
        return res.status(201).json({ msg: "Group created", groupId: groupDoc });
    } catch (error: any) {
        console.error("Error creating group:", error);
        return res.status(500).json({ msg: "Failed to create group", error: error.message });
    }
};


export const sendGroupMessage = async (req: any, res: any) => {
    const groupId = req.body.id;
    const senderId = req.user.uid;
    const files = req.body.mediaUrl ? req.body.mediaUrl : "";
    const text  = req.body.text;

    if (!text || typeof text !== "string") {
        return res.status(400).json({ msg: "Message text is required" });
    }

    try {
        const groupRef = db.collection("groups").doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ msg: "Group not found" });
        }

        const groupData = groupDoc.data();
        if (!groupData?.members.includes(senderId)) {
            return res.status(403).json({ msg: "You're not a member of this group" });
        }

        await groupRef.collection("messages").add({
            senderId,
            text,
            mediaUrl: files,
            sentAt: admin.firestore.Timestamp.now(),
        });

        return res.status(200).json({ msg: "Message sent" });
    } catch (e: any) {
        console.error("Send group message error:", e);
        return res.status(500).json({ msg: "Failed to send message", error: e.message });
    }
};

export const getGroups = async (req: any, res: any) => {
    try {
        console.log("📌 Incoming request to getGroups");

        const userId = req.user.uid;
        console.log("✅ User ID:", userId);

        if (!userId) {
            console.error("❌ Missing user ID in request");
            return res.status(400).json({ message: "User ID missing" });
        }

        console.log("🔍 Querying Firestore for groups...");
        const snap = await db.collection("groups")
            .where("members", "array-contains", userId)
            .get();

        console.log("📊 Query complete. Documents found:", snap.size);

        if (snap.empty) {
            console.warn("⚠ No groups found for this user");
            return res.status(200).json({ groups: [] });
        }

        const groups = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("✅ Groups fetched:", groups);

        return res.status(200).json({ groups });

    } catch (e) {
        console.error("💥 Error fetching groups:", e);
        return res.status(500).json({
            message: "Failed to fetch groups",
            error: e instanceof Error ? e.message : e
        });
    }
};
