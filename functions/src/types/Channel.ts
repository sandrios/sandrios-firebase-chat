import {
  DocumentReference,
  FieldValue,
} from "firebase-admin/firestore";

export interface Channel {
    name: string
    type: string
    private: boolean
    readOnly: boolean
    members?: DocumentReference[]
    createdOn: FieldValue
    lastModified: FieldValue
}
