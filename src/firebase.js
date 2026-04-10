// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDd0a29EQbR_SRmSrfaBJsqdbxky7_UHqU",
  authDomain: "garbmap-fbc0b.firebaseapp.com",
  projectId: "garbmap-fbc0b",
  storageBucket: "garbmap-fbc0b.firebasestorage.app",
  messagingSenderId: "161213624326",
  appId: "1:161213624326:web:9abff4e9b677cb5bcdd387",
  measurementId: "G-9C2WHN8KY9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);