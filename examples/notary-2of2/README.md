# notary-2of2 example

Two-device 2-of-2 notary signing. The extra example that features the
co-signing API architecture end to end.

## Architecture

```
Device A                                Device B
┌──────────────────────────┐            ┌──────────────────────────┐
│ Paladin node A           │            │ Paladin node B           │
│  signing module ─────────┼──HTTP──────▶ cosigner agent B (API)   │
│ cosigner agent A (API) ◀─┼──HTTP──────│  signing module          │
└──────────────────────────┘            └──────────────────────────┘
```

- Node A's key signs only if Device B's agent approves the exact request
- Node B's key signs only if Device A's agent approves
- Either agent offline = that node's key is frozen

## API

The cosigner agent exposes one approval endpoint. Full spec:
[`../../signingmodules/notary-2of2/cosigner/API.md`](../../signingmodules/notary-2of2/cosigner/API.md)

| Endpoint | Purpose |
|---|---|
| `POST /cosign` | approve/reject a signing request (attestation signature) |
| `GET /healthz` | liveness |

## Demo

Runs the full approval flow against a live agent with curl only:

```bash
./demo.sh
```

Shows: approved path, policy rejection, and 2-of-2 enforcement when the
agent goes offline.

## Diagrams

See [`docs/diagrams/`](../../docs/diagrams/):

- `cosign-architecture.html` — two-device layout
- `cosign-sequence.html` — one sign request, step by step
- `workflows.html` — all Paladin workflows side by side

## What is NOT in this example yet

- Custom Paladin image with the module baked in (gradle `buildPaladinImage`)
- Node config wiring (`signingModules` + `wallets` + Noto notary pointer)
- Tailscale/HMAC hardening for production exposure
