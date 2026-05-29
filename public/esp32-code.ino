/*
 * PlantBot ESP32 - Sistema de Monitoreo de Plantas
 * 
 * Este codigo mantiene la MISMA LOGICA que tu codigo original:
 * - Estados: 0 (inicio), 2 (frio), 3 (normal), 4 (calor), -1 (danado)
 * - Botones: bFrio, bNormal, bCalor
 * - Display 7 segmentos
 * - LEDs: verde, rojo, amarillo, azul, blanco
 * 
 * DIFERENCIA: En lugar de llamar a Telegram directamente,
 * envia eventos HTTP al servidor que los guarda en la base de datos.
 * 
 * CONFIGURACION:
 * 1. Cambia WIFI_SSID y WIFI_PASSWORD
 * 2. Cambia SERVER_URL por tu URL de Vercel despues de desplegar
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============== CONFIGURACION ==============
const char* WIFI_SSID = "iPhone de Oscar";      // Tu WiFi
const char* WIFI_PASSWORD = "2025oscar";        // Tu password

// URL del servidor - Ya configurada con tu proyecto
const char* SERVER_URL = "https://v0-proyectoriego.vercel.app/api/esp32";

// ============== PINES (igual que tu codigo) ==============
int verde = 2, rojo = 4, amarillo = 5, azul = 18, blanco = 19;
int bFrio = 13, bNormal = 14, bCalor = 33;
int a = 21, b = 22, c = 23, d = 25, e = 26, f = 27, g = 32;

// ============== VARIABLES DE ESTADO ==============
int estado = 0;
bool sistemaOn = true;
unsigned long tCambioEstado = 0;
bool regando = false;
bool protegido = false;
bool riegoTerminado = false;
unsigned long tRiego = 0;

// Control de comandos remotos
unsigned long ultimoCheckComandos = 0;
const unsigned long INTERVALO_CHECK = 5000; // Verificar cada 5 segundos

// ============== FUNCIONES DE DISPLAY ==============
void displayNum(int n) {
  digitalWrite(a, HIGH); digitalWrite(b, HIGH); digitalWrite(c, HIGH);
  digitalWrite(d, HIGH); digitalWrite(e, HIGH); digitalWrite(f, HIGH); digitalWrite(g, HIGH);
  
  if (n == 0) { digitalWrite(a, LOW); digitalWrite(b, LOW); digitalWrite(c, LOW); digitalWrite(d, LOW); digitalWrite(e, LOW); digitalWrite(f, LOW); }
  if (n == 2) { digitalWrite(a, LOW); digitalWrite(b, LOW); digitalWrite(g, LOW); digitalWrite(e, LOW); digitalWrite(d, LOW); }
  if (n == 3) { digitalWrite(a, LOW); digitalWrite(b, LOW); digitalWrite(c, LOW); digitalWrite(d, LOW); digitalWrite(g, LOW); }
  if (n == 4) { digitalWrite(f, LOW); digitalWrite(g, LOW); digitalWrite(b, LOW); digitalWrite(c, LOW); }
}

void apagarLeds() {
  digitalWrite(verde, LOW); digitalWrite(rojo, LOW); digitalWrite(amarillo, LOW);
  digitalWrite(azul, LOW); digitalWrite(blanco, LOW);
}

void encenderTodos() {
  digitalWrite(verde, HIGH); digitalWrite(rojo, HIGH); digitalWrite(amarillo, HIGH);
  digitalWrite(azul, HIGH); digitalWrite(blanco, HIGH);
}

// ============== FUNCION ENVIAR EVENTO AL SERVIDOR ==============
void enviarEvento(const char* evento, const char* zona = nullptr, bool watering = false, bool protection = false) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WiFi desconectado");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  StaticJsonDocument<256> doc;
  doc["event"] = evento;
  if (zona != nullptr) doc["zone"] = zona;
  doc["watering"] = watering;
  doc["protection"] = protection;
  doc["estado"] = estado;
  doc["timestamp"] = millis();
  doc["device_id"] = "esp32-planta-01";

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.print("[ENVIANDO] ");
  Serial.println(jsonString);

  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    Serial.printf("[OK] HTTP %d\n", httpCode);
  } else {
    Serial.printf("[ERROR] %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ============== FUNCION VERIFICAR COMANDOS REMOTOS ==============
void verificarComandos() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - ultimoCheckComandos < INTERVALO_CHECK) return;
  ultimoCheckComandos = millis();

  HTTPClient http;
  String url = String(SERVER_URL) + "/commands?device=esp32-planta-01";
  http.begin(url);
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<128> doc;
    if (deserializeJson(doc, response) == DeserializationOk) {
      const char* comando = doc["command"];
      if (comando != nullptr) {
        procesarComando(String(comando));
      }
    }
  }
  
  http.end();
}

void procesarComando(String comando) {
  Serial.print("[COMANDO] ");
  Serial.println(comando);

  if (comando == "on") {
    sistemaOn = true;
    enviarEvento("system_on");
  }
  else if (comando == "off") {
    sistemaOn = false;
    estado = 0;
    apagarLeds();
    enviarEvento("system_off");
  }
  else if (comando == "regar" && estado == 4 && sistemaOn) {
    regando = true;
    tRiego = millis();
    enviarEvento("watering_started", "calor", true, false);
  }
  else if (comando == "proteger" && estado == 2 && sistemaOn) {
    protegido = true;
    estado = 3;
    enviarEvento("protection_activated", "normal", false, true);
  }
  else if (comando == "reset" && sistemaOn) {
    estado = 0;
    regando = false;
    protegido = false;
    riegoTerminado = false;
    tCambioEstado = 0;
    apagarLeds();
    enviarEvento("system_reset");
  }
}

// ============== SETUP ==============
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== PlantBot ESP32 Iniciando ===");

  // Configurar pines
  pinMode(verde, OUTPUT); pinMode(rojo, OUTPUT); pinMode(amarillo, OUTPUT);
  pinMode(azul, OUTPUT); pinMode(blanco, OUTPUT);
  pinMode(bFrio, INPUT_PULLDOWN); pinMode(bNormal, INPUT_PULLDOWN); pinMode(bCalor, INPUT_PULLDOWN);
  pinMode(a, OUTPUT); pinMode(b, OUTPUT); pinMode(c, OUTPUT);
  pinMode(d, OUTPUT); pinMode(e, OUTPUT); pinMode(f, OUTPUT); pinMode(g, OUTPUT);

  // Conectar WiFi
  Serial.print("Conectando a WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Enviar evento de inicio
  enviarEvento("startup", "normal");
  Serial.println("Sistema iniciado!");
}

// ============== LOOP PRINCIPAL ==============
void loop() {
  // Verificar comandos remotos del servidor
  verificarComandos();

  // Si el sistema esta apagado
  if (!sistemaOn) {
    displayNum(-1);
    return;
  }

  // ========== LECTURA DE BOTONES/SENSORES ==========
  
  // Boton FRIO
  if (digitalRead(bFrio) && estado != 2) {
    estado = 2;
    protegido = false;
    tCambioEstado = millis();
    enviarEvento("temperature_change", "frio");
    Serial.println("[ALERTA] Frio detectado - Proteger cultivo");
  }

  // Boton NORMAL
  if (digitalRead(bNormal) && estado != 3) {
    estado = 3;
    tCambioEstado = millis();
    enviarEvento("temperature_change", "normal");
    Serial.println("[OK] Planta en buen estado");
  }

  // Boton CALOR
  if (digitalRead(bCalor) && estado != 4) {
    estado = 4;
    tCambioEstado = millis();
    enviarEvento("temperature_change", "calor");
    Serial.println("[ALERTA] Calor detectado - Puedes regar");
  }

  // ========== LOGICA DE DANO (20 segundos sin accion) ==========
  if (estado == 2 || estado == 4) {
    if (!regando && !protegido && !riegoTerminado && (millis() - tCambioEstado > 20000)) {
      estado = -1;
      encenderTodos();
      enviarEvento("plant_damaged", "calor_extremo");
      Serial.println("[CRITICO] La planta se ha danado!");
    }
  }

  // ========== LOGICA DE RIEGO ==========
  if (regando) {
    if (millis() - tRiego < 10000) {
      digitalWrite(azul, HIGH);
      digitalWrite(rojo, LOW);
      digitalWrite(verde, LOW);
    } else {
      regando = false;
      riegoTerminado = true;
      estado = 3;
      digitalWrite(azul, LOW);
      digitalWrite(verde, HIGH);
      enviarEvento("watering_completed", "normal", false);
      Serial.println("[OK] Riego completado");
    }
  }

  // ========== ACTUALIZACION DE DISPLAY Y LEDS ==========
  if (estado != -1) {
    displayNum(estado);
    
    if (!regando) {
      if (!riegoTerminado) apagarLeds();

      // Estado FRIO (2)
      if (estado == 2) {
        if (!protegido) {
          digitalWrite(azul, HIGH);
          digitalWrite(verde, (millis() % 600 < 300));
        }
      }

      // Estado NORMAL (3)
      if (estado == 3) {
        digitalWrite(verde, HIGH);
        digitalWrite(amarillo, HIGH);
      }

      // Estado CALOR (4)
      if (estado == 4 && !riegoTerminado) {
        digitalWrite(rojo, HIGH);
        digitalWrite(verde, (millis() % 400 < 200));
      }

      if (riegoTerminado) {
        digitalWrite(verde, HIGH);
      }
    }
  }

  delay(50);
}

/*
 * ===========================================
 * NOTAS IMPORTANTES:
 * ===========================================
 * 
 * 1. DIFERENCIA CON TU CODIGO ORIGINAL:
 *    - Tu codigo usa Telegram directamente (bot.sendMessage)
 *    - Este codigo envia HTTP POST al servidor
 *    - El servidor guarda en base de datos Y envia a Telegram
 * 
 * 2. PARA USAR TU CODIGO ORIGINAL SIN CAMBIOS:
 *    Si prefieres usar tu codigo original con Telegram directo,
 *    el dashboard web funcionara pero NO recibira los eventos.
 *    Solo mostrara los eventos que reciba por el webhook de Telegram.
 * 
 * 3. DESPUES DE DESPLEGAR EN VERCEL:
 *    - Copia la URL de tu proyecto (ej: mi-planta.vercel.app)
 *    - Cambia SERVER_URL arriba
 *    - Sube de nuevo al ESP32
 * 
 * 4. PARA PROBAR SIN HARDWARE:
 *    Puedes usar curl para simular el ESP32:
 *    
 *    curl -X POST "https://tu-proyecto.vercel.app/api/esp32" \
 *      -H "Content-Type: application/json" \
 *      -d '{"event":"temperature_change","zone":"calor"}'
 */
