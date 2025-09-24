// generate_update_sql.js - v10
// Liest Mapping-Datei, generiert SQL UPDATEs, matcht über rekonstruierten alten URL.

const fs = require('fs');
const path = require('path');

// --- KONFIGURATION / ANPASSEN ---
const MAPPING_FILE_PATH = path.resolve(process.cwd(), 'cloudinary_migration_mapping.json');

// --- ANPASSEN: Überprüfe diese Namen anhand deiner v5 DB-Schema! ---
const UPLOAD_TABLE_NAME = 'files'; // Standard-Tabelle für Uploads in Strapi v5
const URL_COLUMN = 'url'; // Spalte, die den alten URL enthält und den neuen bekommen soll
const PROVIDER_COLUMN = 'provider';
const METADATA_COLUMN = 'provider_metadata';
const UPDATED_AT_COLUMN = 'updated_at';
// Die Spalte 'name' wird jetzt NICHT mehr für die WHERE-Klausel benutzt!
// --- ENDE ANPASSEN ---

// --- ANNAHME ÜBER ALTE URLs ---
// Wir gehen davon aus, dass der alte URL IMMER '/uploads/' + localPath war.
// PASSE DIES AN, falls dein Prefix anders war (z.B. nur '/' oder was anderes)!
const OLD_URL_PREFIX = '/uploads/';
// --- ENDE ANNAHME ---


// Funktion zum Escapen von einfachen Anführungszeichen für SQL-Strings
const escapeSqlString = (str) => str ? str.replace(/'/g, "''") : str;

// Hauptfunktion
const generateSqlUpdates = () => {
    console.log(`-- Generiertes SQL Update Skript für Cloudinary Migration`);
    console.log(`-- Generiert am: ${new Date().toISOString()}`);
    console.log(`-- Zieltabelle: "${UPLOAD_TABLE_NAME}"`);
    console.log(`-- ACHTUNG: BACKUP DER DATENBANK ERSTELLEN VOR AUSFÜHRUNG!`);
    console.log(`-- ACHTUNG: Skript nimmt an, alte URLs sind '${OLD_URL_PREFIX}<Dateiname>' in Spalte '${URL_COLUMN}'. BITTE PRÜFEN!`);
    console.log(`-- ACHTUNG: Spaltennamen '${PROVIDER_COLUMN}', '${METADATA_COLUMN}' prüfen!\n`);

    try {
        if (!fs.existsSync(MAPPING_FILE_PATH)) {
            console.error(`FEHLER: Mapping-Datei nicht gefunden unter: ${MAPPING_FILE_PATH}`);
            process.exit(1);
        }
        const mappingData = JSON.parse(fs.readFileSync(MAPPING_FILE_PATH, 'utf8'));
        const successfulUploads = mappingData.filter(entry => entry.success === true && entry.url && entry.public_id && entry.localPath); // Brauchen localPath

        if (successfulUploads.length === 0) {
            console.log('-- Keine gültigen, erfolgreichen Uploads im Mapping gefunden.');
            process.exit(0);
        }

        successfulUploads.forEach(entry => {
            // Erzeuge den *vermuteten* alten URL basierend auf localPath
            // Ersetze Backslashes (Windows) durch Slashes für den URL-Pfad
            const normalizedLocalPath = entry.localPath.replace(/\\/g, '/');
            const assumedOldUrl = OLD_URL_PREFIX + normalizedLocalPath;

            const newUrl = entry.url;
            const publicId = entry.public_id;
            const resourceType = entry.resource_type || 'image';
            const providerMetadata = JSON.stringify({ public_id: publicId, resource_type: resourceType });

            // SQL-sichere Strings erstellen
            const escapedAssumedOldUrl = escapeSqlString(assumedOldUrl);
            const escapedNewUrl = escapeSqlString(newUrl);
            const escapedProviderMetadata = escapeSqlString(providerMetadata);

            // SQL UPDATE Befehl generieren mit neuer WHERE-Klausel
            // --- ANPASSEN: Überprüfe Tabellen-/Spaltennamen und ::jsonb Cast (für PostgreSQL) ---
            const sql = `
UPDATE "${UPLOAD_TABLE_NAME}"
SET
    "${URL_COLUMN}" = '${escapedNewUrl}',
    "${PROVIDER_COLUMN}" = 'cloudinary',
    "${METADATA_COLUMN}" = '${escapedProviderMetadata}'::jsonb,
    "${UPDATED_AT_COLUMN}" = NOW()
WHERE
    "${URL_COLUMN}" = '${escapedAssumedOldUrl}' AND "${PROVIDER_COLUMN}" != 'cloudinary';`; // --- WHERE Klausel jetzt auf URL ---

            console.log(sql); // Gibt den SQL-Befehl auf der Konsole aus
        });

        console.log(`\n-- SQL für ${successfulUploads.length} Dateien generiert.`);
        console.log(`-- Bitte überprüfen und dann z.B. über den Supabase SQL Editor ausführen.`);
        console.log(`-- Empfehlung: Ausgabe in eine Datei umleiten: node generate_update_sql.js > update_cloudinary_urls.sql`);


    } catch (error) {
        console.error('\nFEHLER beim Generieren des SQL-Skripts:', error);
        process.exit(1);
    }
};

// Skript ausführen
generateSqlUpdates();