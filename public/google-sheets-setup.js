/*
 * INSTRUCCIONES PARA CONFIGURAR GOOGLE SHEETS
 * 
 * PASO 1: Crear el Google Sheet
 * 1. Ve a sheets.google.com y crea una nueva hoja
 * 2. En la primera fila, agrega estos encabezados (A1:F1):
 *    | timestamp | event_type | event_subtype | temperature_zone | message | raw_data |
 * 
 * PASO 2: Crear el Apps Script
 * 1. En tu Google Sheet, ve a Extensiones > Apps Script
 * 2. Borra todo el codigo y pega el siguiente:
 */

// ================== CODIGO PARA APPS SCRIPT ==================
// Copia desde aqui:

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Agregar fila con los datos
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.event_type || '',
      data.event_subtype || '',
      data.temperature_zone || '',
      data.message || '',
      data.raw_data || ''
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Datos guardados'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'PlantBot Google Sheets API activa'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Hasta aqui

/*
 * PASO 3: Desplegar como Web App
 * 1. Guarda el script (Ctrl+S)
 * 2. Click en "Implementar" > "Nueva implementacion"
 * 3. Selecciona tipo: "Aplicacion web"
 * 4. Configura:
 *    - Descripcion: "PlantBot API"
 *    - Ejecutar como: "Yo"
 *    - Quien tiene acceso: "Cualquier persona"
 * 5. Click en "Implementar"
 * 6. Autoriza la aplicacion cuando lo pida
 * 7. Copia la URL que te da (sera algo como: https://script.google.com/macros/s/XXX/exec)
 * 
 * PASO 4: Configurar las variables de entorno en Vercel
 * En tu proyecto de Vercel, agrega estas variables:
 * 
 * GOOGLE_SCRIPT_URL = https://script.google.com/macros/s/TU_ID/exec
 * NEXT_PUBLIC_GOOGLE_SHEET_URL = https://docs.google.com/spreadsheets/d/TU_SHEET_ID/edit
 * 
 * Donde:
 * - TU_ID es el ID del script (lo obtienes en el paso 3.7)
 * - TU_SHEET_ID es el ID del spreadsheet (lo ves en la URL de tu Google Sheet)
 *
 * PASO 5: Probar
 * Puedes probar enviando un POST desde la terminal:
 * 
 * curl -X POST "https://script.google.com/macros/s/TU_ID/exec" \
 *   -H "Content-Type: application/json" \
 *   -d '{"timestamp":"2024-01-01T12:00:00Z","event_type":"test","message":"Prueba"}'
 */
