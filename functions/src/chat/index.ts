import {
  FieldValue,
  DocumentReference,
  Timestamp,
} from "firebase-admin/firestore";

import {
  UserCollection,
  ChatCollection,
} from "../constants";

import {
  User,
} from "../types/User";

import {
  Member,
} from "../types/Member";

import {
  ChatMessage,
} from "../types/ChatMessage";

import {
  sendNotificationToUser,
} from "../notification";
import {onDocumentCreated} from "firebase-functions/v2/firestore";

export async function addToDefaultChannels(
  uid: string,
) {
  try {
    await setupDefaultChannel("general", uid);
    await setupDefaultChannel("game-on", uid);
  } catch (e) {
    console.log(e);
  }
  return;
}

/**
 *  Invoke on new user document creation
 */
export const setupUser = onDocumentCreated("user/{userId}", async (event) => {
  try {
    await addToDefaultChannels(event.params.userId);
  } catch (e) {
    console.log(e);
  }
  return;
});

async function setupDefaultChannel(channelName: string, userId: string) {
  const channelQuery = await ChatCollection.where("name", "==", channelName).limit(1).get();
  const user = {uid: userId, tokens: []};
  if (channelQuery.empty) {
    await createChannel({
      name: channelName,
      private: false,
      type: "group",
      users: [user],
    });
  } else {
    await addMemberToChat(channelQuery.docs[0].id, user);
  }
  return;
}

export async function sendChannelMessage(
  data: ChatMessage,
  uid: string,
) {
  try {
    const timestamp = Timestamp.now();
    await ChatCollection
      .doc(data.chatId)
      .collection("messages")
      .doc(data.messageId).set(
        {
          "content": data.content,
          "rawText": data.rawText,
          "type": data.type,
          "timestamp": timestamp,
          "user": UserCollection.doc(uid),
          "attachments": data.attachments,
          "mentions": data.mentions,
        }
      );
    await ChatCollection
      .doc(data.chatId)
      .update({
        "lastModified": timestamp,
      });
    await setAllMessagesAsRead(data.chatId, uid);
    await sendPushNotifications(data.chatId, uid, data.rawText, data.messageId);
  } catch (e) {
    console.log(e);
  }
  return;
}

export async function deleteChannelMessage(
  data: {
    chatId: string;
    messageId: string;
  },
) {
  try {
    await ChatCollection
      .doc(data.chatId)
      .collection("messages")
      .doc(data.messageId).delete();
  } catch (e) {
    console.log(e);
  }
  return;
}

export async function sendThreadMessage(
  data: ChatMessage, uid: string,
) {
  try {
    const timestamp = Timestamp.now();
    await ChatCollection.doc(data.chatId)
      .collection("messages")
      .doc(data.messageId).update(
        {
          "threadMessages": FieldValue.arrayUnion({
            "content": data.content,
            "rawText": data.rawText,
            "type": data.type,
            "timestamp": timestamp,
            "user": UserCollection.doc(uid),
            "attachments": data.attachments,
            "mentions": data.mentions,
          }),
        }
      );

    await setAllMessagesAsRead(data.chatId, uid);
    await sendPushNotifications(data.chatId, uid, data.rawText, data.messageId);
  } catch (e) {
    console.log(e);
  }
  return;
}

export async function editUser(data: { uuid: string; displayName: string; }, uid: string) {
  const userRef = UserCollection.doc(data.uuid);
  const userDoc = await userRef.get();
  if (userDoc.exists) {
    await userRef.update({
      "displayName": data.displayName,
    });
  } else {
    await userRef.set({
      "displayName": data.displayName,
      "uid": uid,
      "type": "user",
      "createdOn": FieldValue.serverTimestamp(),
      "tokens": [],
    });
  }
  return;
}

export async function createChannel(data: { name: string; type: string; private: boolean; users: User[]; }): Promise<string> {
  const chatCreateRes = await ChatCollection.add({
    "name": data.name,
    "type": data.type,
    "private": data.private,
    "readOnly": false,
    "createdOn": FieldValue.serverTimestamp(),
    "lastModified": FieldValue.serverTimestamp(),
  });
  if (data.users != null) {
    await addMembersToChat(chatCreateRes.id, data.users);
  }
  return chatCreateRes.id;
}

export async function renameChannel(data: { chatId: string; name: string; }) {
  ChatCollection.doc(data.chatId).update({
    "name": data.name,
  });
  return;
}

export async function deactivateChannel(data: { chatId: string; }) {
  ChatCollection.doc(data.chatId).update({
    "readOnly": true,
  });
  return;
}

export async function addMembersToChat(chatId: string, users: User[]) {
  for (let i = 0; i < users.length; i++) {
    await addMemberToChat(chatId, users[i]);
  }
  return;
}

export async function addMemberToChat(chatId: string, user: User) {
  const chatRef = ChatCollection.doc(chatId);
  const userRef = UserCollection.doc(user.uid);

  const memberDoc = await chatRef
    .collection("members")
    .doc(user.uid).get();

  if (memberDoc.exists) return;

  // Add channel record to user document
  await userRef.update({
    channels: FieldValue.arrayUnion(chatRef),
  });

  // Add member to channel with latest lastSeen
  await memberDoc.ref.set({
    "user": userRef,
    "lastSeen": FieldValue.serverTimestamp(),
    "active": true,
    "type": user.type,
  });
  return;
}

export async function removeMemberFromChat(chatId: string, userId: string) {
  const chatRef = ChatCollection.doc(chatId);

  await chatRef
    .collection("members")
    .doc(userId)
    .delete();

  await UserCollection.doc(userId).update({
    channels: FieldValue.arrayRemove(chatRef),
  });
  return;
}

export async function getBadgeCount(userId: string) {
  let totalCount = 0;
  const user = await UserCollection.doc(userId).get();
  for (const channelRef of user.data()?.channels ?? []) {
    try {
      const memberRef = channelRef.collection("members").doc(user.id) as DocumentReference<Member>;
      const member = await memberRef.get();

      let messageCountRef = channelRef
        .collection("messages")
        .orderBy("timestamp", "desc");

      if (member.data()?.lastSeen != null) {
        messageCountRef = messageCountRef.where(
          "timestamp", ">", member.data()?.lastSeen,
        );
      }

      const messageCount = await messageCountRef.count().get();
      totalCount = totalCount + messageCount.data().count;
    } catch (e) {
      console.log(e);
    }
  }
  return totalCount;
}

export async function setAllMessagesAsRead(chatId: string, userId: string) {
  await updateMemberDocument(chatId, userId, {
    "lastSeen": FieldValue.serverTimestamp(),
  });
  return;
}

export async function setTyping(chatId: string, userId: string) {
  await updateMemberDocument(chatId, userId, {
    "lastType": FieldValue.serverTimestamp(),
  });
  return;
}

export async function updateMemberDocument(chatId: string, userId: string, document: { [x: string]: FieldValue | DocumentReference; }) {
  const memberSnap = ChatCollection.doc(chatId).collection("members").doc(userId);
  if ((await memberSnap.get()).exists) {
    await memberSnap.update(document);
  }
  return;
}

export async function sendPushNotifications(chatId: string, userId: string, content: string, messageId: string) {
  const fromUser = await UserCollection.doc(userId).get();
  const chatChannel = await ChatCollection.doc(chatId).get();
  const members = await ChatCollection.doc(chatId).collection("members").get();

  for (const memberDoc of members.docs) {
    try {
      if (userId != memberDoc.id) {
        await sendNotificationToUser(
          {
            toUser: memberDoc.id,
            title: `${fromUser.data()?.displayName} has sent a message on ${chatChannel.data()?.name}`,
            content: content,
            tag: messageId,
            badgeCount: await getBadgeCount(memberDoc.ref.id),
            collapseKey: chatId,
            data: {
              "userId": userId,
              "chatId": chatId,
              "type": "chat",
            },
          }
        );
      }
    } catch (e) {
      console.log(e);
    }
  }
  return;
}
