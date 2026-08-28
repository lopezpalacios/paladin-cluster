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

## Tutorials

- [HelloVlad](examples/hello-vlad/TUTORIAL.md) — compile your own `hello-vlad.sol`
  from source, deploy via Paladin, verify the emitted event (no pre-compiled ABI)
- [storage-vlad](examples/storage-vlad) — public store of string + uint256 on Sepolia
- [pente-group](examples/pente-group) — private contract in a privacy group, outsider denied
- [noto-token](examples/noto-token) — notarized tokens: mint, transfer, burn, per-node receipt visibility
- [notary-2of2](examples/notary-2of2) — two-device co-signed notary API + demo

## Diagrams

- [2-of-2 notary architecture](docs/diagrams/cosign-architecture.html)
- [Sign request sequence](docs/diagrams/cosign-sequence.html)
- [All workflows overview](docs/diagrams/workflows.html)

For agents: see [AGENTS.md](AGENTS.md) for repo layout and conventions.

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
