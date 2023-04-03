import admin from 'firebase-admin';
import * as serviceAccount from './serviceAccount.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const firestoreDB = admin.firestore();

export const addOrUpdateItem = async (
  appID: number,
  name: string,
  data: any
) => {
  const appCollectionRef = firestoreDB.collection(`${appID}`);
  const itemRef = appCollectionRef.doc(name);
  await itemRef.set(data, { merge: true });
};

export const getItem = async (appID: number, name: string) => {
  const appCollectionRef = firestoreDB.collection(`${appID}`);
  const itemRef = appCollectionRef.doc(name);
  const itemDoc = await itemRef.get();
  if (itemDoc.exists) {
    return itemDoc.data();
  } else {
    return null;
  }
};

export const getAllItems = async (appID: number) => {
  const appCollectionRef = firestoreDB.collection(`${appID}`);
  const itemsSnapshot = await appCollectionRef.get();
  const items: any = {};
  itemsSnapshot.forEach((itemDoc) => {
    items[itemDoc.id] = itemDoc.data();
  });
  return items;
};

export const deleteItem = async (appID: number, name: string) => {
  const appCollectionRef = firestoreDB.collection(`${appID}`);
  const itemRef = appCollectionRef.doc(name);
  await itemRef.delete();
};
