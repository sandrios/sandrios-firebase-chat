import {FieldValue} from "firebase-admin/firestore";

import {
  DataMessagePayload,
  Message,
  getMessaging,
} from "firebase-admin/messaging";

import {
  HttpsError,
} from "firebase-functions/v2/https";

import {
  UserCollection,
} from "../constants";

import {
  DeviceToken,
} from "../types/DeviceToken";

export async function registerUser(data: { token: DeviceToken; displayName: string; }, uid: string) {
  try {
    const userRef = UserCollection.doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        "displayName": data.displayName,
        "uid": uid,
        "type": "user",
        "createdOn": FieldValue.serverTimestamp(),
        "tokens": [],
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


export async function registerToken(userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, token: DeviceToken) {
  const users = await UserCollection.where("tokens", "array-contains", token).get();
  for (const user of users.docs) {
    await unregisterToken(user.id, token);
  }
  await userRef.update({
    tokens: FieldValue.arrayUnion(token),
  });
}

export async function unregisterToken(uid: string, token: DeviceToken) {
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
  tag,
  data,
  collapseKey,
}: TSNotification) {
  const user = await UserCollection.doc(toUser).get();
  const userDoc = user.data();
  if (userDoc != null && userDoc.tokens != null) {
    for (const token of userDoc.tokens) {
      console.log(data);
      const message: Message = {
        notification: {
          title: title,
          body: content,
        },
        android: {
          collapseKey: collapseKey,
          notification: {
            title: title,
            body: content,
            tag: tag,
            channelId: collapseKey,
          },
          data: data,
        },
        apns: {
          payload: {
            aps: {
              badge: badgeCount,
              threadId: collapseKey,
              alert: {
                title: title,
                body: content,
              },
              data: data,
            },
          },
        },
        webpush: {
          notification: {
            title: title,
            body: content,
          },
          data: data,
        },
        token: token.token,
      };
      const response = await getMessaging().send(message);
      console.log(response);
    }
  }
}

interface TSNotification {
  toUser: string,
  title: string,
  content?: string,
  tag?: string,
  badgeCount: number,
  collapseKey?: string,
  data?: DataMessagePayload,
}
