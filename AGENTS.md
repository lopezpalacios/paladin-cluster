# AGENTS.md

Guide for AI agents (and humans) working in this repo.

## What this repo is

Paladin (LFDT) starter for two devices. Scripts set up a local Paladin network
(privacy layer on EVM) on any machine.

Paladin = Linux Foundation Decentralized Trust project. Privacy-preserving
smart contracts on an Ethereum-style base ledger.

## Repo layout

```
.
├── AGENTS.md                     this file
├── README.md                     human-facing overview
├── start-paladin.sh              main entry: asks Sepolia or private Besu
├── install-tools.sh              installs docker/colima, kind, kubectl, helm (no nix)
├── flake.nix                     nix devShell (kind, kubectl, helm)
├── paladin-kind.yaml             kind cluster config, ports 31545-31750 (localhost)
├── manifests/
│   └── paladin-sepolia.yaml.tmpl  Paladin CR with external EVM endpoint ($JSONRPC_URL/$WS_URL)
└── examples/
    ├── hello-vlad/        public deploy from own .sol (Sepolia)
    ├── storage-vlad/      public string+uint256 store (Sepolia)
    ├── pente-group/       privacy group, private contract, outsider test
    ├── noto-token/        notarized tokens: mint/transfer/burn + receipts
    └── notary-2of2/       two-device co-sign API demo (demo.sh)
├── signingmodules/notary-2of2/
│   ├── module (c-shared plugin, builds inside paladin tree)
│   └── cosigner/          standalone HTTP API agent (stdlib only)
│       ├── API.md         API spec (POST /cosign, GET /healthz)
│       ├── Dockerfile
│       └── k8s.yaml       Deployment + Service + Secret
├── docs/diagrams/         self-contained HTML diagrams (diagram-design style)
└── scripts/build-signingmodule.sh   rsync module into paladin tree + build .so + agent
```

## Commands

```bash
# Tool check + install (no nix needed)
./install-tools.sh

# Start cluster (asks: 1=private Besu, 2=Sepolia)
./start-paladin.sh

# Watch pods
kubectl -n paladin get pods -w

# Paladin UI
# http://localhost:31548/ui

# HelloVlad example
cd examples/hello-vlad && npm install && npm run compile && npm run start

# Delete cluster
nix run . -- down    # or: kind delete cluster --name paladin
```

## Conventions

- Shell scripts: bash, `set -euo pipefail`, stdlib only
- Everything localhost-bound by default — ports never exposed beyond the machine
- Chart versions pinned where the upstream tutorial pins them
- Keep examples self-contained: no dependency on the upstream paladin repo checkout
- `manifests/paladin-sepolia.yaml.tmpl` uses `$JSONRPC_URL` / `$WS_URL` placeholders,
  substituted by `start-paladin.sh` with sed (`|` delimiter)

## Two-device design

- Each device runs its own stack via `start-paladin.sh` (same ports both machines)
- Cross-device privacy group networking (Tailscale/LAN) not implemented yet
- `baseLedgerEndpoint` in the Paladin CR decides the base ledger:
  `type: local` = in-cluster Besu; `type: endpoint` = external chain (Sepolia)

## Environment variables (hello-vlad example)

| Var | Default |
|-----|---------|
| `PALADIN_URL` | `http://localhost:31548` |
| `PALADIN_NODE_ID` | `node1` |
| `GREET_NAME` | `Vlad` |
| `POLL_TIMEOUT` | `60000` |
