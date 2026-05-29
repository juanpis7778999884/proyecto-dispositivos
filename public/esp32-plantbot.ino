/*
 * PlantBot ESP32 - Codigo modificado para conectar con el backend
 * 
 * CAMBIOS RESPECTO AL ORIGINAL:
 * 1. Eliminada dependencia de UniversalTelegramBot
 * 2. Ahora envia HTTP POST al servidor Node.js
 * 3. El servidor maneja Telegram, Supabase y Google Sheets
 * 
 * INSTRUCCIONES:
 * 1. Cambia SERVER_URL por la URL de tu servidor desplegado en Vercel
 * 2. Cambia las credenciales WiFi
 * 3. Sube el codigo al ESP32
 */

#include &lt;WiFi.h&gt;
#include &lt;HTTPClient.h&gt;
#include &lt;ArduinoJson.h&gt;

// ============ CONFIGURACION - MODIFICAR ESTOS VALORES ============
const char* ssid = "TU_WIFI_SSID";           // Cambia por tu WiFi
const char* password = "TU_WIFI_PASSWORD";   // Cambia por tu password

// URL del servidor (cuando despliegues en Vercel sera algo como: https://tu-proyecto.vercel.app/api/esp32)
const char* SERVER_URL = "https://TU-PROYECTO.vercel.app/api/esp32";
// =================================================================

// Pines (igual que tu codigo original)
int verde = 2, rojo = 4, amarillo = 5, azul = 18, blanco = 19;
int bFrio = 13, bNormal = 14, bCalor = 33;
int a = 21, b = 22, c = 23, d = 25, e = 26, f = 27, g = 32;

// Variables de estado
int estado = 0;
bool sistemaOn = true;
unsigned long tCambioEstado = 0;
bool regando = false;
bool protegido = false;
bool riegoTerminado = false;
unsigned long tRiego = 0;
int ultimoEstadoEnviado = -99;

// Funcion para enviar evento al servidor
void enviarEvento(String evento, String zona = "", bool riego = false, bool proteccion = false) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado, reconectando...");
    WiFi.reconnect();
    delay(1000);
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Crear JSON con ArduinoJson
  StaticJsonDocument&lt;256&gt; doc;
  doc["event"] = evento;
  doc["estado"] = estado;
  
  if (zona != "") {
    doc["zone"] = zona;
  }
  if (riego) {
    doc["watering"] = true;
  }
  if (proteccion) {
    doc["protection"] = true;
  }

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.print("Enviando: ");
  Serial.println(jsonString);

  int httpCode = http.POST(jsonString);

  if (httpCode &gt; 0) {
    String response = http.getString();
    Serial.print("Respuesta (");
    Serial.print(httpCode);
    Serial.print("): ");
    Serial.println(response);
  } else {
    Serial.print("Error HTTP: ");
    Serial.println(httpCode);
  }

  http.end();
}

// Funciones del display y LEDs (igual que original)
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

void setup() {
  Serial.begin(115200);
  
  // Configurar pines
  pinMode(verde, OUTPUT); pinMode(rojo, OUTPUT); pinMode(amarillo, OUTPUT);
  pinMode(azul, OUTPUT); pinMode(blanco, OUTPUT);
  pinMode(bFrio, INPUT_PULLDOWN); pinMode(bNormal, INPUT_PULLDOWN); pinMode(bCalor, INPUT_PULLDOWN);
  pinMode(a, OUTPUT); pinMode(b, OUTPUT); pinMode(c, OUTPUT); 
  pinMode(d, OUTPUT); pinMode(e, OUTPUT); pinMode(f, OUTPUT); pinMode(g, OUTPUT);

  // Conectar WiFi
  Serial.print("Conectando a WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Enviar evento de inicio
  enviarEvento("sistema_iniciado");
}

void loop() {
  if (!sistemaOn) {
    displayNum(-1);
    return;
  }

  // Detectar cambios de zona por botones
  if (digitalRead(bFrio) &amp;&amp; estado != 2) {
    estado = 2;
    protegido = false;
    tCambioEstado = millis();
    enviarEvento("zona_frio", "frio");
  }
  
  if (digitalRead(bNormal) &amp;&amp; estado != 3) {
    estado = 3;
    tCambioEstado = millis();
    enviarEvento("zona_normal", "normal");
  }
  
  if (digitalRead(bCalor) &amp;&amp; estado != 4) {
    estado = 4;
    tCambioEstado = millis();
    enviarEvento("zona_calor", "calor");
  }

  // Logica de dano (20 segundos sin accion en zona critica)
  if (estado == 2 || estado == 4) {
    if (!regando &amp;&amp; !protegido &amp;&amp; !riegoTerminado &amp;&amp; (millis() - tCambioEstado &gt; 20000)) {
      estado = -1;
      encenderTodos();
      enviarEvento("planta_danada", "calor_extremo");
    }
  }

  // Actualizar display y LEDs
  if (estado != -1) {
    displayNum(estado);
    
    if (regando) {
      if (millis() - tRiego &lt; 10000) {
        digitalWrite(azul, HIGH);
        digitalWrite(rojo, LOW);
        digitalWrite(verde, LOW);
      } else {
        regando = false;
        riegoTerminado = true;
        estado = 3;
        digitalWrite(azul, LOW);
        digitalWrite(verde, HIGH);
        enviarEvento("riego_completado", "normal");
      }
    } else {
      if (!riegoTerminado) apagarLeds();

      if (estado == 2) {
        if (!protegido) {
          digitalWrite(azul, HIGH);
          digitalWrite(verde, (millis() % 600 &lt; 300));
        }
      }

      if (estado == 3) {
        digitalWrite(verde, HIGH);
        digitalWrite(amarillo, HIGH);
      }

      if (estado == 4 &amp;&amp; !riegoTerminado) {
        digitalWrite(rojo, HIGH);
        digitalWrite(verde, (millis() % 400 &lt; 200));
      }

      if (riegoTerminado) {
        digitalWrite(verde, HIGH);
      }
    }
  }

  delay(100); // Pequeno delay para estabilidad
}

// Funciones para comandos externos (pueden llamarse desde Serial para pruebas)
void iniciarRiego() {
  if (estado == 4) {
    regando = true;
    tRiego = millis();
    enviarEvento("riego_iniciado", "", true);
  }
}

void activarProteccion() {
  if (estado == 2) {
    protegido = true;
    estado = 3;
    enviarEvento("proteccion_activada", "normal", false, true);
  }
}

void resetSistema() {
  estado = 0;
  regando = false;
  protegido = false;
  riegoTerminado = false;
  tCambioEstado = 0;
  apagarLeds();
  enviarEvento("sistema_reset");
}
