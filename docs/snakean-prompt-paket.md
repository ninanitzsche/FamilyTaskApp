# SnaKean – KI-Prompt-Paket für das Schlangen-Tamagotchi

Erstellt am 09.08.2026. Ziel: eine süße, stylisierte Schlangen-Figur als Haustier-Ersatz für den Sohn, erzeugt mit Midjourney v6 oder DALL·E 3.

**Wichtigste Grundregel:** Für die spätere Animation wollen wir **einfache, klare Formen** und **eine konsistente Farbpalette** – das ist in alle Prompts eingebaut. Flache/vector-Styles (Prompt 1B) sind leichter zu animieren als 3D-Render.

---

## 1. Der Hauptcharakter (das Wichtigste)

**Prompt 1A – Basis (Cute/Pixar-Stil):**
> Cute stylized green snake character, round friendly face, huge adorable eyes with sparkling highlights, tiny smile, soft rounded body, coiled in a relaxed donut shape with head resting upright on top, Pixar-style 3D render, smooth clean shapes, soft rim lighting, gentle green color palette with lighter belly, glossy scales, children's app mascot design, white background, high quality, 3D cartoon style --ar 1:1 --v 6

**Prompt 1B – Alternativ (Flat/Cartoon, leichter zu animieren):**
> Adorable cartoon snake mascot for kids app, flat vector style, thick outlines, big round eyes, cute smile, green body with lighter belly and scale pattern, coiled position with upright head, simple clean shapes, no text, solid white background, vector illustration, Disney Pixar mascot style, vibrant colors --ar 1:1

**Prompt 1C – Niedlich-kuschelig (Variante):**
> Super cute baby snake pet character, chubby round body, enormous sparkly eyes, rosy cheeks, expressive face, cute smile with little tongue sticking out, pastel green and yellow colors, soft shading, kawaii style, children's pet app mascot, clean composition, isolated on white background --ar 1:1

---

## 2. Gefühlszustände (für die App)

> *Füge vor jedem Prompt den Basis-Beschreibungsteil aus 1A ein, dann:*

- **Glücklich/aktiv:** `..., happy excited expression, eyes closed in joy, cheerful pose, small hearts floating, ...`
- **Müde/schläfrig:** `..., sleepy expression, droopy half-closed eyelids, yawning, cozy sleepy pose, zzz, ...`
- **Fressen:** `..., happily eating a small cartoon mouse, cheeks puffed, joyful squinting eyes, ...`
- **Gestreckt/überrascht:** `..., surprised wide eyes, open mouth, playful alert pose, ...`

---

## 3. Charakter-Sheet (für die Animation)

> Character design sheet of a cute green snake mascot, multiple views: front view, side view, back view, coiled view, close-up of head, consistent design across all views, same color palette, same proportions, clean vector style, white background, character concept art --ar 16:9

---

## 4. Umgebung (das Terrarium)

> Cute children's terrarium interior, cartoon style, green forest floor with moss and pebbles, small wooden log, water dish, plants with big leaves, warm cozy lighting, soft colors, children's app game background, no characters, no text --ar 16:9

---

## 5. Wachstum & Entwicklung (ein Charakter, der erwachsen wird)

**IDENTITÄTS-KERN** (immer gleich bleiben, in jedem Phasen-Prompt verwenden):
> Cute green snake character, soft emerald-green body with lighter belly, distinctive yellow-green scale pattern, warm amber eyes, Pixar-style 3D render, children's app mascot, clean shapes, white background --ar 1:1

**Phase 1 – Baby-Knuddelwurm (Level 1–2):**
> **[Kern]** + `, BABY version: very short and stubby round body, huge sparkly innocent eyes, chubby cheeks, tiny smile, playful curious expression, soft and squishy look, slightly oversized head compared to body`

**Phase 2 – Jungtier (Level 3–4):**
> **[Kern]** + `, YOUNG version: medium length slender body, bright curious eyes, confident smile, a few more defined scales, energetic adventurous pose, body one and a half times longer than baby version`

**Phase 3 – König der Schlangen (Level 5–6):**
> **[Kern]** + `, ADULT version: long majestic body, elegant powerful posture, regal confident expression, intense eyes, more dramatic and elaborate scale pattern, subtle glowing accents, imposing but not scary, cool and impressive presence`

**Entwicklungs-Sheet (3 Phasen nebeneinander – ideal zum Prüfen der Konsistenz):**
> Character evolution sheet showing the same green snake character in three stages: baby cute short snake, teenager medium snake, adult long majestic snake, side by side, consistent colors and design, evolution concept art, white background --ar 16:9

---

## 6. Körper-Teil (für das Wachstum als Baukasten)

> Seamless repeating snake body texture pattern, cute cartoon style, green scales with lighter belly, smooth rounded scales, consistent with a cute children's app mascot, top-down straight horizontal strip, pattern seamlessly tiles horizontally, clean vector style, no head, no tail, only the body segment, white background --ar 16:5

> *Alternative:* Basis-Charakter aus Batch 1 nutzen und im Generator fragen: „Erzeuge nur die Körper-Mitte als nahtloses Muster passend zum Kopf".

---

## 7. Das Ei (Erststart-Schlüpfen)

**Stil-Kern für alle weiteren Bilder** (Ei, Terrarium, Deko, Emotionen) – immer einbauen, damit alles zum Charakter passt:
> Stil-Kern: `cute stylized children's app game asset, soft rounded shapes, Pixar-style 3D render, soft pastel green and warm colors, gentle lighting, clean composition, consistent with a cute green snake mascot`

**Ei (geschlossen, niedlich):**
> A cute smooth round snake egg with soft green speckles, slightly glossy, standing upright, tiny crack hinting something is about to hatch, `[Stil-Kern]`, isolated on pure white background, centered, no text --ar 1:1

**Ei (leicht angeknackst / dabei zu schlüpfen) – optional für die Animation:**
> A cute smooth round snake egg with soft green speckles, a small baby snake head peeking out of a crack at the top, big sparkling eyes, tiny smile, `[Stil-Kern]`, isolated on pure white background, centered, no text --ar 1:1

---

## 8. Das leere Terrarium (Hintergrund)

> An empty children's terrarium interior seen from the front, glass terrarium box, dark green forest floor with moss and pebbles at the bottom, warm cozy lighting, soft gradient background wall, large EMPTY open space in the middle, no animals, no characters, no objects in the center, `[Stil-Kern]`, children's app game background, no text --ar 4:5

*Wichtig: „leer in der Mitte" einbauen, damit die Schlange zentriert hineingesetzt werden kann. Der Hintergrund wird hinter die Schlange gelegt.*

---

## 9. Deko-Items für den Kröten-Shop (als Einzel-Bilder, kein Emoji!)

Die Gegenstände werden einzeln gekauft und ins Terrarium gestellt. Jeder Prompt nutzt **denselben Stil-Kern** + `isolated on pure white background, single item centered, no text, no scene`. Für die App wichtig: **von vorne gesehen, nicht perspektivisch verzerrt**, keine anderen Gegenstände im Bild.

- **Höhle (Versteck):**
  > A cute hollow rock cave hideout for a small snake, smooth rounded stone, green moss on top, warm and inviting dark opening, `[Stil-Kern]`, isolated on pure white background, single item centered, front view, no text --ar 1:1

- **Pflanze:**
  > A cute potted tropical plant with big round glossy leaves, terracotta pot, `[Stil-Kern]`, isolated on pure white background, single item centered, front view, no text --ar 1:1

- **Diskokugel:**
  > A shiny silver disco ball hanging from a small hook, reflecting colorful light, fun party look, `[Stil-Kern]`, isolated on pure white background, single item centered, front view, no text --ar 1:1

- **Baumstamm:**
  > A cute smooth wooden log branch for a snake to climb, rounded friendly shape, light wood color, `[Stil-Kern]`, isolated on pure white background, single item centered, front view, no text --ar 1:1

- **Wasserbecken (Badeschale):**
  > A cute small shallow water bowl for a snake to soak in, rounded ceramic bowl with light blue water, `[Stil-Kern]`, isolated on pure white background, single item centered, front view, no text --ar 1:1

- **Stein / Kletterfelsen:**
  > A cute smooth stacked climbing rocks formation, rounded friendly stones, small green moss patches, `[Stil-Kern]`, isolated on pure white background, single item centered, front view, no text --ar 1:1

> **Tipp zum Tokens-Sparen:** Alle 6 Deko-Items in einem Sheet generieren und einzeln zuschneiden:
> `A set of 6 cute terrarium decoration items for a children's game, each isolated and spaced apart: a rock cave, a potted plant, a disco ball, a wooden log, a water bowl, a stack of climbing rocks, all in the same cute style, grid layout, pure white background, no text --ar 16:9`
> (Einzel-Bilder wirken aber hochwertiger und lassen sich sauberer platzieren.)

---

## 10. Gefühlszustände (als KI-Bilder, pro Phase)

Jeder Zustand = **Identitäts-Kern der jeweiligen Phase + Emotions-Baustein** (gleicher Seed, nur Zustand ändern → konsistenter Charakter). Starte mit der Phase, die euch am besten gefällt (vermutlich Baby), dann für die anderen Phasen wiederholen.

**Emotions-Bausteine (an Phase anhängen):**
- **Glücklich:** `..., happy joyful expression, eyes closed in happiness, big warm smile, tiny sparkles and hearts floating around, energetic cheerful pose`
- **Müde/schläfrig:** `..., sleepy expression, droopy half-closed eyelids, soft yawn, relaxed sleepy pose, small zzz symbols floating, cozy and calm`
- **Fressen/glücklich beim Essen:** `..., happily eating a small cartoon mouse, cheeks puffed, joyful squinting eyes, playful`
- **Stolz/aufrecht (gilt v.a. für König):** `..., proud regal confident expression, raised head, elegant powerful posture`

**Volles Beispiel – Baby, glücklich:**
> `[Identitäts-Kern BABY]` + `, happy joyful expression, eyes closed in happiness, big warm smile, tiny sparkles and hearts floating around, energetic cheerful pose`

**Datei-Benennung (unter `public/images/snake/`):**
```
snake-baby.png      snake-baby-happy.png   snake-baby-tired.png
snake-smallChild.png (usw. pro Phase)
egg.png             egg-cracked.png
terrarium-bg.png
decor-cave.png      decor-plant.png   decor-disco.png
decor-log.png       decor-water.png   decor-rocks.png
```

---

## 11. Tipps

- **Starte mit Prompt 1A**, erzeuge 4 Variationen, dann „variieren" bis einer gefällt.
- Wenn ein Bild passt: **denselben Seed verwenden** und nur den Zustandsteil ändern → konsistenter Charakter.
- Für einfachere Animierbarkeit: **Prompt 1B (flach/vector)** bevorzugen.
- Gewählte Bilder **speichern und die Datei nennen** – dann testen wir sie in der Browser-Vorschau.
- **Konsistenz-Tipp:** Generiere zuerst die Phase, die am besten gefällt (empfohlen: Baby), dann „same character, grown up" oder den Seed wiederverwenden.
