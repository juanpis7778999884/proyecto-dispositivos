import { createClient } from '@/lib/supabase/server'
import { PlantStatus } from '@/components/plant-status'
import { EventsChart } from '@/components/events-chart'
import { EventsTimeline } from '@/components/events-timeline'
import { AISummary } from '@/components/ai-summary'
import { PlantChat } from '@/components/plant-chat'
import type { PlantEvent } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get events from the last 7 days
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)

  const { data: events } = await supabase
    .from('plant_events')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  const plantEvents = (events as PlantEvent[]) || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <PlantLogo />
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                PlantBot Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">
                Monitoreo inteligente de plantas con ESP32
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md bg-[#0F9D58] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0F9D58]/90"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 11V9h-6V3H9v6H3v2h6v6h2v-6h6zm2 8H3a1 1 0 01-1-1v-2h20v2a1 1 0 01-1 1z"/>
              </svg>
              Ver Google Sheets
            </a>
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Conectado
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Status Cards */}
        <section className="mb-6">
          <PlantStatus events={plantEvents} />
        </section>

        {/* Charts and Timeline Row */}
        <section className="mb-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EventsChart events={plantEvents} />
          </div>
          <div>
            <EventsTimeline events={plantEvents.slice(0, 20)} />
          </div>
        </section>

        {/* AI Section */}
        <section className="grid gap-6 lg:grid-cols-2">
          <AISummary />
          <PlantChat />
        </section>

        {/* API Info */}
        <section className="mt-8 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Endpoints API
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <EndpointCard
              method="POST"
              path="/api/esp32"
              description="Receptor de eventos del ESP32"
            />
            <EndpointCard
              method="POST"
              path="/api/telegram"
              description="Webhook de Telegram"
            />
            <EndpointCard
              method="GET"
              path="/api/events"
              description="Obtener historial de eventos"
            />
            <EndpointCard
              method="POST"
              path="/api/chat"
              description="Chat con IA (streaming)"
            />
          </div>
        </section>
      </main>
    </div>
  )
}

function PlantLogo() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
      <svg
        className="h-6 w-6 text-primary-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M7 20h10" />
        <path d="M10 20c5.5-2.5.8-6.4 3-10" />
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
      </svg>
    </div>
  )
}

function EndpointCard({
  method,
  path,
  description,
}: {
  method: string
  path: string
  description: string
}) {
  return (
    <div className="rounded-md bg-secondary/50 p-3">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
            method === 'GET'
              ? 'bg-primary/20 text-primary'
              : 'bg-[oklch(0.70_0.22_30)]/20 text-[oklch(0.70_0.22_30)]'
          }`}
        >
          {method}
        </span>
        <code className="text-xs text-foreground">{path}</code>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
