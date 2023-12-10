import {DocumentReference, FieldValue} from "firebase-admin/firestore";
import {MessageAttachment} from "./MessageAttachment";

export interface ChannelMessage {
    id: string
    displayName: string
    type?: string
    channels?: DocumentReference[]
    createdOn: FieldValue
    attachments?: MessageAttachment[]
}
