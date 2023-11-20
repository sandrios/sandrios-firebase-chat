
import {
  initializeApp,
} from "firebase-admin/app";

initializeApp();

import * as express from "express";
import useMiddlewares from "./middlewares";

const app = express();
useMiddlewares(app);

import {
  getMessaging,
} from "firebase-admin/messaging";
import {
  onCall,
  onRequest,
  HttpsError,
} from "firebase-functions/v2/https";
import {
  getFirestore,
  FieldValue,
  CollectionReference,
  DocumentReference,
} from "firebase-admin/firestore";

import {User} from "./types/User";
import {Member} from "./types/Member";
import {Channel} from "./types/Channel";
import {ThreadMessage} from "./types/ThreadMessage";

// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
exports.app = onRequest(app);

const Chats = getFirestore().collection("chats") as CollectionReference<Channel>;
const Users = getFirestore().collection("users") as CollectionReference<User>;

/**
 *  Create a new Chat Channel
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  @param {string} name Name of the channel
 *  @param {string} type Type of channel ("direct", "group")
 *  @param {string} private Boolean flag to indicate if this is protected group or public chat channel
 */
exports.createChannel = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await createChannel(request.data);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Rename a existing Group Chat Channel
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  @param {string} name Name of the channel
 *  @param {string} chatId ID of the channel to be renamed
 */
exports.renameChannel = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await renameChannel(request.data);
  } catch (e) {
    console.log(e);
  }
  return;
});


/**
 *  Deactivate a existing Group Chat Channel
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  @param {string} chatId ID of the channel to be deactivated
 */
exports.deactivateChannel = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await deactivateChannel(request.data);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Add Member to chat channel
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  @param {string} chatId ID of the channel to which user should be added
 */
exports.addMember = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await addMemberToChat(request.data.chatId, request.data.user);
  } catch (e) {
    console.log(e);
  }
  return;
});


/**
 *  Add Members to chat channel
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  @param {string} chatId ID of the channel to which user should be added
 */
exports.addMembers = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await addMembersToChat(request.data.chatId, request.data.users);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Remove Member from chat channel
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  @param {string} chatId ID of the channel from which user should be removed
 */
exports.removeMember = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await removeMemberFromChat(request.data.chatId, request.data.userId);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Register Device
 *  This will create user entry in the firestore if not present
 *  This will also remove previously added token for other user and add the token to current user
 *
 *  @param {string} token FCM token to send push notifications
 *  @param {string} displayName Display Name of the user
 */
exports.registerDevice = onCall(async (request) => {
  await validateUser(request.auth?.uid);
  return await registerUser(request.data, request.auth?.uid as string);
});

/**
 *  Edit User name
 *  This will create user entry in the firestore if not present
 *  This will also remove previously added token for other user and add the token to current user
 *
 *  @param {string} displayName Display Name of the user
 */
exports.editUser = onCall(async (request) => {
  await validateUser(request.auth?.uid);
  return await editUser(request.data, request.auth?.uid as string);
});

/**
 *  Unregister device
 *  This will remove the fcmToken from the firestore if present
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  To prevent chat notifications after logout
 *
 *  @param {string} token FCM token to stop sending notifications
 */
exports.unregisterDevice = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await unregisterToken(request.auth?.uid as string, request.data.token);
  } catch (e) {
    console.log(e);
  }
  return {"error": "Bad reqeust"};
});

/**
 *  Send Message
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  This will send push notifications to every user present in the channel
 *
 *  @param {string} chatId ID of the chat channel
 *  @param {string} type Type of message ("text", "image", "video")
 *  @param {string} content Payload based on the type of message
 */
exports.sendMessage = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await sendChannelMessage(request.data, request.auth?.uid as string);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Send Thread Message
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  This will send push notifications to every user present in the channel
 *
 *  @param {string} chatId ID of the chat channel
 *  @param {string} messageId ID of the chat message which thread needs to nest to
 *  @param {string} threadId ID of the new thread that needs to be started. This has been added to keep
 *                           it unique in case there only needs to be one unique thread per user.
 *  @param {string} type Type of message ("text", "image", "video")
 *  @param {string} content Payload based on the type of message
 */
exports.sendThreadMessage = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await sendThreadMessage(request.data, request.auth?.uid as string);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Set all messages in the chat channel as read for the user
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  @param {string} chatId ID of the chat channel
 */
exports.setAllMessagesAsRead = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await setAllMessagesAsRead(request.data.chatId, request.auth?.uid as string);
  } catch (e) {
    console.log(e);
  }
  return;
});


/**
 *  Set typing timestamp for member in channel
 *  Can only be accessed by only authorized Firebase Users.
 *
 *  @param {string} chatId ID of the chat channel
 */
exports.setTyping = onCall(async (request) => {
  try {
    await validateUser(request.auth?.uid);
    await setTyping(request.data.chatId, request.auth?.uid as string);
  } catch (e) {
    console.log(e);
  }
  return;
});

async function sendChannelMessage(data: { chatId: string; content: string; type: string; }, uid: string) {
  try {
    const message = await Chats.doc(data.chatId).collection("messages").add(
      {
        "content": data.content,
        "type": data.type,
        "timestamp": FieldValue.serverTimestamp(),
        "user": Users.doc(uid),
      }
    );
    await setAllMessagesAsRead(data.chatId, uid);
    await sendPushNotifications(data.chatId, uid, data.content, message.id);
  } catch (e) {
    console.log(e);
  }
}

async function sendThreadMessage(data: { chatId: string; messageId: string; threadId: string; content: string; type: string; }, uid: string) {
  try {
    // Create thread doc
    const threadDoc = Chats.doc(data.chatId)
      .collection("messages")
      .doc(data.messageId)
      .collection("threads")
      .doc(data.threadId);
    threadDoc.set({"uuid": data.threadId});
    // Add message in threadMessages doc
    const threadMessagesDoc = threadDoc.collection("threadMessages") as CollectionReference<ThreadMessage>;
    const message = await threadMessagesDoc.add(
      {
        "content": data.content,
        "type": data.type,
        "timestamp": FieldValue.serverTimestamp(),
        "user": Users.doc(uid),
      }
    );
    await setAllMessagesAsRead(data.chatId, uid);
    await sendPushNotifications(data.chatId, uid, data.content, message.id);
  } catch (e) {
    console.log(e);
  }
}

async function registerUser(data: { token: string; displayName: string; }, uid: string) {
  try {
    const userRef = Users.doc(uid);
    let userDoc = await userRef.get();
    if (userDoc.exists) {
      await registerToken(userRef, data.token);
    } else {
      await userRef.set({
        "displayName": data.displayName,
        "id": uid,
        "type": "",
        "createdOn": FieldValue.serverTimestamp(),
      });
      await registerToken(userRef, data.token);
      userDoc = await userRef.get();
    }
    return userDoc.data();
  } catch (e) {
    console.log(e);
  }
  return new HttpsError(
    "invalid-argument",
    "Bad Request"
  );
}

async function editUser(data: { uuid: string; displayName: string; }, uid: string) {
  const userRef = Users.doc(data.uuid);
  const userDoc = await userRef.get();
  if (userDoc.exists) {
    await userRef.update({
      "displayName": data.displayName,
    });
  } else {
    await userRef.set({
      "displayName": data.displayName,
      "id": uid,
      "type": "user",
      "createdOn": FieldValue.serverTimestamp(),
    });
  }
}

async function registerToken(userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, token: string) {
  const users = await Users.where("tokens", "array-contains", token).get();
  for (const user of users.docs) {
    /* eslint-disable */
        await unregisterToken(user.id, token)
        /* eslint-enable */
  }
  await userRef.update({
    tokens: FieldValue.arrayUnion(token),
  });
}

async function unregisterToken(uid: string, token: string) {
  const userRef = Users.doc(uid);
  await userRef.update({
    tokens: FieldValue.arrayRemove(token),
  });
}

async function createChannel(data: { name: string; type: string; private: boolean; users: User[]; }) {
  const chatCreateRes = await Chats.add({
    "name": data.name,
    "type": data.type,
    "private": data.private,
    "readOnly": false,
    "createdOn": FieldValue.serverTimestamp(),
  });
  if (data.users != null) {
    await addMembersToChat(chatCreateRes.id, data.users);
  }
  return;
}

async function renameChannel(data: { chatId: string; name: string; }) {
  Chats.doc(data.chatId).update({
    "name": data.name,
  });
  return;
}

async function deactivateChannel(data: { chatId: string; }) {
  Chats.doc(data.chatId).update({
    "readOnly": true,
  });
  return;
}

async function addMembersToChat(chatId: string, users: User[]) {
  for (let i = 0; i < users.length; i++) {
    await addMemberToChat(chatId, users[i]);
  }
}

async function addMemberToChat(chatId: string, user: User) {
  const chatRef = Chats.doc(chatId);
  const userRef = Users.doc(user.id);

  if (!(await userRef.get()).exists) {
    await userRef.set({
      "displayName": user.displayName,
      "id": user.id,
      "type": "user",
      "createdOn": FieldValue.serverTimestamp(),
    });
  }

  // Add channel record to user document
  await userRef.update({
    channels: FieldValue.arrayUnion(chatRef),
  });

  // Add member to channel before fetching lastSeen
  await chatRef.collection("members").doc(user.id).set({
    "user": userRef,
    "lastSeen": null,
    "active": true,
    "type": user.type,
  });

  await setAllMessagesAsRead(chatId, user.id);
  return;
}

async function removeMemberFromChat(chatId: string, userId: string) {
  await Chats.doc(chatId).update({
    members: FieldValue.arrayRemove(Users.doc(userId)),
  });
  await Users.doc(userId).update({
    channels: FieldValue.arrayRemove(Chats.doc(chatId)),
  });
  return;
}

async function sendPushNotifications(chatId: string, userId: string, content: string, messageId: string) {
  const fromUser = await Users.doc(userId).get();
  const chatChannel = await Chats.doc(chatId).get();
  const members = await Chats.doc(chatId).collection("members").get();

  for (const memberref of members.docs) {
    /* eslint-disable */
        try {
            const user = await Users.doc(memberref.ref.id).get();
            const badgeCount = await getBadgeCount(user.id)
            const payload = {
                notification: {
                    title: `${fromUser.data()?.displayName} has sent a message on ${chatChannel.data()?.name}`,
                    body: content,
                    badge: `${badgeCount}`,
                    tag: messageId
                },
                data: {
                    "userId": userId,
                    "chatId": chatId,
                    "type": "chat"
                }
            }
            const options = {
                "collapseKey": chatId
            }
            const a = await getMessaging().sendToDevice(user.data()?.tokens ?? [], payload, options)
            console.log(a)
        } catch (e) {
            console.log(e)
        }
        /* eslint-enable */
  }
}

async function getBadgeCount(userId: string) {
  let totalCount = 0;
  const user = await Users.doc(userId).get();
  for (const channelRef of user.data()?.channels ?? []) {
    /* eslint-disable */
        try {
            const memberRef = channelRef.collection("members").doc(user.id) as DocumentReference<Member>;
            const member = await memberRef.get();
            var lastSeenMessage = null
            if (member.data()?.lastSeen) {
                lastSeenMessage = await member.data()!.lastSeen.get()
            }
            var queryRef = channelRef.collection("messages").orderBy('timestamp', 'desc')
            if (lastSeenMessage) {
                if (lastSeenMessage.exists) {
                    queryRef = queryRef.endBefore(lastSeenMessage)
                }
            }
            const chatChannel = await queryRef.get()
            totalCount = totalCount + chatChannel.size
        } catch (e) {
            console.log(e)
        }
        /* eslint-enable */
  }
  return totalCount;
}

async function setAllMessagesAsRead(chatId: string, userId: string) {
  const messages = await Chats.doc(chatId).collection("messages").orderBy("timestamp", "desc").limit(1).get();
  if (messages.size > 0) {
    await updateMemberDocument(chatId, userId, {
      "lastSeen": messages.docs[0].ref,
    });
  }
}

async function setTyping(chatId: string, userId: string) {
  await updateMemberDocument(chatId, userId, {
    "lastType": FieldValue.serverTimestamp(),
  });
}

async function updateMemberDocument(chatId: string, userId: string, document: { [x: string]: FieldValue | DocumentReference; }) {
  const memberSnap = Chats.doc(chatId).collection("members").doc(userId);
  if ((await memberSnap.get()).exists) {
    await memberSnap.update(document);
  }
}

async function validateUser(authUid: string | undefined) {
  if ((typeof authUid === "string" && authUid.length === 0)) {
    return;
  }
  throw new HttpsError(
    "unauthenticated",
    "Unauthorized"
  );
}
