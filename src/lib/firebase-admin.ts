import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

let app: App;
if (!getApps().length) {
  app = initializeApp();
} else {
  app = getApp();
}

const storage = getStorage(app);

export { storage };
