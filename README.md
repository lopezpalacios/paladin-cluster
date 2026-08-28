# paladin-cluster

Paladin (LFDT) starter for two devices. Clone on each machine, run one script, choose your base ledger.

## What it does

`start-paladin.sh` asks one question:

1. **Private Besu** — local kind cluster with 3 Paladin + 3 Besu nodes, fully offline
2. **Sepolia** — Paladin node backed by public Sepolia testnet (needs an RPC provider)

Both options install:

- Paladin CRDs (custom resource definitions)
- cert-manager (TLS badges)
- Paladin operator (the worker)

## Requirements

- docker (on macOS: colima)
- kind, kubectl, helm

Two ways to get the tools:

1. **No nix needed:** `./install-tools.sh` — installs everything (brew on macOS, direct binaries on Linux)
2. **With nix:** `nix develop` — devShell provides kind, kubectl, helm

## Usage

### Way 1 — Nix

```bash
git clone https://github.com/lopezpalacios/paladin-cluster.git
cd paladin-cluster
nix develop
./start-paladin.sh
```

### Way 2 — No nix

```bash
git clone https://github.com/lopezpalacios/paladin-cluster.git
cd paladin-cluster
./install-tools.sh
./start-paladin.sh
```

Then watch the pods:

```bash
kubectl -n paladin get pods -w
```

Paladin UI: <http://localhost:31548/ui>

## Two devices

Each device runs its own local stack (this script). Same ports on both: `31545–31750`.

Networking note: kind binds ports to localhost only. Two devices joining the same
privacy group needs cross-machine networking (same LAN / Tailscale) — WIP.

## Files

- `start-paladin.sh` — interactive starter (Sepolia or private Besu)
- `install-tools.sh` — no-nix way: installs docker/colima, kind, kubectl, helm
- `paladin-kind.yaml` — kind config, port mapping for 3 node pairs (localhost only)
- `flake.nix` — nix devShell: kind, kubectl, helm
- `manifests/paladin-sepolia.yaml.tmpl` — Paladin node CR with external EVM endpoint

## Clean up

```bash
nix run . -- down   # delete kind cluster
```
