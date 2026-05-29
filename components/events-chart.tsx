'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PlantEvent } from '@/lib/types'

interface EventsChartProps {
  events: PlantEvent[]
}

export function EventsChart({ events }: EventsChartProps) {
  // Group events by date
  const chartData = processEventsForChart(events)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Eventos por Dia
        </h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[oklch(0.70_0.22_30)]" />
            Calor
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[oklch(0.65_0.20_220)]" />
            Frio
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Riego
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="heatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="oklch(0.70 0.22 30)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.70 0.22 30)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="coldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="oklch(0.65 0.20 220)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.65 0.20 220)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="oklch(0.72 0.19 145)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.72 0.19 145)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.28 0.01 260)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: 'oklch(0.65 0 0)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: 'oklch(0.65 0 0)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'oklch(0.17 0.01 260)',
                border: '1px solid oklch(0.28 0.01 260)',
                borderRadius: '0.5rem',
                color: 'oklch(0.95 0 0)',
              }}
            />
            <Area
              type="monotone"
              dataKey="heat"
              stroke="oklch(0.70 0.22 30)"
              fill="url(#heatGradient)"
              strokeWidth={2}
              name="Calor"
            />
            <Area
              type="monotone"
              dataKey="cold"
              stroke="oklch(0.65 0.20 220)"
              fill="url(#coldGradient)"
              strokeWidth={2}
              name="Frio"
            />
            <Area
              type="monotone"
              dataKey="watering"
              stroke="oklch(0.72 0.19 145)"
              fill="url(#waterGradient)"
              strokeWidth={2}
              name="Riego"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function processEventsForChart(events: PlantEvent[]) {
  const groupedByDate: Record<
    string,
    { heat: number; cold: number; watering: number; protection: number }
  > = {}

  events.forEach((event) => {
    const date = new Date(event.created_at).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
    })

    if (!groupedByDate[date]) {
      groupedByDate[date] = { heat: 0, cold: 0, watering: 0, protection: 0 }
    }

    if (
      event.temperature_zone === 'calor' ||
      event.temperature_zone === 'calor_extremo'
    ) {
      groupedByDate[date].heat++
    }
    if (event.temperature_zone === 'frio') {
      groupedByDate[date].cold++
    }
    if (event.event_type === 'watering') {
      groupedByDate[date].watering++
    }
    if (event.event_type === 'protection') {
      groupedByDate[date].protection++
    }
  })

  return Object.entries(groupedByDate)
    .map(([date, counts]) => ({
      date,
      ...counts,
    }))
    .reverse()
}
