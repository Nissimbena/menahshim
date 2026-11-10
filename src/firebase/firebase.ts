import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  getAdditionalUserInfo,
  type User,
} from "firebase/auth";
import { logAuthEvent } from "../authLogging";

const firebaseConfig = {
  projectId: "hapoel-jerusalem-guess",
  appId: "1:336064139162:web:86052c3bec296c8b77b423",
  storageBucket: "hapoel-jerusalem-guess.firebasestorage.app",
  apiKey: "AIzaSyArv3pBCy2-r9Cbg7LDcoGTTsNiwatJSMI",
  authDomain: "hapoel-jerusalem-guess.firebaseapp.com",
  messagingSenderId: "336064139162",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set from /users/me (users.is_admin in the DB); the backend enforces it on every admin call.
let adminFlag = false;

export function setAdminFlag(value: boolean) {
  if (adminFlag === value) return;
  adminFlag = value;
  window.dispatchEvent(new Event("adminchange"));
}

export function isAdmin(user: User | null): boolean {
  return !!user && adminFlag;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  logAuthEvent({ eventType: "sign_in_start", success: true });
  try {
    const result = await signInWithPopup(auth, provider);
    logAuthEvent({
      uid: result.user.uid,
      eventType: "sign_in_success",
      isNewUser: getAdditionalUserInfo(result)?.isNewUser ?? null,
      success: true,
    });
    return result.user;
  } catch (err) {
    logAuthEvent({
      eventType: "sign_in_failure",
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export type { User };
