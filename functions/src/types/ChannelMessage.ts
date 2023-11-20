import {DocumentReference, FieldValue} from "firebase-admin/firestore";

export interface ChannelMessage {
    id: string
    displayName: string
    type?: string
    channels?: DocumentReference[]
    createdOn: FieldValue
}
