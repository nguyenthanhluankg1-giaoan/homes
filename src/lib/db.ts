import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Category, Link } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

let currentAdminSecret = localStorage.getItem('adminSecret') || 'admin123';

export const setAdminSecret = (secret: string) => {
  currentAdminSecret = secret;
  localStorage.setItem('adminSecret', secret);
};

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const subscribeCategories = (callback: (categories: Category[]) => void) => {
  const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    callback(categories);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));
};

export const subscribeLinks = (callback: (links: Link[]) => void) => {
  const q = query(collection(db, 'links'), orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const links = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Link));
    callback(links);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'links'));
};

export const getAdminPassword = async (): Promise<string> => {
  try {
    const adminDoc = await getDoc(doc(db, 'settings', 'admin'));
    if (adminDoc.exists()) {
      return adminDoc.data().adminPassword;
    }
    return 'admin123'; // Default if not set
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'settings/admin');
    return 'admin123';
  }
};

export const updateAdminPassword = async (newPassword: string) => {
  try {
    await updateDoc(doc(db, 'settings', 'admin'), {
      adminPassword: newPassword,
      adminSecret: currentAdminSecret
    });
    setAdminSecret(newPassword);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'settings/admin');
  }
};

export const addCategory = async (name: string, order: number) => {
  try {
    await addDoc(collection(db, 'categories'), {
      name,
      order,
      adminSecret: currentAdminSecret
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'categories');
  }
};

export const updateCategory = async (id: string, updates: Partial<Category>) => {
  try {
    await updateDoc(doc(db, 'categories', id), {
      ...updates,
      adminSecret: currentAdminSecret
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
  }
};

export const deleteCategory = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
  }
};

export const addLink = async (link: Omit<Link, 'id' | 'ownerId'>) => {
  try {
    await addDoc(collection(db, 'links'), {
      ...link,
      adminSecret: currentAdminSecret
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'links');
  }
};

export const updateLink = async (id: string, updates: Partial<Link>) => {
  try {
    await updateDoc(doc(db, 'links', id), {
      ...updates,
      adminSecret: currentAdminSecret
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `links/${id}`);
  }
};

export const deleteLink = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'links', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `links/${id}`);
  }
};

export const updateLinkOrder = async (linkUpdates: { id: string, order: number }[]) => {
  const batch = writeBatch(db);
  linkUpdates.forEach(update => {
    batch.update(doc(db, 'links', update.id), { 
      order: update.order,
      adminSecret: currentAdminSecret
    });
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'links/batch-order');
  }
};
