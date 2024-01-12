import {DocumentReference, FieldValue} from "firebase-admin/firestore";
import {MessageAttachment} from "./MessageAttachment";

export interface ChatMessage {
    chatId: string
    messageId: string
    content: string
    rawText: string
    type: string
    timestamp: FieldValue
    user: DocumentReference
    attachments?: MessageAttachment[]
    directThreadMessage: boolean
}
