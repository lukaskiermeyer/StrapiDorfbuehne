#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Erstelle Swap-File für mehr Speicher beim Build..."

# Prüfen, ob wir Root-Rechte haben (auf Render meist ja), sonst Swap überspringen
if [ $(id -u) -eq 0 ]; then
  # 1. 2GB Swap-Datei anlegen
  fallocate -l 2G /swapfile
  # 2. Rechte setzen
  chmod 600 /swapfile
  # 3. Als Swap formatieren
  mkswap /swapfile
  # 4. Swap aktivieren
  swapon /swapfile
  echo "Swap erfolgreich aktiviert! (RAM + 2GB Disk)"
else
  echo "Keine Root-Rechte, überspringe Swap."
fi

# Abhängigkeiten installieren
npm install

# Build ausführen
npm run build