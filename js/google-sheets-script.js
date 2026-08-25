// ============================================================
// GOOGLE APPS SCRIPT — Out Silver: Registro de Pagos en Google Sheets
// ============================================================
// INSTRUCCIONES:
// 1. Crea una nueva Google Sheet
// 2. Ve a Extensiones > Apps Script
// 3. Borra todo el contenido y pega ESTE archivo completo
// 4. Haz clic en "Implementar" > "Nueva implementación"
// 5. Tipo: "Aplicación web"
// 6. Ejecutar como: "Yo" (tu cuenta)
// 7. Quién tiene acceso: "Cualquier persona"
// 8. Copia la URL generada y pégala en tu código
// ============================================================

const SHEET_NAME = 'Pagos';
const RECEIPTS_FOLDER_NAME = 'Comprobantes Out Silver';

/**
 * Inicializa la hoja con los encabezados si no existen.
 */
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'ID',
      'Fecha',
      'Código de Operación',
      'Método',
      'Monto',
      'Cliente',
      'Documento',
      'Productos',
      'Destino (Agencia)',
      'Estado',
      'Imagen'
    ]);

    // Formato de encabezados
    const headerRange = sheet.getRange(1, 1, 1, 11);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#6B2FA0');
    headerRange.setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);

    // Ancho de columnas
    sheet.setColumnWidth(1, 60);   // ID
    sheet.setColumnWidth(2, 160);  // Fecha
    sheet.setColumnWidth(3, 160);  // Código
    sheet.setColumnWidth(4, 80);   // Método
    sheet.setColumnWidth(5, 100);  // Monto
    sheet.setColumnWidth(6, 180);  // Cliente
    sheet.setColumnWidth(7, 150);  // Documento
    sheet.setColumnWidth(8, 350);  // Productos
    sheet.setColumnWidth(9, 200);  // Destino
    sheet.setColumnWidth(10, 100); // Estado
    sheet.setColumnWidth(11, 250); // Imagen
  } else {
    // Migración: agrega la columna "Imagen" a hojas creadas antes de esta función.
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (headers.indexOf('Imagen') === -1) {
      sheet.getRange(1, lastCol + 1).setValue('Imagen');
      sheet.setColumnWidth(lastCol + 1, 250);
    }
  }

  return sheet;
}

/**
 * Obtiene (o crea) la carpeta de Drive donde se guardan los comprobantes.
 */
function getReceiptsFolder() {
  const folders = DriveApp.getFoldersByName(RECEIPTS_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(RECEIPTS_FOLDER_NAME);
}

/**
 * Guarda la imagen del comprobante (base64) en Drive y devuelve su URL pública.
 */
function saveReceiptImage(base64Data, mimeType, code) {
  const folder = getReceiptsFolder();
  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64Data),
    mimeType || 'image/jpeg',
    'comprobante_' + (code || Date.now()) + '.jpg'
  );
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

/**
 * Maneja las solicitudes GET — devuelve el historial de pagos como JSON.
 * Se usa desde metodo-pago.html para mostrar el historial.
 */
function doGet(e) {
  try {
    const sheet = initSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return jsonResponse({ success: true, data: [] });
    }

    const headers = data[0];
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((header, j) => {
        row[header] = data[i][j];
      });
      rows.push(row);
    }

    const action = e?.parameter?.action;

    // Check for status update query
    if (action === 'updateStatus') {
      const code = e.parameter.code || '';
      const newStatus = e.parameter.status || 'Confirmado';
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][2]) === code) { // Columna C (3ra) es el Código de Operación
          sheet.getRange(i + 1, 10).setValue(newStatus); // Columna J (10ma) es el Estado
          return jsonResponse({ success: true, message: 'Estado actualizado a ' + newStatus });
        }
      }
      return jsonResponse({ success: false, error: 'Código de operación no encontrado' });
    }

    // Check for method update query
    if (action === 'updateMethod') {
      const code = e.parameter.code || '';
      const newMethod = e.parameter.method || 'Yape';
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][2]) === code) {
          sheet.getRange(i + 1, 4).setValue(newMethod); // Columna D (4ta) es el Método
          return jsonResponse({ success: true, message: 'Método actualizado a ' + newMethod });
        }
      }
      return jsonResponse({ success: false, error: 'Código de operación no encontrado' });
    }

    // Check for duplicate query
    if (action === 'checkDuplicate') {
      const code = e.parameter.code || '';
      const isDuplicate = rows.some(r => String(r['Código de Operación']) === code);
      return jsonResponse({ success: true, isDuplicate: isDuplicate });
    }

    return jsonResponse({ success: true, data: rows });

  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

/**
 * Maneja las solicitudes POST — registra un nuevo pago.
 * Se usa desde 08-verificacion-pago.js cuando el cliente confirma.
 */
function doPost(e) {
  try {
    const sheet = initSheet();
    const payload = JSON.parse(e.postData.contents);

    // Si la acción es actualizar el estado
    if (payload.action === 'updateStatus') {
      const code = String(payload.code);
      const newStatus = payload.status || 'Confirmado';
      const existingData = sheet.getDataRange().getValues();
      for (let i = 1; i < existingData.length; i++) {
        if (String(existingData[i][2]) === code) {
          sheet.getRange(i + 1, 10).setValue(newStatus);
          return jsonResponse({ success: true, message: 'Estado actualizado a ' + newStatus });
        }
      }
      return jsonResponse({ success: false, error: 'Código de operación no encontrado' });
    }

    // Si la acción es actualizar el método
    if (payload.action === 'updateMethod') {
      const code = String(payload.code);
      const newMethod = payload.method || 'Yape';
      const existingData = sheet.getDataRange().getValues();
      for (let i = 1; i < existingData.length; i++) {
        if (String(existingData[i][2]) === code) {
          sheet.getRange(i + 1, 4).setValue(newMethod);
          return jsonResponse({ success: true, message: 'Método actualizado a ' + newMethod });
        }
      }
      return jsonResponse({ success: false, error: 'Código de operación no encontrado' });
    }

    // Verificar duplicado
    const existingData = sheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      if (String(existingData[i][2]) === String(payload.code)) {
        return jsonResponse({
          success: false,
          error: 'Código de operación duplicado',
          isDuplicate: true
        });
      }
    }

    // Generar ID secuencial
    const newId = existingData.length;

    // Formatear fecha
    const now = new Date();
    const fecha = Utilities.formatDate(now, 'America/Lima', 'dd/MM/yyyy HH:mm:ss');

    // Subir la imagen del comprobante a Drive (si vino en el payload)
    let imageUrl = '';
    if (payload.imageBase64) {
      try {
        imageUrl = saveReceiptImage(payload.imageBase64, payload.imageMime, payload.code);
      } catch (imgErr) {
        imageUrl = '';
      }
    }

    // Agregar fila
    sheet.appendRow([
      newId,
      fecha,
      payload.code || '',
      payload.method || 'Yape',
      payload.amount || '',
      payload.clientName || '',
      payload.document || '',
      payload.products || '',
      payload.destination || '',
      'Pendiente',
      imageUrl
    ]);

    return jsonResponse({
      success: true,
      message: 'Pago registrado correctamente',
      id: newId,
      imageUrl: imageUrl
    });

  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

/**
 * Utilidad para devolver respuestas JSON con CORS habilitado.
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Guarda la imagen en Google Drive y retorna la URL pública.
 */
function saveReceiptImage(base64Data, mimeType, code) {
  try {
    const folders = DriveApp.getFoldersByName(RECEIPTS_FOLDER_NAME);
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(RECEIPTS_FOLDER_NAME);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, 'Comprobante_' + code);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getDownloadUrl() || file.getUrl();
  } catch (e) {
    return '';
  }
}
