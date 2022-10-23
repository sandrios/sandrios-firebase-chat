'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp()

const express = require('express');
const { user } = require('firebase-functions/lib/providers/auth');
const cookieParser = require('cookie-parser')();
const cors = require('cors')({ origin: true });
const app = express();

const Chats = admin.firestore().collection("chats")
const Users = admin.firestore().collection("users")

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const validateFirebaseIdToken = async (req, res, next) => {
    console.log('Check if request is authorized with Firebase ID token');

    if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
        !(req.cookies && req.cookies.__session)) {
        console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
            'Make sure you authorize your request by providing the following HTTP header:',
            'Authorization: Bearer <Firebase ID Token>',
            'or by passing a "__session" cookie.');
        sendUnauthorized(res)
        sendUn
        return;
    }

    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        console.log('Found "Authorization" header');
        // Read the ID Token from the Authorization header.
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else if (req.cookies) {
        console.log('Found "__session" cookie');
        // Read the ID Token from cookie.
        idToken = req.cookies.__session;
    } else {
        // No cookie
        sendUnauthorized(res)
        return;
    }

    try {
        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedIdToken;
        next();
        return;
    } catch (error) {
        console.error('Error while verifying Firebase ID token:', error);
        sendUnauthorized(res)
        return;
    }
};

app.use(cors);
app.use(cookieParser);
app.use(validateFirebaseIdToken);


// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
exports.app = functions.https.onRequest(app);
 
/**
 *  Create a new Chat Channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @param {string} name Name of the channel
 *  @param {string} type Type of channel ("direct", "group")
 *  @param {string} private Boolean flag to indicate if this is protected group or public chat channel
 */
exports.createChannel = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await createChannel(data)
    } catch (e) {
        console.log(e)
    }
    return
})

/**
 *  Rename a existing Group Chat Channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @param {string} name Name of the channel
 *  @param {string} chatId ID of the channel to be renamed
 */
 exports.renameChannel = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await renameChannel(data)
    } catch (e) {
        console.log(e)
    }
    return
})


/**
 *  Deactivate a existing Group Chat Channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @param {string} chatId ID of the channel to be deactivated
 */
 exports.deactivateChannel = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await deactivateChannel(data)
    } catch (e) {
        console.log(e)
    }
    return
})

/**
 *  Add Member to chat channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @param {string} chatId ID of the channel to which user should be added
 */
exports.addMember = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await addMemberToChat(data.chatId, data.user)
    } catch (e) {
        console.log(e)
    }
    return
})


/**
 *  Add Members to chat channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @param {string} chatId ID of the channel to which user should be added
 */
 exports.addMembers = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await addMembersToChat(data.chatId, data.users)
    } catch (e) {
        console.log(e)
    }
    return
})

/**
 *  Remove Member from chat channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @param {string} chatId ID of the channel from which user should be removed
 */
exports.removeMember = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await removeMemberFromChat(data.chatId, data.userId)
    } catch (e) {
        console.log(e)
    }
    return
})

/**
 *  Register Device
 *  This will create user entry in the firestore if not present
 *  This will also remove previously added token for other user and add the token to current user
 * 
 *  @param {string} token FCM token to send push notifications
 *  @param {string} displayName Display Name of the user
 */
exports.registerDevice = functions.https.onCall(async (data, context) => {
    return await registerUser(data, context.auth.uid)
})

/**
 *  Edit User name
 *  This will create user entry in the firestore if not present
 *  This will also remove previously added token for other user and add the token to current user
 * 
 *  @param {string} displayName Display Name of the user
 */
 exports.editUser = functions.https.onCall(async (data, context) => {
    return await editUser(data, context.auth.uid)
})

/**
 *  Unregister device
 *  This will remove the fcmToken from the firestore if present
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  To prevent chat notifications after logout
 * 
 *  @param {string} token FCM token to stop sending notifications
 */
exports.unregisterDevice = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await unregisterToken(Users.doc(context.auth.uid), data.token)
    } catch (e) {
        console.log(e)
    }
    return { "error": "Bad reqeust" }
})

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
exports.sendMessage = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await sendChannelMessage(data, context.auth.uid)
    } catch (e) {
        console.log(e)
    }
    return
})

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
 exports.sendThreadMessage = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await sendThreadMessage(data, context.auth.uid)
    } catch (e) {
        console.log(e)
    }
    return
})

/**
 *  Set all messages in the chat channel as read for the user
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @param {string} chatId ID of the chat channel
 */
exports.setAllMessagesAsRead = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await setAllMessagesAsRead(data.chatId, context.auth.uid)
    } catch (e) {
        console.log(e)
    }
    return
})


/**
 *  Set typing timestamp for member in channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @param {string} chatId ID of the chat channel
 */
exports.setTyping = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await setTyping(data.chatId, context.auth.uid)
    } catch (e) {
        console.log(e)
    }
    return
})

async function sendChannelMessage(data, uid) {
    try {
        const message = await Chats.doc(data.chatId).collection("messages").add(
            {
                "content": data.content,
                "type": data.type,
                "timestamp": admin.firestore.FieldValue.serverTimestamp(),
                "user": Users.doc(uid)
            }
        )
        await setAllMessagesAsRead(data.chatId, uid)
        await sendPushNotifications(data.chatId, uid, data.content, message.id)
    } catch (e) {
        console.log(e)
    }
}

async function sendThreadMessage(data, uid) {
    try {
        // Create thread doc
        const threadDoc = Chats.doc(data.chatId)
                                    .collection("messages")
                                    .doc(data.messageId)
                                    .collection("threads")
                                    .doc(data.threadId);
        threadDoc.set({"uuid" : data.threadId});
        // Add message in threadMessages doc
        const threadMessagesDoc = threadDoc.collection("threadMessages");
        const message = await threadMessagesDoc.add(
            {
                "content": data.content,
                "type": data.type,
                "timestamp": admin.firestore.FieldValue.serverTimestamp(),
                "user": Users.doc(uid)
            }
        )
        await setAllMessagesAsRead(data.chatId, uid)
        await sendPushNotifications(data.chatId, uid, data.content, message.id)
    } catch (e) {
        console.log(e)
    }
}

async function registerUser(data, uid) {
    try {
        const userRef = Users.doc(uid)
        var userDoc = await userRef.get()
        if (userDoc.exists) {
            await registerToken(userRef, data.token)
        } else {
            await userRef.set({
                'displayName': data.displayName,
                'id': uid,
                'createdOn': admin.firestore.FieldValue.serverTimestamp()
            })
            await registerToken(userRef, data.token)
            userDoc = await userRef.get()
        }
        return userDoc.data()
    } catch (e) {
        console.log(e)
    }
    return new functions.https.HttpsError(
        400,
        "Bad Request"
    )
}

async function editUser(data, uid) {
    const userRef = Users.doc(data.uuid)
    var userDoc = await userRef.get()
    if (userDoc.exists) { 
        await userRef.update({
            'displayName': data.displayName
        })
    }else{
        await userRef.set({
            'displayName': data.displayName,
            'id': uid,
            'createdOn': admin.firestore.FieldValue.serverTimestamp()
        })
    }
}

async function registerToken(userRef, token) {
    const users = await Users.where('tokens', 'array-contains', token).get()
    for (const user of users.docs) {
        /* eslint-disable */
        await unregisterToken(user.ref, token)
        /* eslint-enable */
    }
    await userRef.update({
        tokens: admin.firestore.FieldValue.arrayUnion(token)
    })
}

async function unregisterToken(userRef, token) {
    await userRef.update({
        tokens: admin.firestore.FieldValue.arrayRemove(token)
    })
}

async function createChannel(data) {
    const chatCreateRes = await Chats.add({
        'name': data.name,
        'type': data.type,
        'private': data.private,
        'readOnly': false,
        'createdOn': admin.firestore.FieldValue.serverTimestamp()
    })
    if (data.users != null) {
        await addMembersToChat(chatCreateRes.id, data.users)
    }
    return
}

async function renameChannel(data) {
    Chats.doc(data.chatId).update({
        'name': data.name
    })
    return
}

async function deactivateChannel(data) {
    Chats.doc(data.chatId).update({
        'readOnly': true
    })
    return
}

async function addMembersToChat(chatId, users) {
    for (let i = 0; i < users.length; i++) {
        await addMemberToChat(chatId, users[i])
    }
}

async function addMemberToChat(chatId, user) {
    const chatRef = Chats.doc(chatId)
    const userRef = Users.doc(user.id)

    if (!(await userRef.get()).exists) {
        await userRef.set({
            'displayName': user.displayName,
            'id': user.id,
            'createdOn': admin.firestore.FieldValue.serverTimestamp()
        })
    }

    // Add channel record to user document
    await userRef.update({
        channels: admin.firestore.FieldValue.arrayUnion(chatRef)
    })

    // Add member to channel before fetching lastSeen
    await chatRef.collection("members").doc(user.id).set({
        "user": userRef,
        "lastSeen": null,
        'active': true,
        "type": user.type,
    })

    await setAllMessagesAsRead(chatId, user.id)
    return
}

async function removeMemberFromChat(chatId, userId) {
    await Chats.doc(chatId).update({
        members: admin.firestore.FieldValue.arrayRemove(Users.doc(userId))
    })
    await Users.doc(userId).update({
        channels: admin.firestore.FieldValue.arrayRemove(Chats.doc(chatId))
    })
    return
}

async function sendPushNotifications(chatId, userId, content, messageId) {
    const fromUser = await Users.doc(userId).get()
    const chatChannel = await Chats.doc(chatId).get()
    const members = await Chats.doc(chatId).collection("members").get()

    for (const memberref of members.docs) {
        /* eslint-disable */
        try {
            const user = await Users.doc(memberref.ref.id).get();
            const badgeCount = await getBadgeCount(user.id)
            const payload = {
                notification: {
                    title: `${fromUser.data().displayName} has sent a message on ${chatChannel.data().name}`,
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
            const a = await admin.messaging().sendToDevice(user.data().tokens, payload, options)
            console.log(a)
        } catch (e) {
            console.log(e)
        }
        /* eslint-enable */
    }
}

async function getBadgeCount(userId) {
    var totalCount = 0
    const user = await Users.doc(userId).get()
    for (const channelRef of user.data().channels) {
        /* eslint-disable */
        try {
            const member = await channelRef.collection("members").doc(user.id).get();
            var lastSeenMessage = null
            if (member.lastSeen) {
                lastSeenMessage = await member.lastSeen.get()
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
    return totalCount
}

async function setAllMessagesAsRead(chatId, userId) {
    const messages = await Chats.doc(chatId).collection("messages").orderBy('timestamp', 'desc').limit(1).get()
    if (messages.size > 0) {
        await updateMemberDocument(chatId, userId, {
            "lastSeen": messages.docs[0].ref
        })
    }
}

async function setTyping(chatId, userId) {
    await updateMemberDocument(chatId, userId, {
        "lastType": admin.firestore.FieldValue.serverTimestamp()
    })
}

async function updateMemberDocument(chatId, userId, document) {
    const memberSnap = Chats.doc(chatId).collection("members").doc(userId)
    if ((await memberSnap.get()).exists) {
        await memberSnap.update(document)
    }
}

async function validateUser(context) {
    if (context.auth) {
        if (context.auth.uid) {
            const userDoc = await Users.doc(context.auth.uid).get()
            if (userDoc.exists) {
                return userDoc
            }
        }
    }
    throw new functions.https.HttpsError(
        403,
        "Unauthorized"
    );
}

function sendUnauthorized(res) {
    res.status(403).send('Unauthorized')
}
