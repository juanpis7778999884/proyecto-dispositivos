'use client'

import { cn } from '@/lib/utils'
import type { PlantEvent } from '@/lib/types'

interface EventsTimelineProps {
  events: PlantEvent[]
}

export function EventsTimeline({ events }: EventsTimelineProps) {
  const getEventIcon = (event: PlantEvent) => {
    if (event.event_type === 'temperature') {
      if (event.temperature_zone === 'frio') return <SnowflakeIcon />
      if (event.temperature_zone === 'calor_extremo') return <FireIcon />
      if (event.temperature_zone === 'calor') return <SunIcon />
      return <ThermometerIcon />
    }
    if (event.event_type === 'watering') return <DropletIcon />
    if (event.event_type === 'protection') return <ShieldIcon />
    return <AlertIcon />
  }

  const getEventColor = (event: PlantEvent) => {
    if (event.temperature_zone === 'frio') return 'text-[oklch(0.65_0.20_220)]'
    if (event.temperature_zone === 'calor_extremo') return 'text-destructive'
    if (event.temperature_zone === 'calor') return 'text-[oklch(0.70_0.22_60)]'
    if (event.event_type === 'watering') return 'text-primary'
    if (event.event_type === 'protection') return 'text-[oklch(0.75_0.18_280)]'
    return 'text-muted-foreground'
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-medium text-foreground">
        Historial de Eventos
      </h3>
      <div className="max-h-96 space-y-1 overflow-y-auto">
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay eventos registrados
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary"
            >
              <div className={cn('mt-0.5', getEventColor(event))}>
                {getEventIcon(event)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{event.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(event.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Icons as inline SVGs
function ThermometerIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  )
}

function SnowflakeIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="m20 16-4-4 4-4" />
      <path d="m4 8 4 4-4 4" />
      <path d="m16 4-4 4-4-4" />
      <path d="m8 20 4-4 4 4" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function FireIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

function DropletIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
