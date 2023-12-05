import {FieldValue} from "firebase-admin/firestore";

import {
  DataMessagePayload,
  MulticastMessage,
  getMessaging,
} from "firebase-admin/messaging";

import {
  HttpsError,
} from "firebase-functions/v2/https";

import {
  UserCollection,
} from "../constants";

export async function registerUser(data: { token: string; displayName: string; }, uid: string) {
  try {
    const userRef = UserCollection.doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        "displayName": data.displayName,
        "uid": uid,
        "type": "user",
        "createdOn": FieldValue.serverTimestamp(),
      });
    }
    await registerToken(userRef, data.token);
    return;
  } catch (e) {
    console.log(e);
  }
  return new HttpsError(
    "invalid-argument",
    "Bad Request"
  );
}


export async function registerToken(userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, token: string) {
  const users = await UserCollection.where("tokens", "array-contains", token).get();
  for (const user of users.docs) {
    await unregisterToken(user.id, token);
  }
  await userRef.update({
    tokens: FieldValue.arrayUnion(token),
  });
}

export async function unregisterToken(uid: string, token: string) {
  const userRef = UserCollection.doc(uid);
  await userRef.update({
    tokens: FieldValue.arrayRemove(token),
  });
}

export async function sendNotificationToUser({
  toUser,
  title,
  content,
  badgeCount,
  data,
  collapseKey,
}: TSNotification) {
  const user = await UserCollection.doc(toUser).get();
  const message: MulticastMessage = {
    notification: {
      title: title,
      body: content,
      // tag: tag,
    },
    android: {
      collapseKey: collapseKey,
    },
    apns: {
      payload: {
        aps: {
          threadId: collapseKey,
          badge: badgeCount,
        },
      },
    },
    webpush: {
      notification: { },
    },
    data: data,
    tokens: user.data()?.tokens ?? [],
  };
  await getMessaging().sendEachForMulticast(message);
}

interface TSNotification {
  toUser: string,
  title: string,
  content: string,
  badgeCount: number,
  collapseKey: string,
  data: DataMessagePayload,
}
