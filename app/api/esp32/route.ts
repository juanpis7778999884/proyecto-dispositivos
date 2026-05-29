import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ESP32Data } from '@/lib/types'

// CORS headers for external requests (ESP32, curl, etc.)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json(
    { status: 'ok', message: 'ESP32 API is running. Use POST to send events.' },
    { headers: corsHeaders }
  )
}

// API endpoint for ESP32 to send events
export async function POST(req: Request) {
  try {
    const data: ESP32Data = await req.json()
    const supabase = await createClient()

    // Map ESP32 event to our schema
    const eventType = mapEventType(data.event)
    const eventSubtype = mapEventSubtype(data.event, data)
    const temperatureZone = data.zone || null
    const message = generateMessage(data)

    // Insert event into database
    const { error } = await supabase.from('plant_events').insert({
      event_type: eventType,
      event_subtype: eventSubtype,
      temperature_zone: temperatureZone,
      message: message,
      raw_data: data,
    })

    if (error) {
      console.error('[v0] Error inserting event:', error)
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
    }

    // Send to Google Sheets via Apps Script
    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL
    if (googleScriptUrl) {
      await sendToGoogleSheets(googleScriptUrl, {
        timestamp: new Date().toISOString(),
        event_type: eventType,
        event_subtype: eventSubtype || '',
        temperature_zone: temperatureZone || '',
        message: message,
        raw_data: JSON.stringify(data),
      })
    }

    // Optionally notify via Telegram if configured
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramBotToken && telegramChatId && shouldNotifyTelegram(data)) {
      await sendTelegramMessage(telegramBotToken, telegramChatId, message)
    }

    return NextResponse.json({ success: true, message }, { headers: corsHeaders })
  } catch (error) {
    console.error('[v0] ESP32 API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

function mapEventType(event: string): string {
  if (event.includes('temp') || event.includes('zone')) return 'temperature'
  if (event.includes('water') || event.includes('riego')) return 'watering'
  if (event.includes('protect') || event.includes('protec')) return 'protection'
  return 'alert'
}

function mapEventSubtype(event: string, data: ESP32Data): string {
  if (data.zone === 'frio') return 'cold'
  if (data.zone === 'normal') return 'normal'
  if (data.zone === 'calor') return 'hot'
  if (data.zone === 'calor_extremo') return 'extreme_hot'
  if (data.watering === true) return 'started'
  if (data.watering === false) return 'completed'
  if (data.protection === true) return 'activated'
  if (data.protection === false) return 'deactivated'
  return event
}

function generateMessage(data: ESP32Data): string {
  // Messages similar to Arduino code
  if (data.event === 'startup') {
    return 'Sistema de monitoreo de planta iniciado'
  }
  if (data.zone) {
    const zoneMessages: Record<string, string> = {
      frio: 'Hace FRIO - Estado 2 activado - Protegiendo planta',
      normal: 'Temperatura NORMAL - Estado 0 - Planta estable',
      calor: 'Hace CALOR - Estado 3 activado - Activando riego',
      calor_extremo: 'ALERTA: CALOR EXTREMO - Estado 4 - Riesgo para la planta!',
    }
    return zoneMessages[data.zone] || `Zona: ${data.zone}`
  }
  if (data.watering !== undefined) {
    return data.watering ? 'RIEGO INICIADO - Bomba de agua activada' : 'RIEGO COMPLETADO - Bomba de agua desactivada'
  }
  if (data.protection !== undefined) {
    return data.protection ? 'PROTECCION ACTIVADA - Cubriendo planta del frio' : 'PROTECCION DESACTIVADA'
  }
  return data.event || 'Evento registrado'
}

function shouldNotifyTelegram(data: ESP32Data): boolean {
  // Notify for ALL zone changes and important events (like Arduino code does)
  return (
    data.zone !== undefined ||
    data.watering !== undefined ||
    data.protection !== undefined ||
    data.event === 'startup'
  )
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<boolean> {
  try {
    console.log('[v0] Sending Telegram message to chat:', chatId)
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    })
    const result = await response.json()
    console.log('[v0] Telegram response:', JSON.stringify(result))
    if (!result.ok) {
      console.error('[v0] Telegram API error:', result.description)
      return false
    }
    return true
  } catch (error) {
    console.error('[v0] Telegram send error:', error)
    return false
  }
}

interface GoogleSheetsData {
  timestamp: string
  event_type: string
  event_subtype: string
  temperature_zone: string
  message: string
  raw_data: string
}

async function sendToGoogleSheets(scriptUrl: string, data: GoogleSheetsData) {
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error('[v0] Google Sheets send error:', error)
  }
}
