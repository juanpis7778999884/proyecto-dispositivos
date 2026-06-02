import { groq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import type { TelegramUpdate, PlantEvent } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const update: TelegramUpdate = await req.json()

    if (!update.message?.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = update.message.chat.id
    const userMessage = update.message.text.toLowerCase().trim()
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

    if (!telegramBotToken) {
      return NextResponse.json({ ok: true })
    }

    const supabase = await createClient()

    // ============== COMANDOS DIRECTOS ==============
    if (userMessage === 'regar' || userMessage === 'riego') {
      await supabase
        .from('estados_sistema')
        .update({ riego_activo: true })
        .eq('id', 1)

      await supabase
        .from('historial_riego')
        .insert({
          evento: 'watering_started',
          zona: 'normal',
          mensaje: 'ESP32: Riego activado remotamente desde Telegram'
        })

      await sendTelegramMessage(telegramBotToken, chatId.toString(),
        '💧 Riego activado. El ESP32 comenzará a regar en los próximos segundos.')
      return NextResponse.json({ ok: true })
    }

    if (userMessage === 'parar' || userMessage === 'detener' || userMessage === 'stop') {
      await supabase
        .from('estados_sistema')
        .update({ riego_activo: false })
        .eq('id', 1)

      await supabase
        .from('historial_riego')
        .insert({
          evento: 'watering_stopped',
          zona: 'normal',
          mensaje: 'ESP32: Riego detenido remotamente desde Telegram'
        })

      await sendTelegramMessage(telegramBotToken, chatId.toString(),
        '⏹️ Riego detenido.')
      return NextResponse.json({ ok: true })
    }

    if (userMessage === 'estado' || userMessage === 'status') {
      const { data: estado } = await supabase
        .from('estados_sistema')
        .select('*')
        .eq('id', 1)
        .single()

      const msg = `🌱 Estado actual:
- Temperatura: ${estado?.ultima_temperatura || 'desconocida'}
- Riego activo: ${estado?.riego_activo ? 'Sí 💧' : 'No'}`

      await sendTelegramMessage(telegramBotToken, chatId.toString(), msg)
      return NextResponse.json({ ok: true })
    }

    // ============== RESPUESTA CON IA ==============
    const { data: events } = await supabase
      .from('plant_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    const response = await generatePlantResponse(userMessage, events as PlantEvent[])
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
    ? events.map((e) => `[${new Date(e.created_at).toLocaleString('es-ES')}] ${e.message}`).join('\n')
    : 'No hay eventos recientes.'

  const lastTempEvent = events?.find((e) => e.event_type === 'temperature')
  const heatAlerts = events?.filter((e) => e.temperature_zone === 'calor' || e.temperature_zone === 'calor_extremo').length || 0
  const coldAlerts = events?.filter((e) => e.temperature_zone === 'frio').length || 0
  const lastWatering = events?.find((e) => e.event_type === 'watering')

  const statusSummary = `
Estado actual:
- Ultima zona de temperatura: ${lastTempEvent?.temperature_zone || 'desconocida'}
- Alertas de calor recientes: ${heatAlerts}
- Alertas de frio recientes: ${coldAlerts}
- Ultimo riego: ${lastWatering ? new Date(lastWatering.created_at).toLocaleString('es-ES') : 'sin registro'}

Comandos disponibles: "regar", "parar", "estado"
`

  try {
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
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
    return 'Lo siento, hubo un error. Intenta de nuevo.'
  }
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
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