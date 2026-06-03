import { groq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from 'ai'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const supabase = await createClient()

  const { data: events } = await supabase
    .from('plant_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: estadoActual } = await supabase
    .from('estados_sistema')
    .select('*')
    .eq('id', 1)
    .single()

  const plantContext = buildPlantContext(events, estadoActual)

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: `Eres PlantBot, un asistente experto en cuidado de plantas conectado a un sistema de monitoreo con ESP32 en Santander, Colombia.
Tienes acceso a datos en tiempo real de la planta a través de Supabase. Responde de manera amigable, concisa y en español.
IMPORTANTE: Usa SOLO los datos reales proporcionados. NO inventes temperaturas ni datos que no estén en el contexto.

${plantContext}

Puedes:
- Informar sobre el estado actual de la planta (si está regando o no, su temperatura).
- Dar consejos de cuidado basados en los datos reales.
- Explicar qué significan las alertas de calor o frío.
- Recomendar acciones específicas.`,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}

function buildPlantContext(events: any[] | null, estadoActual: any | null): string {
  if (!events || events.length === 0) {
    return 'No hay datos históricos de la planta disponibles todavía.'
  }

  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  
  const recentEvents = events.filter(
    (e) => new Date(e.created_at) > oneDayAgo
  )

  const heatAlerts = recentEvents.filter((e) => e.temperature_zone === 'calor').length
  const coldAlerts = recentEvents.filter((e) => e.temperature_zone === 'frio').length
  const waterings = recentEvents.filter((e) => e.event_type === 'watering').length

  const recentHistory = events
    .slice(0, 10)
    .map((e) => `- [${new Date(e.created_at).toLocaleString('es-ES')}] ${e.message || 'Evento registrado'}`)
    .join('\n')

  return `
ESTADO ACTUAL EN TIEMPO REAL:
- ¿Riego activado en este momento?: ${estadoActual?.riego_activo ? 'SÍ, está regando' : 'NO, el riego está apagado'}
- Última zona de temperatura registrada: ${estadoActual?.ultima_temperatura || 'desconocida'}
- Última actualización del sistema: ${estadoActual?.updated_at ? new Date(estadoActual.updated_at).toLocaleString('es-ES') : 'N/A'}

RESUMEN ÚLTIMAS 24 HORAS:
- Alertas de calor detectadas: ${heatAlerts}
- Alertas de frío detectadas: ${coldAlerts}
- Total de ciclos de riego ejecutados: ${waterings}

HISTORIAL RECIENTE DE ALERTAS:
${recentHistory}
`
}