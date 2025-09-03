"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFriends = exports.getPendingReq = exports.sendMessage = exports.acceptFriendReq = exports.sendFriendReq = exports.getUsers = void 0;
const index_1 = require("../firebase/index");
const getUsers = async (req, res) => {
    console.log("getUsers");
    try {
        const userId = req.user.uid;
        // 1️⃣ Fetch all users
        const usersSnap = await index_1.db.collection("users").get();
        if (usersSnap.empty) {
            return res.status(404).json({ msg: "No users exist" });
        }
        const allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // 2️⃣ Fetch all friend requests involving current user
        const requestsSnap = await index_1.db.collection("friends")
            .where("members", "array-contains", userId)
            .get();
        const requests = requestsSnap.docs.map(doc => doc.data());
        // 3️⃣ Create lookup map: key = other user id, value = request
        const requestMap = {};
        requests.forEach(r => {
            console.log(r);
            const otherUserId = r.sender === userId ? r.receiver : r.sender;
            requestMap[otherUserId] = r;
        });
        console.log(requests, "req");
        // 4️⃣ Merge status
        const usersWithStatus = allUsers
            .filter(u => u.id !== userId) // skip self
            .map(u => {
            const request = requestMap[u.id];
            if (request) {
                console.log(request.status);
                if (request.status === "accepted")
                    return { ...u, status: "friends" };
                if (request.sender === userId)
                    return { ...u, status: "request_sent" };
                return { ...u, status: "request_received" };
            }
            return { ...u, status: "no_relation" };
        });
        return res.status(200).json({
            msg: "Success",
            users: usersWithStatus
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({
            msg: "Internal server error",
            error: error.message
        });
    }
};
exports.getUsers = getUsers;
const sendFriendReq = async (req, res) => {
    const receiverId = req.body.id; // whom you're sending to
    const senderId = req.user.uid; // logged-in user
    if (receiverId === senderId) {
        return res.status(400).json({ msg: "You can't send request to yourself" });
    }
    try {
        const usersRef = index_1.db.collection("users");
        // Fetch both user docs
        const [senderDoc, receiverDoc] = await Promise.all([
            usersRef.doc(senderId).get(),
            usersRef.doc(receiverId).get(),
        ]);
        if (!senderDoc.exists || !receiverDoc.exists) {
            return res.status(404).json({ msg: "User not found" });
        }
        // Generate deterministic document ID (sorted)
        const [id1, id2] = [senderId, receiverId].sort();
        const friendDocId = `${id1}_${id2}`;
        const friendDocRef = index_1.db.collection("friends").doc(friendDocId);
        const existingDoc = await friendDocRef.get();
        if (existingDoc.exists) {
            console.log("hiii");
            throw new Error("req sent already");
        }
        // Create friend request document
        await friendDocRef.set({
            sender: senderId,
            senderRef: usersRef.doc(senderId),
            receiver: receiverId,
            receiverRef: usersRef.doc(receiverId),
            status: "pending",
            members: [senderId, receiverId],
            sentAt: index_1.admin.firestore.Timestamp.now(),
            acceptedAt: null,
            chatEnabled: false,
        });
        return res.status(200).json({ msg: "Friend request sent successfully" });
    }
    catch (e) {
        console.error("Error sending friend request:", e);
        return res.status(500).json({ msg: "Internal server error" });
    }
};
exports.sendFriendReq = sendFriendReq;
const acceptFriendReq = async (req, res) => {
    const senderId = req.body.id; // who sent the request
    const receiverId = req.user.uid; // current logged-in user accepting it
    if (senderId === receiverId) {
        return res.status(400).json({ msg: "Invalid request" });
    }
    try {
        // Get deterministic docId
        const [id1, id2] = [senderId, receiverId].sort();
        const docId = `${id1}_${id2}`;
        const friendRef = index_1.db.collection("friends").doc(docId);
        const friendDoc = await friendRef.get();
        if (!friendDoc.exists) {
            return res.status(404).json({ msg: "Friend request not found" });
        }
        const data = friendDoc.data();
        // Check if current user is the receiver
        if (data?.receiver !== receiverId || data?.status !== "pending") {
            return res.status(400).json({ msg: "Invalid friend request or already accepted" });
        }
        // Update the document to accepted
        await friendRef.update({
            status: "accepted",
            acceptedAt: index_1.admin.firestore.Timestamp.now(),
            chatEnabled: true,
        });
        await index_1.db.collection("users").doc(receiverId).collection("notifications").add({
            msg: `you are now friend of ${senderId}`,
            time: index_1.admin.firestore.Timestamp.now()
        });
        await index_1.db.collection("users").doc(senderId).collection("notifications").add({
            msg: `req acccepted you are now friend of ${receiverId}`,
            time: index_1.admin.firestore.Timestamp.now()
        });
        return res.status(200).json({ msg: "Friend request accepted" });
    }
    catch (e) {
        console.error("Error accepting friend request:", e);
        return res.status(500).json({ msg: "Internal server error" });
    }
};
exports.acceptFriendReq = acceptFriendReq;
const sendMessage = async (req, res) => {
    const receiverId = req.body.id;
    const senderId = req.user.uid;
    const messageText = req.body.text;
    const files = req.body.mediaUrl ? req.body.mediaUrl : "";
    if (!messageText || !receiverId) {
        return res.status(400).json({ msg: "Missing message or receiver" });
    }
    try {
        const [id1, id2] = [senderId, receiverId].sort();
        const docId = `${id1}_${id2}`;
        const friendRef = index_1.db.collection("friends").doc(docId);
        const friendDoc = await friendRef.get();
        if (!friendDoc.exists || friendDoc.data()?.status !== "accepted") {
            return res.status(403).json({ msg: "Friendship not accepted yet" });
        }
        if (!friendDoc.data()?.chatEnabled) {
            return res.status(403).json({ msg: "Chat not enabled" });
        }
        await friendRef.collection("messages").add({
            sender: senderId,
            text: messageText,
            mediaUrl: files,
            sentAt: index_1.admin.firestore.Timestamp.now()
        });
        await friendRef.update({
            lastMsg: messageText,
            lastMsgTime: index_1.admin.firestore.Timestamp.now()
        });
        return res.status(200).json({ msg: "Message sent" });
    }
    catch (e) {
        console.error("Error sending message:", e);
        return res.status(500).json({ msg: "Internal server error" });
    }
};
exports.sendMessage = sendMessage;
const getPendingReq = async (req, res) => {
    const user = req.user.uid;
    console.log(user);
    const friendsRef = index_1.db.collection("friends");
    try {
        console.log("hii");
        const snapshot = await friendsRef.
            where("receiver", "==", user).
            where("status", "==", "pending").
            get();
        const pendingReq = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return res.status(200).json({
            msg: "req extracted successufully",
            requests: pendingReq,
        });
    }
    catch (e) {
        console.log(e);
        return res.status(400).json({
            msg: "internal server error"
        });
    }
};
exports.getPendingReq = getPendingReq;
const getFriends = async (req, res) => {
    const user = req.user.uid;
    const friendsRef = index_1.db.collection("friends");
    try {
        const snap = await friendsRef
            .where("members", "array-contains", user)
            .where("status", "==", "accepted")
            .get();
        const friends = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return res.status(200).json({
            msg: "success",
            friends
        });
    }
    catch (e) {
        console.error("Error getting friends:", e);
        return res.status(500).json({
            msg: "internal server error",
            error: e.message
        });
    }
};
exports.getFriends = getFriends;
