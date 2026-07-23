# Independent AMT market widget

Minimal third-party reference integration using only an injected wallet, viem
and `@amt-1/sdk`. It does not import the AMT frontend or call an AMT-hosted API.

```sh
npm install
npm run dev
```

The example discovers and verifies the live AMT deployment, quotes from the
token, buys through Robinhood Chain's official Universal Router and sells
through Permit2 plus the same canonical v4 hook.

## GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml`. After pushing to
the `main` branch, open the repository's **Settings → Pages** and select
**GitHub Actions** as the source. Every subsequent push to `main` builds and
deploys the widget.
