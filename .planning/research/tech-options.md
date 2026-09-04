# Technology Options — FamilyBoard MVP

## Recommended: PWA + React + Firebase
| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19 + TypeScript + Vite | Fast dev, PWA-capable |
| Styling | Tailwind CSS + daisyUI | Rapid UI |
| State | Zustand | Lightweight |
| Backend/Database | Firebase (Firestore) | Real-time sync, auth |
| Auth | Firebase Auth (Google + Anonymous) | No-login for kids |
| PWA | vite-plugin-pwa | Installable on all devices |
| Icons | Lucide | Free, 1500+ icons |
| Images | Gemini Imagen | Per-task generated images |

## Rationale
- Fastest path to working MVP
- Real-time sync out of the box
- Works on kitchen tablet via browser (PWA)
- Kids don't need accounts (anonymous auth)
- Free tier sufficient for personal use
