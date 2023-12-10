import {DocumentReference, FieldValue} from "firebase-admin/firestore";
import {MessageAttachment} from "./MessageAttachment";

export interface ThreadMessage {
   content: string
   type: string
   timestamp: FieldValue
   user: DocumentReference
   attachments?: MessageAttachment[]
}
