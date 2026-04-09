# CARAIDIZ 💎 — PWA
> watching becomes playing

## Project structure

```
caraidiz/
├── index.html          ← PWA meta tags + SW registration
├── manifest.json       ← Makes app installable
├── sw.js               ← Service worker (offline + caching)
├── vite.config.js      ← Build config
├── package.json
├── src/
│   ├── main.jsx        ← React entry point
│   └── App.jsx         ← Full app (edit Caras here)
└── public/
    └── icons/
        ├── icon-192.png   ← App icon (ADD THIS)
        └── icon-512.png   ← App icon large (ADD THIS)
```

---

## Quick start (local)

```bash
npm install
npm run dev
# → opens at http://localhost:3000
```

---

## Deploy to Vercel (free, ~2 min)

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import your repo
3. Framework: **Vite** (auto-detected)
4. Click Deploy
5. Share the URL → done

The app is now a PWA. On mobile:
- **Android:** Chrome shows "Add to Home Screen" banner automatically
- **iPhone:** Safari → Share → "Add to Home Screen"

---

## Add your icons

Create two square PNG icons and place them in `/public/icons/`:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)

Use your 💎 diamond logo or the Caraidiz logo mark.
Free tool: https://realfavicongenerator.net

---

## Add real Caras (TikTok videos)

Open `src/App.jsx` and edit the `CARAS` array at the top:

```js
{
  category: "Brand",
  answer: "Nike",
  wordCount: 1,
  hint: "Just do it 👟",
  videoUrl: "https://www.tiktok.com/embed/v2/YOUR_VIDEO_ID_HERE"
}
```

**To get a TikTok embed URL:**
1. Open any TikTok video → Share → Copy link
2. You get: `https://www.tiktok.com/@user/video/7123456789`
3. Convert to: `https://www.tiktok.com/embed/v2/7123456789`
4. Paste as `videoUrl`

Leave `videoUrl: null` to show a placeholder.

---

## Push notifications (future)

The service worker already handles push notifications.
When you're ready, connect a backend (Supabase Edge Functions)
to send a daily push at 8am: "💎 Today's Cara is live!"

---

## Tech stack

- React 18 + Vite
- Zero dependencies beyond React
- All state in localStorage (no backend needed for MVP)
- PWA: manifest + service worker
- Deployable anywhere static files are served
