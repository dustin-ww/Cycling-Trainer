# Cycling Coach

Mobile-first Trainings-App (PWA) mit einem KI-Coach im Mittelpunkt: Er wertet Trainingsdaten aus, plant auf Basis deiner Ziele, reagiert spontan auf Änderungen (Krankheit, Zeitmangel, Müdigkeit), schlägt Ausgleichssport vor – und begründet jede Entscheidung nachvollziehbar.

## Setup (Devcontainer)

```bash
cp .env.example .env.local      # ANTHROPIC_API_KEY eintragen
npm install
npm run db:migrate              # Tabellen anlegen
npm run dev
```

Auf dem Handy: `http://<rechner-ip>:3000` öffnen → „Zum Home-Bildschirm hinzufügen“.

## Struktur

```
app/
  page.tsx              Coach (Startseite): Form heute, heutige Einheit, Check-in, Chat
  plan/                 Trainingsplan mit „Warum diese Einheit?“ je Einheit
  activities/           Fitness-Chart (CTL/ATL/TSB), FIT-Import, manuelle Einträge
  goals/                Ziele (A/B/C-Priorität) und Athletenprofil
  api/coach/route.ts    Streaming-Endpoint des Coaches (NDJSON)
  manifest.ts           PWA-Manifest
components/             UI, nach Feature gruppiert
lib/
  coach/
    agent.ts            Agent-Loop (Claude Tool Runner, Streaming, Verlauf speichern)
    tools.ts            Tools: Daten lesen, Einheiten planen/ändern, Befinden notieren
    prompt.ts           System-Prompt inkl. Erklärbarkeits-Regeln
    display.ts          API-Verlauf → Chat-Ansicht
  training/             Reine Funktionen: NP, IF, TSS, Zonen, Power Curve, CTL/ATL/TSB (+ Tests)
  fit/parse.ts          FIT-Datei → Aktivität mit berechneten Kennzahlen
  data/queries.ts       Lesende DB-Zugriffe
  actions.ts            Server Actions (Formulare)
  db/schema.ts          Drizzle-Schema (Postgres)
drizzle/                SQL-Migrationen
```

## Erklärbarkeit

- Jede geplante Einheit speichert eine strukturierte `rationale`: Zusammenfassung, verwendete Datenpunkte mit Wirkung (↑/↓), Trainingsprinzip, Sicherheit der Empfehlung, Alternative.
- Änderungen durch den Coach landen mit Grund im `changeLog` der Einheit.
- Im Chat wird angezeigt, welche Daten der Coach geprüft hat (Tool-Aufrufe).
- Bei jeder Aktivität ist sichtbar, wie der TSS berechnet wurde (Leistung, Herzfrequenz oder RPE-Schätzung).

## Scripts

`npm run test` · `npm run typecheck` · `npm run lint` · `npm run db:generate` (nach Schema-Änderungen) · `npm run db:studio`
