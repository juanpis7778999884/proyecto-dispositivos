'use client'

import { cn } from '@/lib/utils'
import type { PlantEvent } from '@/lib/types'

interface StatusCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'cold' | 'normal' | 'hot' | 'extreme'
}

export function StatusCard({
  title,
  value,
  subtitle,
  trend,
  variant = 'default',
}: StatusCardProps) {
  const variantStyles = {
    default: 'border-border',
    cold: 'border-[oklch(0.65_0.20_220)]',
    normal: 'border-primary',
    hot: 'border-[oklch(0.70_0.22_60)]',
    extreme: 'border-destructive',
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4',
        variantStyles[variant]
      )}
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {subtitle && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {trend === 'up' && <TrendUp />}
          {trend === 'down' && <TrendDown />}
          {subtitle}
        </p>
      )}
    </div>
  )
}

function TrendUp() {
  return (
    <svg
      className="h-3 w-3 text-primary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 17l5-5 5 5" />
      <path d="M7 12l5-5 5 5" />
    </svg>
  )
}

function TrendDown() {
  return (
    <svg
      className="h-3 w-3 text-destructive"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 7l5 5 5-5" />
      <path d="M7 12l5 5 5-5" />
    </svg>
  )
}

interface PlantStatusProps {
  events: PlantEvent[]
}

export function PlantStatus({ events }: PlantStatusProps) {
  const lastTempEvent = events.find((e) => e.event_type === 'temperature')
  const lastWatering = events.find((e) => e.event_type === 'watering')
  const lastProtection = events.find((e) => e.event_type === 'protection')

  // Count alerts in last 24 hours
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  const recentEvents = events.filter(
    (e) => new Date(e.created_at) > oneDayAgo
  )

  const heatAlerts = recentEvents.filter(
    (e) =>
      e.temperature_zone === 'calor' || e.temperature_zone === 'calor_extremo'
  ).length
  const coldAlerts = recentEvents.filter(
    (e) => e.temperature_zone === 'frio'
  ).length
  const waterings = recentEvents.filter(
    (e) => e.event_type === 'watering'
  ).length

  const zoneVariant = (zone: string | null | undefined) => {
    if (zone === 'frio') return 'cold'
    if (zone === 'normal') return 'normal'
    if (zone === 'calor') return 'hot'
    if (zone === 'calor_extremo') return 'extreme'
    return 'default'
  }

  const zoneLabel = (zone: string | null | undefined) => {
    if (zone === 'frio') return 'Frio'
    if (zone === 'normal') return 'Normal'
    if (zone === 'calor') return 'Calor'
    if (zone === 'calor_extremo') return 'Extremo'
    return 'Sin datos'
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatusCard
        title="Zona Actual"
        value={zoneLabel(lastTempEvent?.temperature_zone)}
        subtitle={
          lastTempEvent
            ? `Actualizado ${formatTime(lastTempEvent.created_at)}`
            : undefined
        }
        variant={zoneVariant(lastTempEvent?.temperature_zone)}
      />
      <StatusCard
        title="Alertas Calor"
        value={heatAlerts}
        subtitle="Ultimas 24h"
        trend={heatAlerts > 0 ? 'up' : 'neutral'}
        variant={heatAlerts > 3 ? 'extreme' : 'default'}
      />
      <StatusCard
        title="Alertas Frio"
        value={coldAlerts}
        subtitle="Ultimas 24h"
        trend={coldAlerts > 0 ? 'up' : 'neutral'}
        variant={coldAlerts > 3 ? 'cold' : 'default'}
      />
      <StatusCard
        title="Riegos"
        value={waterings}
        subtitle={
          lastWatering
            ? `Ultimo: ${formatTime(lastWatering.created_at)}`
            : 'Sin registros'
        }
        variant="normal"
      />
    </div>
  )
}
