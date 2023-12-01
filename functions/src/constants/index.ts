import {
  CollectionReference,
  getFirestore,
} from "firebase-admin/firestore";
import {
  Channel,
} from "../types/Channel";
import {
  User,
} from "../types/User";

export const ChatCollection = getFirestore().collection("chat") as CollectionReference<Channel>;
export const UserCollection = getFirestore().collection("user") as CollectionReference<User>;
