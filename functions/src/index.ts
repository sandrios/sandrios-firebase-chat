import {
  initializeApp,
} from "firebase-admin/app";

initializeApp();

import {
  onCall,
  HttpsError,
} from "firebase-functions/v2/https";

import {
  AuthData,
} from "firebase-functions/lib/common/providers/https";

import {
  getS3SignedUrlUpload,
  deleteS3Object,
} from "./s3";

import {
  addMemberToChat,
  addMembersToChat,
  createChannel,
  deactivateChannel,
  editUser,
  markReadMessageForMember,
  removeMemberFromChat,
  renameChannel,
  sendChannelMessage,
  sendThreadMessage,
  setAllMessagesAsRead,
  setTyping,
} from "./chat";

import {
  registerUser,
  unregisterToken,
  sendNotificationToUser,
} from "./notification";


/**
 *  Create a new Chat Channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} name Name of the channel
 *  @param {string} type Type of channel ("direct", "group")
 *  @param {string} private Boolean flag to indicate if this is protected group or public chat channel
 *  @param {User[]} users List of User {displayName, uid, type} to be added to the channel
 */
exports.createChannel = onCall(async (request) => {
  validateUser(request.auth);
  try {
    return await createChannel(request.data);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Rename a existing Group Chat Channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} name Name of the channel
 *  @param {string} chatId ID of the channel to be renamed
 */
exports.renameChannel = onCall(async (request) => {
  validateUser(request.auth);
  try {
    await renameChannel(request.data);
  } catch (e) {
    console.log(e);
  }
  return;
});


/**
 *  Deactivate a existing Group Chat Channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the channel to be deactivated
 */
exports.deactivateChannel = onCall(async (request) => {
  validateUser(request.auth);
  try {
    await deactivateChannel(request.data);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Add Member to chat channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the channel to which user should be added
 *  @param {User} user {displayName, uid, type} to be added to the channel
 */
exports.addMember = onCall(async (request) => {
  validateUser(request.auth);
  try {
    await addMemberToChat(request.data.chatId, request.data.user);
  } catch (e) {
    console.log(e);
  }
  return;
});


/**
 *  Add Members to chat channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the channel to which user should be added
 *  @param {User[]} users List of User {displayName, uid, type} to be added to the channel
 */
exports.addMembers = onCall(async (request) => {
  validateUser(request.auth);
  try {
    await addMembersToChat(request.data.chatId, request.data.users);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Remove Member from chat channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the channel from which user should be removed
 *  @param {string} userId ID of the user to be removed
 */
exports.removeMember = onCall(async (request) => {
  validateUser(request.auth);
  try {
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
  validateUser(request.auth);
  await registerUser(request.data, request.auth?.uid as string);
  return;
});

/**
 *  Edit User name
 *  This will create user entry in the firestore if not present
 *  This will also remove previously added token for other user and add the token to current user
 *
 *  @param {string} displayName Display Name of the user
 */
exports.editUser = onCall(async (request) => {
  validateUser(request.auth);
  return await editUser(request.data, request.auth?.uid as string);
});

/**
 *  Unregister device
 *  This will remove the fcmToken from the firestore if present
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  To prevent chat notifications after logout
 *
 *  @param {string} token FCM token to stop sending notifications
 */
exports.unregisterDevice = onCall(async (request) => {
  validateUser(request.auth);
  try {
    await unregisterToken(request.auth?.uid as string, request.data.token);
  } catch (e) {
    console.log(e);
  }
  return {"error": "Bad reqeust"};
});

/**
 *  Send Message
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  This will send push notifications to every user present in the channel
 *
 *  @param {string} chatId ID of the chat channel
 *  @param {string} messageId ID of message document (For local storage)
 *  @param {string} type Type of message ("text", "image", "video")
 *  @param {string} content Payload based on the type of message
 */
exports.sendMessage = onCall(async (request) => {
  validateUser(request.auth);
  try {
    await sendChannelMessage(request.data, request.auth?.uid as string);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Send Thread Message
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  This will send push notifications to every user present in the channel
 *
 *  @param {string} chatId ID of the chat channel
 *  @param {string} messageId ID of the chat message which thread needs to nest to
 *  @param {string} threadId ID of the new thread that needs to be started. This has been added to keep
 *                           it unique in case there only needs to be one unique thread per user.
 *  @param {string} type Type of message ("text", "image", "video")
 *  @param {string} content Payload based on the type of message
*  @param {string} threadMessageId ID of thread message document (For local storage)
 */
exports.sendThreadMessage = onCall(async (request) => {
  validateUser(request.auth);
  try {
    await sendThreadMessage(request.data, request.auth?.uid as string);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Set all messages in the chat channel as read for the user
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the chat channel
 */
exports.setAllMessagesAsRead = onCall(async (request) => {
  validateUser(request.auth);
  try {
    await setAllMessagesAsRead(request.data.chatId, request.auth?.uid as string);
  } catch (e) {
    console.log(e);
  }
  return;
});


/**
 *  Set message in the chat channel as read for the user
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the chat channel
 *  @param {string} messageId ID of the message
 */
exports.markReadMessageForMember = onCall(async (request) => {
  validateUser(request.auth);
  try {
    await markReadMessageForMember(request.data.chatId, request.auth?.uid as string, request.data.messageId);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 *  Set typing timestamp for member in channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the chat channel
 */
exports.setTyping = onCall(async (request) => {
  validateUser(request.auth);
  try {
    await setTyping(request.data.chatId, request.auth?.uid as string);
  } catch (e) {
    console.log(e);
  }
  return;
});

/**
 * Send custom notification to a user.
 * This is useful in cases of custom featues added on top of chat.
 * Can be removed if not required
 *
 * @param {String} toUser UID of the user
 * @param {String} title Title of the notification
 * @param {String} content Content of the notification
 * @param {String} tag TAG or collapseKey to be used for the notification
 * @param {Map} data data payload to be processed by application (Can be empty map)
 */
exports.sendNotificationToUser = onCall(async (request) => {
  validateUser(request.auth);
  await sendNotificationToUser(
    {
      toUser: request.data.toUser,
      title: request.data.title,
      content: request.data.content,
      badgeCount: 0,
      collapseKey: request.data.tag,
      data: request.data.data,
    }
  );
});


/**
 * Presigned S3 PUT URL for asset upload
 *
 * @param {String} S3BucketName Bucket name
 * @param {String} key Path of the file with filename and mimetype to store in the location
 * @return {String} Signed URL
 */
exports.getS3SignedUrlUpload = getS3SignedUrlUpload;

/**
 * Delete object from S3 bucket
 *
 * @param {String} S3BucketName Bucket name
 * @param {String} key Path of the file with filename and mimetype that was used to store the object
 * @return
 */
exports.deleteS3Object = deleteS3Object;

function validateUser(auth?: AuthData) {
  if ((typeof auth?.uid === "string" && auth?.uid.length !== 0)) {
    return;
  }
  throw new HttpsError(
    "unauthenticated",
    "Unauthorized"
  );
}
