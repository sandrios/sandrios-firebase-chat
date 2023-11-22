import {DocumentReference, FieldValue} from "firebase-admin/firestore";

export interface User {
    uid: string
    displayName: string
    type?: string
    channels?: DocumentReference[]
    tokens?: string[]
    createdOn: FieldValue
}
