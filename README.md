# CelebHair

Upload a selfie, add celebrity hairstyle inspiration photos, and see yourself wearing each one.

- **frontend/** — React + TypeScript (Vite)
- **backend/** — plain PHP 8.1+ (no Composer deps; needs the `curl`, `gd` and `fileinfo` extensions)

## Run it

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. This starts Vite and the PHP built-in server on port 8000 (Vite proxies `/api` to it).

Without an API key the app runs in **demo mode**: the whole flow works, but the "result" is just your selfie with the inspiration photo inset.

## Turn on real try-ons

```bash
cp backend/.env.example backend/.env
```

Add one key to `backend/.env`:

| Provider | Key | Default model |
|---|---|---|
| Google Gemini | `GEMINI_API_KEY` ([get one](https://aistudio.google.com/apikey)) | `gemini-2.5-flash-image` |
| OpenAI | `OPENAI_API_KEY` ([get one](https://platform.openai.com/api-keys)) | `gpt-image-1` |

If both are set, Gemini wins unless you set `PROVIDER=openai`. Change models with `GEMINI_MODEL` / `OPENAI_MODEL`. Restart `npm run dev` after editing `.env`.

## How it works

1. The browser downsizes every photo to max 1536 px JPEG (also fixes phone rotation).
2. For each look, the frontend POSTs `selfie` + `inspiration` to `POST /api/try-on` (2 looks at a time).
3. PHP validates the images and asks the image model to put the inspiration's haircut on the selfie while keeping the face, pose and background ([prompt](backend/src/TryOnPrompt.php)).
4. The result comes back as a data URL; the card shows a before/after slider.

Options: **Keep my hair colour** (cut and styling only) and a free-text **note for the stylist**.

Adding a provider: implement [`HairProvider`](backend/src/Providers/HairProvider.php) and register it in [`ProviderFactory`](backend/src/Providers/ProviderFactory.php).

## Production

```bash
cd frontend && npm run serve
```

Builds `frontend/dist`, which `backend/public/index.php` serves next to the API. For Apache/nginx, point the document root at `backend/public` and route every request to `index.php`; raise `upload_max_filesize` / `post_max_size` (~12M / 26M) and allow ~4-minute request timeouts.

## Privacy

Photos are sent to the chosen AI provider to generate the result. The app does not store them on disk.
