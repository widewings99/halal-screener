# Deploy Everywhere

## 1. Deploy the free screening service

1. Create a free Cloudflare account.
2. Open **Workers & Pages**, then **Create Worker**.
3. Paste the contents of `worker.js` and deploy it.
4. Copy the resulting URL, such as `https://halal-screener-api.example.workers.dev`.

## 2. Connect GitHub Pages

Open the app once using:

`https://widewings99.github.io/halal-screener/?api=https://YOUR-WORKER.workers.dev`

The app remembers the Worker URL on that device. Bookmark or add the resulting page to the phone home screen.

## 3. Publish updates

Upload `index.html`, `worker.js`, `wrangler.jsonc`, and this guide to the `widewings99/halal-screener` repository.
