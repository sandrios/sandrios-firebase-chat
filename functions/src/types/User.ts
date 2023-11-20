import {DocumentReference, FieldValue} from "firebase-admin/firestore";

export interface User {
    id: string
    displayName: string
    type?: string
    channels?: DocumentReference[]
    tokens?: string[]
    createdOn: FieldValue
}
