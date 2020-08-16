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

app.get('/badgeCount', async (req, res) => {
    const badgeCount = await getBadgeCount(req.query.userId)
    res.send({ "badge": badgeCount });
});

app.post('/createChannel', async (req, res) => {
    await createChannel(req.body)
    res.sendStatus(201);
});

app.post('/addMember', async (req, res) => {
    await addMemberToChat(req.body.chatId, req.body.userId)
    res.sendStatus(204);
});

app.delete('/removeMember', async (req, res) => {
    await removeMemberFromChat(req.body.chatId, req.body.userId)
    res.sendStatus(204);
});

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
 *  @param {string} userId ID of the user creating the channel
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
 *  Add Member to chat channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @param {string} chatId ID of the channel to which user should be added
 *  @param {string} userId ID of the user to be added to channel
 */
exports.addMember = functions.https.onCall(async (data, context) => {
    try {
        await validateUser(context)
        await addMemberToChat(data.chatId, data.userId)
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
 *  @param {string} userId ID of the user to be removed from the channel
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
 *  Register User to chat
 *  This will create user entry in the firestore if not present
 *  This will also remove previously added token for other user and add the token to current user
 * 
 *  @param {string} token FCM token to send push notifications
 */
exports.registerUser = functions.https.onCall(async (data, context) => {
    return await registerUser(context, data)
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
        const message = await Chats.doc(data.chatId).collection("messages").add(
            {
                "content": data.content,
                "type": data.type,
                "timestamp": admin.firestore.FieldValue.serverTimestamp(),
                "user": Users.doc(context.auth.uid)
            }
        )
        await setAllMessagesAsRead(data.chatId, context.auth.uid)
        await sendPushNotifications(data.chatId, context.auth.uid, data.content, message.id)
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
 *  @param {string} userId ID of the user
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


async function registerUser(context, data) {
    try {
        const userRef = Users.doc(context.auth.uid)
        var userDoc = await userRef.get()
        if (userDoc.exists) {
            await registerToken(userRef, data.token)
        } else {
            await userRef.set({
                'displayName': data.displayName,
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
    const chatAddResponse = await Chats.add({
        'name': data.name,
        'type': data.type,
        'createdOn': admin.firestore.FieldValue.serverTimestamp()
    })
    await addMemberToChat(chatAddResponse.id, data.userId)
    return
}

async function addMemberToChat(chatId, userId) {
    const chatRef = Chats.doc(chatId)
    const members = chatRef.collection("members")
    const messages = await chatRef.collection("messages").orderBy('timestamp', 'desc').limit(1).get()
    var lastMessageRef = null
    if (messages.size > 0) {
        lastMessageRef = messages.docs[0].ref
    }
    if ((await members.where("user", "==", userId).get()).size === 0) {
        members.add(
            {
                "lastSeen": lastMessageRef,
                "user": userId
            }
        )
    }
    await Users.doc(userId).update({
        channels: admin.firestore.FieldValue.arrayUnion(chatRef)
    })
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
        const member = await memberref.ref.get();
        const user = await Users.doc(member.data().user).get();
        const badgeCount = await getBadgeCount(user.id)
        const payload = {
            notification: {
                title: `${fromUser.data().displayName} has sent a message on ${chatChannel.data().name}`,
                body: content,
                badge: `${badgeCount}`
            },
            data: {
                "userId": userId,
                "chatId": chatId,
                "type": "message"
            }
        }
        const options = {
            "collapseKey": messageId
        }
        const a = await admin.messaging().sendToDevice(user.data().tokens, payload, options)
        console.log(a)
        /* eslint-enable */
    }
}

async function getBadgeCount(userId) {
    var totalCount = 0
    const user = await Users.doc(userId).get()
    for (const channelRef of user.data().channels) {
        const members = await channelRef.collection("members").where("user", "==", user.id).get();
        var lastSeenMessage = null
        if (members.docs[0].data().lastSeen) {
            lastSeenMessage = await members.docs[0].data().lastSeen.get()
        }
        var queryRef = channelRef.collection("messages").orderBy('timestamp', 'desc')
        if (lastSeenMessage) {
            if (lastSeenMessage.exists) {
                queryRef = queryRef.endBefore(lastSeenMessage)
            }
        }
        const chatChannel = await queryRef.get()
        totalCount = totalCount + chatChannel.size
    }
    return totalCount
}

async function setAllMessagesAsRead(chatId, userId) {
    const messages = await Chats.doc(chatId).collection("messages").orderBy('timestamp', 'desc').limit(1).get()
    var lastMessageRef = null
    if (messages.size > 0) {
        lastMessageRef = messages.docs[0].ref
    }
    await updateMemberDocument(chatId, userId, {
        "lastSeen": lastMessageRef
    })
}

async function setTyping(chatId, userId) {
    await updateMemberDocument(chatId, userId, {
        "lastType": admin.firestore.FieldValue.serverTimestamp()
    })
}

async function updateMemberDocument(chatId, userId, document) {
    const memberSnap = await Chats.doc(chatId).collection("members").where("user", "==", userId).get()
    if (memberSnap.size > 0) {
        await memberSnap.docs[0].ref.update(document)
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
