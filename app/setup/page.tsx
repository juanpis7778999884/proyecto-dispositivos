import Link from 'next/link'

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver al Dashboard
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            Guia de Configuracion
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8">
          {/* Paso 1: API Key de Claude */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
                1
              </span>
              Obtener API Key de Claude (Anthropic)
            </h2>
            <ol className="ml-10 list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Ve a{' '}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  console.anthropic.com
                </a>
              </li>
              <li>Crea una cuenta o inicia sesion</li>
              <li>
                Ve a <strong>API Keys</strong> en el menu lateral
              </li>
              <li>
                Crea una nueva API key y copiala
              </li>
              <li>
                En v0, ve a <strong>Settings → Vars</strong> y agrega:
                <code className="ml-2 rounded bg-secondary px-2 py-1 text-foreground">
                  AI_GATEWAY_API_KEY=tu-api-key
                </code>
              </li>
            </ol>
          </section>

          {/* Paso 2: Bot de Telegram */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
                2
              </span>
              Crear Bot de Telegram
            </h2>
            <ol className="ml-10 list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Abre Telegram y busca{' '}
                <strong>@BotFather</strong>
              </li>
              <li>
                Envia el comando <code>/newbot</code>
              </li>
              <li>Sigue las instrucciones para nombrar tu bot</li>
              <li>
                BotFather te dara un <strong>token</strong> - copialo
              </li>
              <li>
                Agrega en v0 Settings → Vars:
                <code className="ml-2 block rounded bg-secondary px-2 py-1 text-foreground">
                  TELEGRAM_BOT_TOKEN=tu-token
                </code>
              </li>
              <li>
                Inicia una conversacion con tu bot y envia cualquier mensaje
              </li>
              <li>
                Visita{' '}
                <code className="rounded bg-secondary px-1 text-foreground">
                  https://api.telegram.org/bot{'<TOKEN>'}/getUpdates
                </code>{' '}
                para obtener tu chat_id
              </li>
              <li>
                Agrega:
                <code className="ml-2 block rounded bg-secondary px-2 py-1 text-foreground">
                  TELEGRAM_CHAT_ID=tu-chat-id
                </code>
              </li>
            </ol>
          </section>

          {/* Paso 3: Configurar Webhook */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
                3
              </span>
              Configurar Webhook de Telegram
            </h2>
            <div className="ml-10 space-y-3 text-sm text-muted-foreground">
              <p>
                Una vez desplegado en Vercel, configura el webhook para recibir
                mensajes:
              </p>
              <code className="block overflow-x-auto rounded bg-secondary p-3 text-foreground">
                {`curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://tu-proyecto.vercel.app/api/telegram"}'`}
              </code>
              <p className="text-xs">
                Reemplaza {'<TOKEN>'} con tu token y la URL con tu dominio de
                Vercel.
              </p>
            </div>
          </section>

          {/* Paso 4: ESP32 */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
                4
              </span>
              Actualizar codigo del ESP32
            </h2>
            <div className="ml-10 space-y-3 text-sm text-muted-foreground">
              <p>
                Descarga el codigo actualizado del ESP32 que envia eventos al
                servidor:
              </p>
              <a
                href="/esp32-code.ino"
                download
                className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/80"
              >
                Descargar esp32-code.ino
              </a>
              <p className="mt-4">Cambios principales:</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Ya no llama directamente a Telegram</li>
                <li>Envia eventos HTTP POST al servidor</li>
                <li>El servidor maneja Telegram y la IA</li>
                <li>
                  Configura <code>SERVER_URL</code> con tu URL de Vercel
                </li>
              </ul>
            </div>
          </section>

          {/* Formato JSON */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Formato de eventos ESP32
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>El ESP32 envia eventos en este formato JSON:</p>
              <pre className="overflow-x-auto rounded bg-secondary p-3 text-foreground">
                {`{
  "event": "temperature_change",
  "zone": "calor",
  "watering": false,
  "protection": false,
  "timestamp": 123456789,
  "device_id": "esp32-planta-01"
}`}
              </pre>
              <p className="mt-4">Eventos soportados:</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  <code>temperature_change</code> - Cambio de zona de
                  temperatura
                </li>
                <li>
                  <code>watering</code> - Inicio/fin de riego
                </li>
                <li>
                  <code>protection</code> - Activacion/desactivacion de
                  proteccion
                </li>
                <li>
                  <code>startup</code> - Inicio del dispositivo
                </li>
              </ul>
            </div>
          </section>

          {/* Test API */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Probar la API manualmente
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Puedes probar el endpoint ESP32 con curl:</p>
              <pre className="overflow-x-auto rounded bg-secondary p-3 text-foreground">
                {`curl -X POST "https://tu-proyecto.vercel.app/api/esp32" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "temperature_change",
    "zone": "calor_extremo",
    "watering": false,
    "protection": false
  }'`}
              </pre>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
