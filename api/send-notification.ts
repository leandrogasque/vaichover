import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as admin from 'firebase-admin'
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
    'Credenciais do Firebase não configuradas. Defina FIREBASE_SERVICE_ACCOUNT nas variáveis ou adicione o JSON em server/.',
  )
}

const getFirebaseAdmin = () => {
  if (firebaseApp) return firebaseApp
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  })
  return firebaseApp
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' })
  }

  const { token, title, body, url } = req.body ?? {}

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Campo token é obrigatório' })
  }

  try {
    const app = getFirebaseAdmin()
    await app.messaging().send({
      token,
      notification: {
        title: title || 'Será que vai chover?',
        body:
          body ||
          'Chance alta de chuva detectada. Abra o app para conferir a previsão detalhada.',
      },
      webpush: {
        fcmOptions: {
          link: url || process.env.PUBLIC_APP_URL || 'https://vaichover.vercel.app',
        },
      },
      data: url ? { url } : undefined,
    })

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      error: 'Falha ao enviar notificação.',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}

export default handler
