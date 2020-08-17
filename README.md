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
1. Function: 'registerDevice'
/**
 *  Register device
 *  This will create user entry in the firestore if not present
 *  This will also remove previously added token for other user and add the token to current user
 * 
 *  @token {string} FCM token to send push notifications
 */
 
 2. Function: 'unregisterDevice'
 /**
 *  Unregister device
 *  This will remove the fcmToken from the firestore if present
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  To prevent chat notifications after logout
 * 
 *  @token {string} FCM token to stop sending notifications
 */
 
 3. Function: 'sendMessage'
 /**
 *  Send Message
 *  Can only be accessed by only authorized Firebase Users.
 *  To use media messages, upload the media files to either firebase storage or your backend and then add the URL in content payload with appropriate media type.
 * 
 *  This will send push notifications to every user present in the channel
 * 
 *  @chatId {string} ID of the chat channel
 *  @type {string} Type of message ("text", "image", "video")
 *  @content {string} Payload based on the type of message
 */
 
 3. Function: 'setAllMessagesAsRead'
 // Invoke on last position scroll of list
/**
 *  Set all messages in the chat channel as read for the user
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @chatId {string} ID of the chat channel
 */
 
 4. Function: 'setTyping'
 // Invoke with debouncer from UI when user is changing text in text field
 /**
 *  Set typing timestamp for member in channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @chatId {string} ID of the chat channel
 */
 
 5. Function: 'createChannel'
 /**
 *  Create a new Chat Channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @name {string} Name of the channel
 *  @type {string} Type of channel ("direct", "group")
 */
 
 6. Function: 'addMember'
 /**
 *  Add Member to chat channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @chatId {string} ID of the channel to which user should be added
 */
 
 7. Function: 'removeMember'
 /**
 *  Remove Member from chat channel
 *  Can only be accessed by only authorized Firebase Users.
 * 
 *  @chatId {string} ID of the channel from which user should be removed
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

### API: For custom backend integration

There are 4 endpoints exposed as of now for backend to be able to interface with the firestore data (JSON):

```
1. [GET] app/badgeCount?userId=<id> 
// Open
This will return the badge count of unread messages for the user. This will be helpful in case you want to add chat badge count with your app related badges. However if a chat notification is sent after the backend notification, count will be overridden.

2. [POST] app/createChannel
// Authorization header required
// Request body
{
    'name': <name of chat channel>,
    'type': "group" or "direct",
    'userId': <id of the user to be added to the channel>
}

3. [POST] app/addMember
// Authorization header required
// Request body
{
    'chatId': <id of chat channel>,
    'userId': <id of user to be added>
}

4. [DELETE] app/removeMember
// Authorization header required
// Request body
{
    'chatId': <id of chat channel>,
    'userId': <id of user to be removed>
}
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

[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)

**sandrios studios**

