// cloudinary_migration.js (Korrigierte Version mit dynamischem Import)
require('dotenv').config(); // Lädt Variablen aus der .env Datei
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

// p-limit wird jetzt dynamisch importiert!

// --- KONFIGURATION (BITTE ANPASSEN!) ---
const LOCAL_UPLOADS_PATH = path.join(__dirname, 'public', 'uploads'); // <-- Passe dies an deinen lokalen Ordner an! Z.B. 'public/uploads'
const CLOUDINARY_BASE_FOLDER = 'strapi-uploads'; // Optional: Ein Ordner in Cloudinary, in den alles hochgeladen wird. Leer lassen für Root.
const CONCURRENT_UPLOADS = 5; // Anzahl gleichzeitiger Uploads (vorsichtig erhöhen, um Rate Limits zu vermeiden)
const MAPPING_FILE = path.join(__dirname, 'cloudinary_migration_mapping.json'); // Datei zum Speichern der Ergebnisse

// --- ENDE KONFIGURATION ---

// Cloudinary SDK konfigurieren (holt Werte aus .env)
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Fehler: Cloudinary Zugangsdaten nicht in .env gefunden!');
  process.exit(1);
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Die Hauptlogik kommt jetzt in eine async Funktion, um await für den Import nutzen zu können
async function main() {
  // Dynamischer Import von p-limit
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(CONCURRENT_UPLOADS); // Initialisiere p-limit hier

  // Funktion zum Hochladen einer einzelnen Datei (jetzt innerhalb von main)
  async function uploadFile(filePath) {
    const relativePath = path.relative(LOCAL_UPLOADS_PATH, filePath);
    const cleanedRelativePath = relativePath.replace(/\\/g, '/');
    const pathWithoutExt = cleanedRelativePath.substring(0, cleanedRelativePath.lastIndexOf('.')) || cleanedRelativePath;
   // Korrekte Zeile (ca. Zeile 31 im Skript von vorhin):
	const publicId = CLOUDINARY_BASE_FOLDER ? `${CLOUDINARY_BASE_FOLDER}/${pathWithoutExt}` : pathWithoutExt;
    console.log(`[${new Date().toLocaleTimeString()}] Starte Upload für: ${cleanedRelativePath} -> Public ID: ${publicId}`);

    try {
      const result = await limit(() => cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        resource_type: 'auto',
        overwrite: false,
        invalidate: true,
      }));

      console.log(`[${new Date().toLocaleTimeString()}] Erfolgreich: ${cleanedRelativePath} -> ${result.secure_url}`);
      return {
        localPath: relativePath,
        success: true,
        public_id: result.public_id,
        url: result.secure_url,
        resource_type: result.resource_type,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString()}] FEHLER bei ${cleanedRelativePath}: ${error.message || error}`);
      return {
        localPath: relativePath,
        success: false,
        error: error.message || error,
      };
    }
  }

  // Rest der Migrationslogik (jetzt auch innerhalb von main)
  console.log(`Suche nach Dateien in: ${LOCAL_UPLOADS_PATH}`);
  const files = await fg('**/*.*', { cwd: LOCAL_UPLOADS_PATH, absolute: true, onlyFiles: true });

  if (files.length === 0) {
    console.log('Keine Dateien zum Hochladen gefunden.');
    return;
  }
  console.log(`Gefunden: ${files.length} Dateien. Starte Uploads mit ${CONCURRENT_UPLOADS} parallelen Anfragen...`);

  const uploadPromises = files.map(file => uploadFile(file)); // Übergib limit nicht mehr direkt, es ist im Scope von main verfügbar

  const results = await Promise.all(uploadPromises);

  console.log('\n--- Upload Zusammenfassung ---');
  const successes = results.filter(r => r.success);
  const errors = results.filter(r => !r.success);

  console.log(`Erfolgreich hochgeladen: ${successes.length}`);
  console.log(`Fehler: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Fehlerhafte Dateien:');
    errors.forEach(e => console.log(`  - ${e.localPath}: ${e.error}`));
  }

  console.log(`\nSpeichere Mapping-Datei nach: ${MAPPING_FILE}`);
  try {
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(results, null, 2));
    console.log('Mapping-Datei erfolgreich gespeichert.');
  } catch (writeError) {
    console.error(`FEHLER beim Schreiben der Mapping-Datei: ${writeError.message}`);
  }

  console.log('\nMigration abgeschlossen.');
}

// Rufe die Hauptfunktion auf und fange Fehler ab
main().catch(err => {
  console.error('\nUnerwarteter Fehler im Hauptprozess:', err);
  process.exit(1);
});