import { admin, db, auth } from "../firebase/index";
import { query, collection, where, getDocs } from "firebase/firestore";
import dotenv from "dotenv";
// import { User } from "../types/user";
import { FieldValue, arrayUnion } from "firebase/firestore";
export const getUsers = async (req: any, res: any) => {
  console.log("getUsers");
  try {
    const userId = req.user.uid;

    // 1️⃣ Fetch all users
    const usersSnap = await db.collection("users").get();
    if (usersSnap.empty) {
      return res.status(404).json({ msg: "No users exist" });
    }

    const allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2️⃣ Fetch all friend requests involving current user
    const requestsSnap = await db.collection("friends")
      .where("members", "array-contains", userId)
      .get();

    const requests = requestsSnap.docs.map(doc => doc.data());

    // 3️⃣ Create lookup map: key = other user id, value = request
    const requestMap: Record<string, any> = {};
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
          if (request.status === "accepted") return { ...u, status: "friends" };
          if (request.sender === userId) return { ...u, status: "request_sent" };
          return { ...u, status: "request_received" };
        }

        return { ...u, status: "no_relation" };
      });

    return res.status(200).json({
      msg: "Success",
      users: usersWithStatus
    });

  } catch (error: any) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      msg: "Internal server error",
      error: error.message
    });
  }
};

export const sendFriendReq = async (req: any, res: any) => {
  const receiverId = req.body.id;      // whom you're sending to
  const senderId = req.user.uid;       // logged-in user

  if (receiverId === senderId) {
    return res.status(400).json({ msg: "You can't send request to yourself" });
  }

  try {
    const usersRef = db.collection("users");

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
    const friendDocRef = db.collection("friends").doc(friendDocId);

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
      sentAt: admin.firestore.Timestamp.now(),
      acceptedAt: null,
      chatEnabled: false,
    });

    return res.status(200).json({ msg: "Friend request sent successfully" });

  } catch (e) {
    console.error("Error sending friend request:", e);
    return res.status(500).json({ msg: "Internal server error" });
  }
};


export const acceptFriendReq = async (req: any, res: any) => {
  const senderId = req.body.id;     // who sent the request
  const receiverId = req.user.uid;  // current logged-in user accepting it

  if (senderId === receiverId) {
    return res.status(400).json({ msg: "Invalid request" });
  }

  try {
    // Get deterministic docId
    const [id1, id2] = [senderId, receiverId].sort();
    const docId = `${id1}_${id2}`;
    const friendRef = db.collection("friends").doc(docId);

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
      acceptedAt: admin.firestore.Timestamp.now(),
      chatEnabled: true,
    });
    await db.collection("users").doc(receiverId).collection("notifications").add({
      msg: `you are now friend of ${senderId}`,
      time: admin.firestore.Timestamp.now()
    })

    await db.collection("users").doc(senderId).collection("notifications").add({
      msg: `req acccepted you are now friend of ${receiverId}`,
      time: admin.firestore.Timestamp.now()
    })

    return res.status(200).json({ msg: "Friend request accepted" });

  } catch (e) {
    console.error("Error accepting friend request:", e);
    return res.status(500).json({ msg: "Internal server error" });
  }
};


export const sendMessage = async (req: any, res: any) => {
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

    const friendRef = db.collection("friends").doc(docId);
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
      sentAt: admin.firestore.Timestamp.now()
    });
    await friendRef.update({
      lastMsg: messageText,
      lastMsgTime: admin.firestore.Timestamp.now()
    })

    return res.status(200).json({ msg: "Message sent" });
  } catch (e) {
    console.error("Error sending message:", e);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

export const getPendingReq = async (req: any, res: any) => {
  const user = req.user.uid;
  console.log(user);
  const friendsRef = db.collection("friends");
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
    })
  } catch (e) {
    console.log(e);
    return res.status(400).json({
      msg: "internal server error"
    })
  }
}


export const getFriends = async (req: any, res: any) => {
  const user = req.user.uid;
  const friendsRef = db.collection("friends");

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

  } catch (e: any) {
    console.error("Error getting friends:", e);
    return res.status(500).json({
      msg: "internal server error",
      error: e.message
    });
  }
};
