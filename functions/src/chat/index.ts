import {
  FieldValue,
  CollectionReference,
  DocumentReference,
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
  ThreadMessage,
} from "../types/ThreadMessage";
import {sendNotificationToUser} from "../notification";

export async function sendChannelMessage(data: { chatId: string; content: string; type: string; }, uid: string) {
  try {
    const message = await ChatCollection.doc(data.chatId).collection("messages").add(
      {
        "content": data.content,
        "type": data.type,
        "timestamp": FieldValue.serverTimestamp(),
        "user": UserCollection.doc(uid),
      }
    );
    await ChatCollection.doc(data.chatId).update( {
      "lastMessage": message,
    });
    await markReadMessageForMember(data.chatId, uid, message.id);
    sendPushNotifications(data.chatId, uid, data.content, message.id);
  } catch (e) {
    console.log(e);
  }
}

export async function sendThreadMessage(data: { chatId: string; messageId: string; threadId: string; content: string; type: string; }, uid: string) {
  try {
    const messageDoc = ChatCollection.doc(data.chatId)
      .collection("messages")
      .doc(data.messageId);
      // Create thread doc
    const threadDoc = messageDoc
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
        "user": UserCollection.doc(uid),
      }
    );
    await ChatCollection.doc(data.chatId).update( {
      "lastMessage": message,
    });
    await markReadMessageForMember(data.chatId, uid, messageDoc.id);
    sendPushNotifications(data.chatId, uid, data.content, message.id);
  } catch (e) {
    console.log(e);
  }
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
    });
  }
}

export async function createChannel(data: { name: string; type: string; private: boolean; users: User[]; }): Promise<string> {
  const chatCreateRes = await ChatCollection.add({
    "name": data.name,
    "type": data.type,
    "private": data.private,
    "readOnly": false,
    "createdOn": FieldValue.serverTimestamp(),
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
}

export async function addMemberToChat(chatId: string, user: User) {
  const chatRef = ChatCollection.doc(chatId);
  const userRef = UserCollection.doc(user.uid);

  if (!(await userRef.get()).exists) {
    await userRef.set({
      "displayName": user.displayName,
      "uid": user.uid,
      "type": "user",
      "createdOn": FieldValue.serverTimestamp(),
    });
  }

  // Add channel record to user document
  await userRef.update({
    channels: FieldValue.arrayUnion(chatRef),
  });

  // Add member to channel with latest lastSeen
  await chatRef.collection("members").doc(user.uid).set({
    "user": userRef,
    "lastSeen": await getLastMessage(chatId),
    "active": true,
    "type": user.type,
  });
  return;
}

export async function removeMemberFromChat(chatId: string, userId: string) {
  await ChatCollection.doc(chatId).update({
    members: FieldValue.arrayRemove(UserCollection.doc(userId)),
  });
  await UserCollection.doc(userId).update({
    channels: FieldValue.arrayRemove(ChatCollection.doc(chatId)),
  });
  return;
}

export async function getBadgeCount(userId: string) {
  let totalCount = 0;
  const user = await UserCollection.doc(userId).get();
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

export async function setAllMessagesAsRead(chatId: string, userId: string) {
  const message = await getLastMessage(chatId);
  if (message) {
    await markReadMessageForMember(chatId, userId, message.id);
  }
}

export async function getLastMessage(chatId: string) {
  const messages = await ChatCollection.doc(chatId).collection("messages").orderBy("timestamp", "desc").limit(1).get();
  if (messages.size > 0) {
    return messages.docs[0].ref;
  }
  return null;
}

export async function markReadMessageForMember(chatId: string, userId: string, messageId: string) {
  await updateMemberDocument(chatId, userId, {
    "lastSeen": ChatCollection.doc(chatId).collection("messages").doc(messageId),
  });
}

export async function setTyping(chatId: string, userId: string) {
  await updateMemberDocument(chatId, userId, {
    "lastType": FieldValue.serverTimestamp(),
  });
}

export async function updateMemberDocument(chatId: string, userId: string, document: { [x: string]: FieldValue | DocumentReference; }) {
  const memberSnap = ChatCollection.doc(chatId).collection("members").doc(userId);
  if ((await memberSnap.get()).exists) {
    await memberSnap.update(document);
  }
}
export async function sendPushNotifications(chatId: string, userId: string, content: string, messageId: string) {
  const fromUser = await UserCollection.doc(userId).get();
  const chatChannel = await ChatCollection.doc(chatId).get();
  const members = await ChatCollection.doc(chatId).collection("members").get();

  for (const memberref of members.docs) {
    try {
      await sendNotificationToUser(
        {
          toUser: memberref.ref.id,
          title: `${fromUser.data()?.displayName} has sent a message on ${chatChannel.data()?.name}`,
          content: content,
          tag: messageId,
          badgeCount: await getBadgeCount(memberref.ref.id),
          collapseKey: chatId,
          data: {
            "userId": userId,
            "chatId": chatId,
            "type": "chat",
          },
        }
      );
    } catch (e) {
      console.log(e);
    }
  }
}
