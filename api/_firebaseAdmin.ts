import * as admin from 'firebase-admin'
import 'firebase-admin/firestore'
import fs from 'node:fs'
import path from 'node:path'

let firebaseApp: admin.app.App | null = null

const getServiceAccount = () => {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT
  if (fromEnv) {
    return JSON.parse(fromEnv)
  }

  const serverDir = path.join(process.cwd(), 'server')
  if (fs.existsSync(serverDir)) {
    const jsonFile = fs
      .readdirSync(serverDir)
      .find((file) => file.endsWith('.json') && !file.startsWith('.'))
    if (jsonFile) {
      const filePath = path.join(serverDir, jsonFile)
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  }

  throw new Error(
    'Credenciais do Firebase nao configuradas. Defina FIREBASE_SERVICE_ACCOUNT ou adicione o JSON em server/.',
  )
}

export const getFirebaseAdmin = () => {
  if (firebaseApp) return firebaseApp
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  })
  return firebaseApp
}

export { admin }
