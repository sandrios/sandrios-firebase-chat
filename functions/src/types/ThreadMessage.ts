import {DocumentReference, FieldValue} from "firebase-admin/firestore";
import {MessageAttachment} from "./MessageAttachment";

export interface ThreadMessage {
    chatId: string
    messageId: string
    threadId: string
    content: string
    type: string
    timestamp: FieldValue
    user: DocumentReference
    attachments?: MessageAttachment[]
}
