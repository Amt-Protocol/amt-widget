# Independent AMT market widget

Minimal third-party reference integration using only an injected wallet, viem
and `@amt-1/sdk`. It does not import the AMT frontend or call an AMT-hosted API.

```sh
cp .env.example .env.local
npm install
npm run dev
```

Set `VITE_AMT_TOKEN` to a deployed Draft 0.2 token. The legacy capped Draft 0.1
address is intentionally rejected by SDK 0.2.x. No Draft 0.2 mainnet address is
published until the new contracts are deployed and verified.

The example discovers and verifies the configured AMT deployment, quotes from the
token, buys through Robinhood Chain's official Universal Router and sells
through Permit2 plus the same canonical v4 hook.

## Production hosting

Run `npm run build` and serve `dist/` from any static host. GitHub Actions and
GitHub Pages are not required.
