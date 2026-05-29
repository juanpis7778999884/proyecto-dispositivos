import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import type { TelegramUpdate, PlantEvent } from '@/lib/types'

// Telegram webhook endpoint - receives messages from users
export async function POST(req: Request) {
  try {
    const update: TelegramUpdate = await req.json()

    // Only process text messages
    if (!update.message?.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = update.message.chat.id
    const userMessage = update.message.text
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

    if (!telegramBotToken) {
      console.error('[v0] TELEGRAM_BOT_TOKEN not configured')
      return NextResponse.json({ ok: true })
    }

    // Get recent plant events for context
    const supabase = await createClient()
    const { data: events } = await supabase
      .from('plant_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    // Generate AI response with plant context
    const response = await generatePlantResponse(
      userMessage,
      events as PlantEvent[]
    )

    // Send response to user
    await sendTelegramMessage(telegramBotToken, chatId.toString(), response)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[v0] Telegram webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}

async function generatePlantResponse(
  userMessage: string,
  events: PlantEvent[] | null
): Promise<string> {
  const eventsContext = events
    ? events
        .map(
          (e) =>
            `[${new Date(e.created_at).toLocaleString('es-ES')}] ${e.message}`
        )
        .join('\n')
    : 'No hay eventos recientes.'

  // Calculate plant status
  const lastTempEvent = events?.find((e) => e.event_type === 'temperature')
  const heatAlerts =
    events?.filter(
      (e) =>
        e.temperature_zone === 'calor' || e.temperature_zone === 'calor_extremo'
    ).length || 0
  const coldAlerts =
    events?.filter((e) => e.temperature_zone === 'frio').length || 0
  const lastWatering = events?.find((e) => e.event_type === 'watering')

  const statusSummary = `
Estado actual:
- Ultima zona de temperatura: ${lastTempEvent?.temperature_zone || 'desconocida'}
- Alertas de calor recientes: ${heatAlerts}
- Alertas de frio recientes: ${coldAlerts}
- Ultimo riego: ${lastWatering ? new Date(lastWatering.created_at).toLocaleString('es-ES') : 'sin registro'}
`

  try {
    const result = await generateText({
      model: 'anthropic/claude-sonnet-4-20250514',
      system: `Eres PlantBot, un asistente experto en cuidado de plantas. 
Tienes acceso al historial de eventos de un sistema de monitoreo de plantas con ESP32.
Responde en espanol de forma concisa y util.
Si el usuario pregunta por el estado de la planta, usa los datos reales.
Da consejos practicos y especificos basados en los datos.

${statusSummary}

Historial de eventos recientes:
${eventsContext}`,
      prompt: userMessage,
    })

    return result.text
  } catch (error) {
    console.error('[v0] AI generation error:', error)
    return 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
  }
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })
}
