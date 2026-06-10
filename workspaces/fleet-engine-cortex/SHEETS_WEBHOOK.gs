// SHEETS_WEBHOOK.gs
// Paste this into Apps Script on your Google Sheet.
// Extensions → Apps Script → paste → Deploy as Web App
//
// Deploy settings:
//   Execute as: Me
//   Who has access: Anyone
//
// Copy the Web App URL → paste into .env as SHEETS_WEBHOOK_URL

function doPost(e) {
  try {
    var data    = JSON.parse(e.postData.contents);
    var sheet   = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var headers = data.headers;
    var rows    = data.rows;

    // Write headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    // Append each lead as a row
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      sheet.appendRow([
        r.company, r.url, r.contact_name, r.contact_title, r.email,
        r.friction, r.funding, r.intent, r.bite, r.date
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, rows: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
