import {DocumentReference, FieldValue} from "firebase-admin/firestore";

export interface ThreadMessage {
   content: string
   type: string
   timestamp: FieldValue
   user: DocumentReference
}
