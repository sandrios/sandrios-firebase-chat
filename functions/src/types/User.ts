import {DocumentReference, FieldValue} from "firebase-admin/firestore";
import {DeviceToken} from "./DeviceToken";

export interface User {
    uid: string
    displayName?: string
    type?: string
    channels?: DocumentReference[]
    tokens: DeviceToken[]
    createdOn?: FieldValue
}
