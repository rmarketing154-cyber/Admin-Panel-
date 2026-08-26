import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
const app = initializeApp({
  projectId: "exchanger-pro",
  storageBucket: "exchanger-pro.firebasestorage.app"
});
const storage = getStorage(app);
const fileRef = ref(storage, 'test.txt');
uploadString(fileRef, 'hello').then(async () => {
  console.log(await getDownloadURL(fileRef));
  process.exit(0);
}).catch(e => {
  console.log(JSON.stringify(e, null, 2));
  console.log(e.customData?.serverResponse);
  process.exit(1);
});
