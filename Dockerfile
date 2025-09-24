# STUFE 1: Bauen der Anwendung
# Wir nutzen ein volles Node.js-Image, um alle Abhängigkeiten zu installieren und die App zu bauen.
FROM node:18-alpine AS build

# Arbeitsverzeichnis im Container erstellen
WORKDIR /app

# Zuerst die package-Dateien kopieren, um den Docker-Cache optimal zu nutzen
COPY ./package.json ./package-lock.json ./

# 'npm ci' ist schneller und sicherer für Builds als 'npm install'
RUN npm ci

# Jetzt den gesamten restlichen Quellcode kopieren
COPY . .

# Den Strapi-Admin bauen
RUN npm run build

# ---

# STUFE 2: Das finale, schlanke Produktions-Image
# Wir starten wieder von einem sauberen, kleinen Image
FROM node:18-alpine

# Arbeitsverzeichnis im Container erstellen
WORKDIR /app

# Wichtige Umgebungsvariable für den Produktivbetrieb setzen
ENV NODE_ENV=production

# Kopiere die gebauten Assets aus der "build"-Stufe
COPY --from=build /app/dist ./dist

# Kopiere die package-Dateien, um die Produktions-Abhängigkeiten zu installieren
COPY --from=build /app/package.json ./package-lock.json ./

# Installiere NUR die Produktions-Abhängigkeiten (ohne devDependencies)
RUN npm ci --omit=dev

# Den Port freigeben, auf dem Strapi läuft (Standard: 1337)
EXPOSE 1337

# Der Befehl, um die Anwendung zu starten
CMD ["npm", "run", "start"]
