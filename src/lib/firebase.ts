import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, type Messaging } from 'firebase/messaging'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

let firebaseApp: FirebaseApp | null = null
let messagingInstance: Messaging | null = null

export const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp
  firebaseApp = initializeApp(firebaseConfig)
  return firebaseApp
}

export const getFirebaseMessaging = () => {
  if (typeof window === 'undefined') return null
  if (messagingInstance) return messagingInstance
  const app = getFirebaseApp()
  messagingInstance = getMessaging(app)
  return messagingInstance
}
