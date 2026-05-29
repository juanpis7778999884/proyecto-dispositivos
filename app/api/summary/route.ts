import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import type { PlantEvent } from '@/lib/types'

// Generate or retrieve daily summary
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')

    const supabase = await createClient()

    // Get existing summaries
    const { data: summaries, error } = await supabase
      .from('daily_summaries')
      .select('*')
      .order('summary_date', { ascending: false })
      .limit(days)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ summaries })
  } catch (error) {
    console.error('[v0] Summary API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Generate a new summary for today or a specific date
export async function POST(req: Request) {
  try {
    const { date, type } = await req.json()
    const targetDate = date ? new Date(date) : new Date()
    const dateStr = targetDate.toISOString().split('T')[0]

    const supabase = await createClient()

    // Get events for the target date
    const startOfDay = new Date(dateStr)
    const endOfDay = new Date(dateStr)
    endOfDay.setDate(endOfDay.getDate() + 1)

    let query = supabase
      .from('plant_events')
      .select('*')
      .order('created_at', { ascending: true })

    // For weekly summary, get last 7 days
    if (type === 'weekly') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      query = query.gte('created_at', weekAgo.toISOString())
    } else {
      query = query
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
    }

    const { data: events } = await query

    if (!events || events.length === 0) {
      return NextResponse.json({
        summary: type === 'weekly'
          ? 'No hay eventos registrados en la ultima semana.'
          : 'No hay eventos registrados para este dia.',
      })
    }

    // Calculate stats
    const heatAlerts = events.filter(
      (e) =>
        e.temperature_zone === 'calor' || e.temperature_zone === 'calor_extremo'
    ).length
    const coldAlerts = events.filter((e) => e.temperature_zone === 'frio').length
    const waterings = events.filter((e) => e.event_type === 'watering').length
    const protections = events.filter(
      (e) => e.event_type === 'protection'
    ).length

    // Generate AI summary
    const summaryText = await generateAISummary(
      events as PlantEvent[],
      type || 'daily'
    )

    // Save to database (only for daily)
    if (type !== 'weekly') {
      await supabase.from('daily_summaries').upsert({
        summary_date: dateStr,
        summary_text: summaryText,
        total_events: events.length,
        heat_alerts: heatAlerts,
        cold_alerts: coldAlerts,
        waterings: waterings,
        protections: protections,
      })
    }

    return NextResponse.json({
      summary: summaryText,
      stats: {
        total_events: events.length,
        heat_alerts: heatAlerts,
        cold_alerts: coldAlerts,
        waterings: waterings,
        protections: protections,
      },
    })
  } catch (error) {
    console.error('[v0] Summary generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateAISummary(
  events: PlantEvent[],
  type: string
): Promise<string> {
  const eventsText = events
    .map(
      (e) => `[${new Date(e.created_at).toLocaleString('es-ES')}] ${e.message}`
    )
    .join('\n')

  const prompt =
    type === 'weekly'
      ? `Analiza los eventos de la planta de la ultima semana y genera un resumen detallado con:
1. Resumen general del estado
2. Patrones identificados
3. Problemas detectados
4. Recomendaciones para la proxima semana

Eventos:
${eventsText}`
      : `Genera un resumen conciso del dia para esta planta basandote en los eventos:
${eventsText}

Incluye: estado general, alertas importantes, y una recomendacion.`

  try {
    const result = await generateText({
      model: 'anthropic/claude-sonnet-4-20250514',
      system:
        'Eres un experto en cuidado de plantas. Genera resumenes claros y utiles en espanol.',
      prompt,
    })

    return result.text
  } catch (error) {
    console.error('[v0] AI summary error:', error)
    return 'Error generando resumen automatico.'
  }
}
