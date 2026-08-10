import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ActivityAdapter, ActivityRecord } from './activityAdapter';

export function firestoreActivityAdapter(uid: string): ActivityAdapter {
  return {
    async list() {
      const snapshot = await getDocs(collection(db, 'users', uid, 'activity'));
      return snapshot.docs.map((item) => item.data() as ActivityRecord);
    },
    async save(record) {
      await setDoc(doc(db, 'users', uid, 'activity', record.date), record);
    },
  };
}
