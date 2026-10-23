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

/** Only this Gmail account can enter real game results (also enforced server-side). */
export const ADMIN_EMAILS = ["nissim@letscoach.net"];

export function isAdmin(user: User | null): boolean {
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
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
