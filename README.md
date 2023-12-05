# Chat Functions

sandrios chat is a free and open source chat client that runs on cloud functions and firestore. Just deploy cloud functions using your existing/new firebase project and it will manage the chat data on firestore. Cloud functions are used for updating chat data along cloud messaging for notifications.

#### Features

  - Push notifications with payloads for easy deepLink
  - Custom HTTP endpoints for custom backend integration
  - App badge count
  - Typing status

#### Getting started
     Backend:
    1. Fork the repository and clone it
    2. Run `firebase init` in the folder and select firestore and functions
    3. Run `firebase deploy`
    4. All done 🎉

    Client:
    1. Integrate firestore and cloud messaging
    2. Authenticate firebase auth to use the cloud functions and firestore
    3. Refer Docs for client calls. (Client SDKs WIP)

### Client access docs

Cloud Functions for write access. These functions can only be invoked using the firebase functions client SDK:
```
Function: 'registerDevice'
/**
 *  Register Device
 *  This will create user entry in the firestore if not present
 *  This will also remove previously added token for other user and add the token to current user
 *
 *  @param {string} token FCM token to send push notifications
 *  @param {string} displayName Display Name of the user
 */
 
 Function: 'unregisterDevice'
/**
 *  Unregister device
 *  This will remove the fcmToken from the firestore if present
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  To prevent chat notifications after logout
 *
 *  @param {string} token FCM token to stop sending notifications
 */
 
 Function: 'sendMessage'
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
 
 Function: 'setAllMessagesAsRead'
 // Invoke on last position scroll of list
/**
 *  Set all messages in the chat channel as read for the user
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @chatId {string} ID of the chat channel
 */
 
 Function: 'setTyping'
 // Invoke with debouncer from UI when user is changing text in text field
 /**
 *  Set typing timestamp for member in channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @chatId {string} ID of the chat channel
 */
 
 Function: 'createChannel'
 /**
 *  Create a new Chat Channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} name Name of the channel
 *  @param {string} type Type of channel ("direct", "group")
 *  @param {string} private Boolean flag to indicate if this is protected group or public chat channel
 *  @param {User[]} users List of User {displayName, uid, type} to be added to the channel
 */

 Function: 'renameChannel'
/**
 *  Rename a existing Group Chat Channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} name Name of the channel
 *  @param {string} chatId ID of the channel to be renamed
 */
 
 
 Function: 'addMember'
 /**
 *  Add Member to chat channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @chatId {string} ID of the channel to which user should be added
 */

Function: 'addMembers'
 /**
 *  Add Members to chat channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the channel to which user should be added
 *  @param {User[]} users List of User {displayName, uid, type} to be added to the channel
 */
 
 Function: 'removeMember'
 /**
 *  Remove Member from chat channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the channel from which user should be removed
 *  @param {string} userId ID of the user to be removed
 */

 Function: 'sendThreadMessage'
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

 Function: 'markReadMessageForMember'
/**
 *  Set message in the chat channel as read for the user
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the chat channel
 *  @param {string} messageId ID of the message
 */

Function: 'deactivateChannel' 
/**
 *  Deactivate a existing Group Chat Channel
 *  Can only be accessed by only authorized Firebase UserCollection.
 *
 *  @param {string} chatId ID of the channel to be deactivated
 */

Function: 'sendNotificationToUser'
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
```

Firestore data query for message or channel access: (Client SDK WIP)
```
1. Stream user associated channels: '/users/<userId>/channels'
2. Stream messages in chat channel: '/chats/<chatId>/messages' (Orderby timestamp based on your requirements)
3. Stream members in chat channel: '/chats/<chatId>/members' 
4. Unread count of chat channel: '/chats/<chatId>/members' has lastSeen which will provide the last seen message. channelRef.collection("messages").orderBy('timestamp', 'desc').endBefore(lastSeen) This will give you a collection of all messages between last seen and latest.
5. Stream typing status: Member document of the chat channel will contain "lastType" if you UI is updating typingStatus. This field is a timestamp last time user tried to enter text in the channel. Stream this to get if the user is typing. Run where query firestore based on the timestamp and current time difference is less than X seconds.

```

#### Security
All write operations are done with the help of functions, that means that we can restrict the write access to the collections ("chats" and "users") to maintain data integrity.
Database rules are added in the repo, so deploy will also deploy the rules.

### Customizations
1. To change the notification title, body or clickAction for flutter. Please modify the playload format inside index.js
2. Remove badge count by commenting out the payload line in index.js
3. Typing status is not accounted for unless function or firestore query is run on it.
4. Remove functions createChannel or addMember or removeMember if you want this action to be able to perform only from API.

### Advantages

1. Free tier of firebase should support ~50 MAU (depends on user activity)
2. Move firebase to spark plan and scale your chat to 5K MAU for ~$1/month
3. Flexible with cloud functions
4. Works with most apps because of existing firebase integrations 

... Awaiting feedback

Want to contribute? Great!

### Todos

 - Client SDK for Android, iOS and Flutter
 - Unit testing

License
------

 Copyright 2020 sandrios studios

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

**sandrios studios**

