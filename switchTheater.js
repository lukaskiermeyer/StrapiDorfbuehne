const axios = require('axios');

// --- KONFIGURATION --- Bitte anpassen! ---
const STRAPI_URL = 'https://strapi-dorfbuehne-95552489079.europe-west4.run.app'; // Deine Strapi URL
const STRAPI_API_TOKEN = '8f1494baa580e0da46f771d9e7959b77ea20e9cd2bb6818d42751272ca47e076235c08be386ac0b0cf21617ee921bff37d9cb13c06ce8bf79f7e87ae1122d7ebdc53ede40d116092e6e1caa1ca03f7787d84f22511ff4cc3c4917cb16b12cfd660222c9dffecfa405b824192b4b1aba845ae549a16eedd74b2a98ceea3de0bf0'; // Dein Strapi API Token
const SOURCE_API_ID = 'theaterstuecke'; // Plural API ID des Quell-ContentTypes (z.B. theaterstuecks)
const TARGET_API_ID = 'jugendtheaterstuecke'; // Plural API ID des Ziel-ContentTypes (z.B. jugendtheaters)
const ENTRY_IDS_TO_MIGRATE = [47, 33, 39, 21, 43, 51, 8]; // IDs der zu migrierenden Einträge
// --- ENDE KONFIGURATION ---

// Axios-Instanz mit Basis-URL und Auth-Header erstellen
const axiosInstance = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
});

// Funktion zum Bereinigen der Daten für die Erstellung
// Strapi erwartet bei der Erstellung oft nur die ID(s) für Relationen
const prepareDataForCreate = (attributes) => {
    const newData = { ...attributes };

    // Gehe durch alle Felder im Attribut-Objekt
    for (const key in newData) {
        const value = newData[key];

        // Prüfe, ob es sich um ein Relationsobjekt handelt (oft hat es ein 'data'-Feld)
        if (value && typeof value === 'object' && 'data' in value) {
            const relationData = value.data;

            // Einzelrelation: { data: { id: 5, attributes: {...} } } -> 5
            if (relationData && typeof relationData === 'object' && !Array.isArray(relationData) && 'id' in relationData) {
                newData[key] = relationData.id;
            }
            // Mehrfachrelation: { data: [ { id: 5 }, { id: 8 } ] } -> [5, 8]
            else if (relationData && Array.isArray(relationData)) {
                newData[key] = relationData.map(item => item.id).filter(id => id != null); // Nur IDs extrahieren
            }
            // Fall: Leere Relation { data: null } -> null (oder undefiniert lassen)
            else if (relationData === null) {
                newData[key] = null; // oder delete newData[key];
            }
        }
        // Hier könnten weitere Bereinigungen für Komponenten etc. nötig sein
    }
    // Wichtige Metadaten entfernen, die nicht mitgesendet werden sollen
    delete newData.createdAt;
    delete newData.updatedAt;
    delete newData.publishedAt; // Falls vorhanden

    return newData;
};


// Hauptfunktion für die Migration
async function migrateEntries() {
    console.log(`Starte Migration von ${ENTRY_IDS_TO_MIGRATE.length} Einträgen von '${SOURCE_API_ID}' nach '${TARGET_API_ID}'...`);

    for (const id of ENTRY_IDS_TO_MIGRATE) {
        console.log(`\n--- Bearbeite Eintrag mit ID ${id} ---`);
        try {
            // 1. Alten Eintrag abrufen (mit allen Relationen, inkl. Medien)
            console.log(`[ID: ${id}] Lese Daten von ${SOURCE_API_ID}/${id}...`);
            const response = await axiosInstance.get(`/${SOURCE_API_ID}/${id}?populate=*`);

            if (!response.data || !response.data.data) {
                console.error(`[ID: ${id}] Fehler: Konnte Daten nicht lesen oder ungültiges Format.`);
                continue; // Nächsten Eintrag versuchen
            }

            const entryAttributes = response.data.data.attributes;
            console.log(`[ID: ${id}] Daten erfolgreich gelesen.`);
            // console.log("Gelesene Attribute:", JSON.stringify(entryAttributes, null, 2)); // Zum Debuggen

            // 2. Daten für den neuen Eintrag vorbereiten
            const newData = prepareDataForCreate(entryAttributes);
            console.log(`[ID: ${id}] Daten für Erstellung vorbereitet.`);
            // console.log("Vorbereitete Daten:", JSON.stringify({ data: newData }, null, 2)); // Zum Debuggen

            // 3. Neuen Eintrag im Ziel-Content-Type erstellen
            console.log(`[ID: ${id}] Erstelle neuen Eintrag in ${TARGET_API_ID}...`);
            const createResponse = await axiosInstance.post(`/${TARGET_API_ID}`, {
                data: newData,
            });

            if (createResponse.status === 200 || createResponse.status === 201) {
                const newEntryId = createResponse.data?.data?.id;
                console.log(`[ID: ${id}] Erfolgreich neuen Eintrag mit ID ${newEntryId} in ${TARGET_API_ID} erstellt.`);

                // 4. (Optional aber empfohlen) Alten Eintrag löschen
                try {
                    console.log(`[ID: ${id}] Lösche alten Eintrag aus ${SOURCE_API_ID}...`);
                    await axiosInstance.delete(`/${SOURCE_API_ID}/${id}`);
                    console.log(`[ID: ${id}] Alter Eintrag erfolgreich gelöscht.`);
                } catch (deleteError) {
                    console.error(`[ID: ${id}] FEHLER beim Löschen des alten Eintrags:`, deleteError.response?.data || deleteError.message);
                    console.error(`[ID: ${id}] ACHTUNG: Der neue Eintrag wurde erstellt, aber der alte konnte nicht gelöscht werden! Manuell prüfen.`);
                }

            } else {
                console.error(`[ID: ${id}] FEHLER beim Erstellen des neuen Eintrags. Status: ${createResponse.status}`, createResponse.data);
            }

        } catch (error) {
            if (error.response) {
                // Fehler von der Strapi API
                console.error(`[ID: ${id}] FEHLER bei API-Anfrage: Status ${error.response.status}`, error.response.data?.error || error.response.data);
            } else if (error.request) {
                // Anfrage wurde gesendet, aber keine Antwort erhalten
                console.error(`[ID: ${id}] FEHLER: Keine Antwort von Strapi erhalten. Läuft der Server unter ${STRAPI_URL}?`);
            } else {
                // Anderer Fehler (z.B. im Skript selbst)
                console.error(`[ID: ${id}] Allgemeiner FEHLER:`, error.message);
            }
            console.error(`[ID: ${id}] Migration für diesen Eintrag fehlgeschlagen.`);
        }
    }

    console.log('\n--- Migration abgeschlossen ---');
}

// --- WICHTIGER SICHERHEITSHINWEIS ---
// **ERSTELLE EIN BACKUP DEINER DATENBANK UND MEDIEN, BEVOR DU DIESES SKRIPT AUSFÜHRST!**
// Teste das Skript idealerweise zuerst auf einer Staging-Umgebung oder mit nur EINER ID.
// -----------------------------------

// Skript starten
migrateEntries();