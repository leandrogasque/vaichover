import type { VercelRequest, VercelResponse } from '@vercel/node'
import { admin, getFirebaseAdmin } from './_firebaseAdmin'

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Use POST ou DELETE' })
  }

  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''

  if (!token) {
    return res.status(400).json({ error: 'Token ausente' })
  }

  try {
    const app = getFirebaseAdmin()
    const db = app.firestore()
    const docRef = db.collection('pushSubscribers').doc(token)

    if (req.method === 'DELETE') {
      await docRef.delete()
      return res.status(200).json({ ok: true, removed: true })
    }

    await docRef.set(
      {
        token,
        userAgent: req.headers['user-agent'] ?? 'unknown',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      error: 'Falha ao registrar token',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}

export default handler
