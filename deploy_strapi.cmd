@echo off
:: Dieses Skript baut das Strapi Docker Image mit einem eindeutigen Zeitstempel-Tag,
:: führt optional eine lokale Überprüfung durch, pusht es zu Artifact Registry
:: und deployed es auf Cloud Run.
:: Das Fenster bleibt am Ende offen.
:: Aktuelle Zeit: Sonntag, 13. April 2025, ca. 18:17 Uhr CEST (Neustadt an der Donau)

:: --- KONFIGURATION ---
:: Bitte trage hier deine Werte ein!
set REGISTRY_HOST=europe-west3-docker.pkg.dev
set PROJECT_ID=strapi-website-454221
set REPO_NAME=strapi-repo
set BASE_IMAGE_NAME=strapidorfbuehne
set SERVICE_NAME=dorf-strapi-service
set REGION=europe-west3
set PORT=1337
:: --- ENDE KONFIGURATION ---

:: Eindeutigen Tag basierend auf Datum und Uhrzeit erstellen (YYYYMMDD-HHMMSS)
echo Generiere eindeutigen Tag...
set MYDATE=%date:~6,4%%date:~3,2%%date:~0,2%
set MYTIME=%time:~0,2%%time:~3,2%%time:~6,2%
set TAG=%MYDATE%-%MYTIME%
REM Leerzeichen bei Stunden < 10 entfernen (ersetzt durch 0)
set TAG=%TAG: =0%
echo Verwende Tag: %TAG%
echo.

:: Vollständigen Image-Namen zusammensetzen
set FULL_IMAGE_NAME=%REGISTRY_HOST%/%PROJECT_ID%/%REPO_NAME%/%BASE_IMAGE_NAME%:%TAG%
echo Vollständiger Image-Name: %FULL_IMAGE_NAME%
echo.

:: --- SCHRITT 1: Docker Build ---
echo Starte Docker Build...
REM Fuege hier bei Bedarf "--no-cache" hinzu: docker build --no-cache -t ...
docker build --no-cache -t "%FULL_IMAGE_NAME%" .
IF %ERRORLEVEL% NEQ 0 (
    echo FEHLER: Docker Build fehlgeschlagen!
    pause
    goto :eof
)
echo Docker Build erfolgreich.
echo.

:: --- SCHRITT 2: Docker Image lokal überprüfen (Optional, aber empfohlen) ---
echo Überprüfe das lokale Image (CMD sollte [npm, run, start] sein)...
docker inspect "%FULL_IMAGE_NAME%" | findstr /C:"\"Cmd\": \[" /C:"npm" /C:"run" /C:"start"
echo Überprüfe die Ausgabe oben manuell auf Korrektheit.
pause
echo.

:: --- SCHRITT 3: Docker Push ---
echo Starte Docker Push...
docker push "%FULL_IMAGE_NAME%"
IF %ERRORLEVEL% NEQ 0 (
    echo FEHLER: Docker Push fehlgeschlagen! Möglicherweise nicht authentifiziert? (gcloud auth configure-docker)
    pause
    goto :eof
)
echo Docker Push erfolgreich.
echo.

:: --- SCHRITT 4: Google Cloud Run Deployment ---
echo Starte Deployment auf Cloud Run...
gcloud run deploy %SERVICE_NAME% --image "%FULL_IMAGE_NAME%" --region %REGION% --port %PORT% --platform managed --allow-unauthenticated
REM Passe Flags bei Bedarf an (z.B. --allow-unauthenticated entfernen, --memory, --cpu setzen)
IF %ERRORLEVEL% NEQ 0 (
    echo FEHLER: gcloud run deploy fehlgeschlagen! Überprüfe die Fehlermeldung oben.
) ELSE (
    echo Cloud Run Deployment erfolgreich angestoßen oder aktualisiert.
)
echo.

:eof
echo Skript beendet.
echo Druecke eine beliebige Taste zum Schliessen des Fensters...
pause