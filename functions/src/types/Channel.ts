import {
  DocumentReference,
  FieldValue,
} from "firebase-admin/firestore";
import {
  ChannelMessage,
} from "./ChannelMessage";

export interface Channel {
    name: string
    type: string
    private: boolean
    readOnly: boolean
    members?: DocumentReference[]
    lastMessage?: ChannelMessage
    createdOn: FieldValue
}
