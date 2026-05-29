// Types for the plant monitoring system

export interface PlantEvent {
  id: string
  event_type: 'temperature' | 'watering' | 'protection' | 'alert'
  event_subtype: string | null
  temperature_zone: 'frio' | 'normal' | 'calor' | 'calor_extremo' | null
  message: string
  raw_data: ESP32Data | null
  created_at: string
}

export interface DailySummary {
  id: string
  summary_date: string
  summary_text: string
  total_events: number
  heat_alerts: number
  cold_alerts: number
  waterings: number
  protections: number
  created_at: string
}

// Data sent from ESP32
export interface ESP32Data {
  event: string
  zone?: string
  watering?: boolean
  protection?: boolean
  timestamp?: number
  device_id?: string
}

// Telegram webhook payload
export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      first_name: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    date: number
    text?: string
  }
}

// Chart data for the dashboard
export interface ChartDataPoint {
  date: string
  heat: number
  cold: number
  watering: number
  protection: number
}
