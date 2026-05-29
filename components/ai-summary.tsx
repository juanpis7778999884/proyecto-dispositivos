'use client'

import { useState } from 'react'

interface AISummaryProps {
  initialSummary?: string
}

export function AISummary({ initialSummary }: AISummaryProps) {
  const [summary, setSummary] = useState(initialSummary || '')
  const [isLoading, setIsLoading] = useState(false)
  const [summaryType, setSummaryType] = useState<'daily' | 'weekly'>('daily')

  const generateSummary = async (type: 'daily' | 'weekly') => {
    setIsLoading(true)
    setSummaryType(type)
    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await response.json()
      setSummary(data.summary || 'No se pudo generar el resumen.')
    } catch {
      setSummary('Error al generar el resumen.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Analisis con IA</h3>
        <div className="flex gap-2">
          <button
            onClick={() => generateSummary('daily')}
            disabled={isLoading}
            className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            {isLoading && summaryType === 'daily' ? 'Analizando...' : 'Hoy'}
          </button>
          <button
            onClick={() => generateSummary('weekly')}
            disabled={isLoading}
            className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
          >
            {isLoading && summaryType === 'weekly'
              ? 'Analizando...'
              : 'Semana'}
          </button>
        </div>
      </div>
      <div className="min-h-32 rounded-md bg-secondary/50 p-3">
        {summary ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {summary}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Haz clic en &quot;Hoy&quot; o &quot;Semana&quot; para generar un
            analisis de tu planta con IA.
          </p>
        )}
      </div>
    </div>
  )
}
