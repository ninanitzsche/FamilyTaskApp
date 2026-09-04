# Phase E — Bildschirmzeit-Einlösung (Design)

Kontext: FamilyBoard POC. Belohnungssystem wird perspektivisch durch ein Spiel ersetzt — daher bewusst simpel, keine echte Währungsökonomie.

## Entscheidungen (aus Brainstorming)

- **Ein-Tap „Einlösen"-Button** auf der Profil-Seite (kein Elternbereich, keine Approvals)
- **1 XP = 1 Minute**, Wechselkurs als Konstante
- **XP wird NICHT abgezogen** — XP/Level-Anzeige bleibt unberührt (No-Shame-Prinzip)
- **Doppelzähl-Schutz** über neue Spalte `members.xp_redeemed` (Default 0)
- Balance wächst **additiv** über `screen_time_balance` (existiert bereits)
- Eltern setzen die Zeit im echten Leben um — kein Konsum-Tracking in der App

## Mechanik

Beim Einlösen (Tap):

```
minuten += xp - xp_redeemed
xp_redeemed = xp
screen_time_balance += minuten
```

- Einlösbar = `max(0, xp - xp_redeemed)`
- Button deaktiviert, solange Einlösbar = 0 (Hinweistext „Erst fleißig sein, dann einlösen!")
- Ergebnis nie negativ; Guard gegen Clock-Skew wie bei calculateStreak

## UI (Profil-Seite)

Neue Card „📺 Bildschirmzeit" zwischen Statistik-Grid und Rolle:

- Große Balance-Zahl („X Minuten") + Smiley
- Zeile „Einlösbar: X Min" = `xp - xp_redeemed`
- „Jetzt einlösen"-Button (primary, pulsierend wenn Einlösbar > 0)
- Nach Tap: Bestätigungs-Dialog („X Minuten hinzufügen?") → Ja = Minuten addieren + kurzes Erfolgs-Feedback („✓ Eingelöst!"), Button kurz deaktiviert während Request
- Fehlerfall: try/catch mit kurzer Meldung statt Crash

## Daten

- **Migration** `migrations/004_add_xp_redeemed.sql` (idempotent wie 003):
  `alter table members add column if not exists xp_redeemed integer not null default 0;`
- **Typen:** `MemberRow` in `src/types/supabase.ts` um `xp_redeemed` erweitern (snake_case). `MemberInsert` bleibt unverändert — beim Anlegen ist `xp_redeemed` per DB-Default 0 (Umsetzung: nur MemberRow, kein MemberInsert-Update)
- **Reine Logik:** `calculateScreenTimeRedeem(xp, xpRedeemed, balance)` in `src/lib/gamification.ts` → `{ minutes, newRedeemed, newBalance }`
- **Schreibzugriff:** `updateMember(id, { screen_time_balance, xp_redeemed })` (Helper existiert), danach lokalen `member`-State im authStore aktualisieren

## Testing (TDD)

- `xp=0, xpRedeemed=0` → 0 Minuten, State unverändert
- `xp=35, xpRedeemed=0` → +35 Minuten, xpRedeemed=35
- `xp=35, xpRedeemed=35` (schon eingelöst) → 0 Minuten, State unverändert
- `xp=50, xpRedeemed=35` (neuer XP) → +15 Minuten, xpRedeemed=50
- Balance-Addition sauber aufsummiert

## Out of Scope

- Konsum-/Verbrauchs-Tracking (Eltern regeln real)
- Konfigurierbare Kurse / Rewards-Table
- Elternbereich (bleibt verneint)
- Spiel-Belohnungssystem (folgt viel später)
