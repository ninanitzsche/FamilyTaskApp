# check8-8 — Audit-Backlog FamilyBoard (2026-08-08)

> Ergebnis-Audit: alle superpowers Plans/Specs geprüft, Gesamt-Codequalitäts-Review
> Ausführung: Agents + manuelle Verifikation, danach erneuter Voll-Lauf inkl. Abhaken.

## Basis-Verifikation (erster Lauf, vor Fixes)
- [x] `npm test` — 72/72 grün
- [x] `npx tsc --noEmit` — sauber
- [x] `npm run lint` — 0 Warnungen/Fehler
- [x] `npm run build` — Build ok (nur >500kB Chunk-Warnung)

## A. Plans — Abgleich
- [x] **P1** `2026-07-16-phase0-foundation` — implementiert; Abweichung Firebase→Supabase dokumentiert (kein Fix-Item)
- [x] **P2** `2026-07-17-phase-c-tech-debt` — implementiert; Abweichung CameraCapture-Upload-Verortung dokumentiert (Absicht erreicht)
- [x] **P3** `2026-08-04-phase-e-screen-time-redeem` — implementiert (Spec sagt MemberRow+MemberInsert; Umsetzung nur MemberRow → Spec-Sync)
- [x] **P4** `2026-08-08-sessions-list-detail` — alle 5 Tasks implementiert + getestet

## B. Specs — Abgleich
- [x] **S1** `2026-07-16-familyboard-design` — umgesetzt (Backend-Abweichung s. P1)
- [x] **S2** `2026-07-17-ux-adhs-update-design` — umgesetzt; GAPs → Fixes im Backlog: Resume verliert Fortschritt (FIX-A erledigt), Stale-Closure-Test no-op (I4), 44px-Targets (M1)
- [x] **S3** `2026-08-04-screen-time-redeem-design` — umgesetzt; GAP → Spec-Sync Member-Spalte (I10)
- [x] **S4** `2026-08-08-sessions-list-detail-design` — umgesetzt; GAPs → aria-label auf Sektion + SessionDetail h1 „Session vom …" (M-Item)

## C. Codequalität — Befunde (aus Gesamt-Review)
### Critical (Bugs/Security)
- [x] **C1** RLS: `with check (true)` auf INSERT aller Tabellen → Familie nicht erzwungen
      (Fix: `migrations/007_rls_policy_hardening.sql`, commit `7f9fa37`)
- [x] **C2** RLS: members UPDATE family-weit → self-scoped (Fix in `007_rls_policy_hardening.sql`)
- [x] **C3** Wochenstart-Bug Sonntag + UTC → `getMondayOf`/`weekKey` (lokal) an allen 4 Stellen,
      Tests `week-key.test.ts` (commit `f313ab5`)
- [x] **C4** Free-Session `duration === 0` → floor(1) in `SessionFree` (commit `a842c7c`)

### Important
- [x] **I1** Overtime-XP Promo ≠ Award → konsistent (`overtimeMinutes*5`, commit `a842c77`)
- [x] **I2** localStorage-Write jede Sekunde → Throttle 10s für reine elapsed-Saves (commit `a842c77`)
- [x] **I3** `activeSession`-Key nicht user-gescoped → `activeSession:<memberId>` (commit `a842c77`)
- [x] **I4** „BUG"-Tests no-op → echte Regressions-Tests (`streak-current.test.ts`, `bugs.test.ts`,
      `session-logic.test.ts`; Stale-Closure als dokumentierter Test, jsdom nötig) (commit `f690c…`)
- [x] **I5** Wöchentliche Rewards-Limits pro Member (`getRewardRedemptionsThisWeek(memberId)`) (commit `a842c77`)
- [x] **I6** CameraCapture-Stream → via `streamRef.current` sauber gestoppt (bereits gefixt, verifiziert)
- [x] **I7** Tote Dateien entfernt: `CreateFamily.tsx`, `formatTime`, `deletePhoto` (commit `6ca6ee0`)
- [x] **I8** UNIQUE(family_id, week_start) → in `007_rls_policy_hardening.sql` (commit `7f9fa37`)
- [x] **I9** „✓ Fotos gespeichert" nur bei erfolgreichem DB-Update (`beforeSaved/afterSaved`) (commit `a842c77`)
- [x] **I10** Doc-Drift: Spec S3 auf „nur MemberRow" korrigiert

### Minor
- [x] **M2** Modals: `role="dialog" aria-modal` auf allen Overlays (Session*/Result, Camera, Backlog, Profile, Rewards)
- [x] **M3** `lang="de"` (`index.html`)
- [x] **M4** Level-Config dedupliziert → `LEVEL_THRESHOLDS` exportiert aus `gamification.ts`
- [x] **M5** Level-Anzeige `?? 1` (maskiert nur null/undefined, nicht DB-0) (Dashboard/Achievements/Profile)
- [x] **M7** SessionResult 30s-Timer-Reset bei Re-Fokus (visibilitychange)
- [x] **M8** Code-Splitting via `react.lazy` für alle Login-Screens → 32 Precache-Entries statt 8
- [x] **M1-rest** Touch <44px & fehlende aria-labels an Einzel-Clustern (Setup-Farbwaagen, Kamera-close, py-2.5-Buttons) — Commit `635205b` (alle py-2.5-Buttons `min-h-[44px]`, Farbwaagen `h-11 w-11` + `aria-label` + `aria-pressed`, Kamera-close `aria-label`)
- [x] **M6** daisyUI-Dependency → wird als Tailwind-Plugin in `src/index.css` genutzt (kein Defekt)

---

## Erledigte Fixes (während Audit)
- [x] **FIX-A** Resume-Bug: Fortschritt (completedTaskIds,elapsed,beforePhoto) ging beim
  „Weitermachen" verloren → `Dashboard.tsx:83`, `SessionActive/SessionFree` lesen
  Initial-Snapshot. Commit `5fc3ee6`.

## Erledigte Arbeit (dieser Durchlauf)
1. [x] C1/C2/C8 → Migration `007_rls_policy_hardening.sql` (RLS self-family, members UPDATE
   auth=self, UNIQUE week_start); `supabase-schema.sql` synchronisiert. Commit `7f9fa37`.
   **Hinweis: SQL liegt bereit — Supabase-Exec beim User.**
2. [x] C3: `getMondayOf`/`weekKey` (lokal, Sonntag-korrekt) an 4 Stellen + 6 Tests. Commit `f313ab5`.
3. [x] C4: `SessionFree` `duration = Math.max(1, elapsed)`. Commit `a842c7c`.
4. [x] I1: Promo/Award konsistent. Commit `a842c77`.
5. [x] I2/I3: `saveSessionState` throttle (10s) + user-keyed Storage. Commit `a842c7c`.
6. [x] I5: Rewards-Limits pro Member. Commit `a842c7c`. I9: Save-Indikator nur bei DB-Erfolg.
7. [x] I4: no-op-Bug-Tests → echte Regressions-Tests. Commit `f690c…`.
8. [x] I7: tote Dateien entfernt. Commit `6ca6ee0`. I6 verifiziert (streamRef).
9. [x] I10: Spec-S3-Sync. M2–M5, M7, M8. Commits `…`.
10. [x] Final-Verifikation: `npm test` 82/82 grün, `tsc --noEmit` sauber, `npm run lint` 0,
    `npm run build` ok (32 Precache-Entries).