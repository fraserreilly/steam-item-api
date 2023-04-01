import admin from 'firebase-admin';
import * as serviceAccount from './serviceAccount.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const firestoreDB = admin.firestore();

const itemsCollectionRef = firestoreDB.collection('items');

export const addOrUpdateItem = async (name: string, data: any) => {
  const itemRef = itemsCollectionRef.doc(name);
  await itemRef.set(data, { merge: true });
};

export const getItem = async (name: string) => {
  const itemRef = itemsCollectionRef.doc(name);
  const itemDoc = await itemRef.get();
  if (itemDoc.exists) {
    return itemDoc.data();
  } else {
    return null;
  }
};

export const getAllItems = async () => {
  const itemsSnapshot = await itemsCollectionRef.get();
  const items: any = {};
  itemsSnapshot.forEach((itemDoc) => {
    items[itemDoc.id] = itemDoc.data();
  });
  return items;
};

export const deleteItem = async (name: string) => {
  const itemRef = itemsCollectionRef.doc(name);
  await itemRef.delete();
};
