# FamilyBoard — Design Spec

ADHS-gerechtes Familien-Kanban als Progressive Web App.
Gamification-First, bildgesteuert, Session-basiert.

## Tech-Stack
React 19 + TypeScript + Vite + Tailwind + daisyUI + Zustand + Firebase (Auth + Firestore) + PWA

## Datenmodell
Family → Members[] → Tasks[] → Sessions[] → WeeklyMission → Rewards[]

## Screens
1. **Dashboard** — Encouragement-first: streaks, greetings, "LOS GEHT'S" button
2. **Session** — Choose 1-3 tasks → 5-min timer with music → Result with XP
3. **Backlog** — Image-based task cards, add via voice/text
4. **Achievements** — Levels, streaks, badges
5. **Parents Area** — Task management, rewards config, family overview

## Gamification
- XP: 10 per task, +5 for full session, +50 for weekly mission
- Levels: Ei → Mini-Ninja → Lehrling → Profi → Held → Legende
- Streaks: Daily sessions, no shame on break
- Screen time rewards: XP → minutes (parent-configured)

## Design Principles
1. Ermutigung first
2. Bildgesteuert (Kinder können nicht lesen)
3. Minimale Reibung
4. Session > Liste
5. Kein Shame
6. Spielerisch
7. Offline-fähig
