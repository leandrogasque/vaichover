import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getFirebaseAdmin } from './_firebaseAdmin'

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' })
  }

  const { token, title, body, url } = req.body ?? {}

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Campo token e obrigatorio' })
  }

  try {
    const app = getFirebaseAdmin()
    await app.messaging().send({
      token,
      notification: {
        title: title || 'Sera que vai chover?',
        body:
          body ||
          'Chance alta de chuva detectada. Abra o app para conferir a previsao detalhada.',
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
      error: 'Falha ao enviar notificacao.',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}

export default handler
