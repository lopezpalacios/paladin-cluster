# Tutorial: HelloVlad

Same idea as the official [Hello World tutorial](https://lfdt-paladin.github.io/paladin/head/tutorials/hello-world/),
but with one difference: we start from our own Solidity source file and compile it ourselves.

The official tutorial starts from a pre-compiled ABI + bytecode. This tutorial:

1. Writes `hello-vlad.sol` (Solidity source)
2. Compiles it to ABI + bytecode with `solc`
3. Deploys it through a Paladin node
4. Calls `sayHello` and verifies the emitted event

## Directory layout

```
examples/hello-vlad/
├── TUTORIAL.md            this file
├── package.json           dependencies (paladin-sdk, solc, ts-node)
├── tsconfig.json
├── contracts/
│   └── hello-vlad.sol     the Solidity source (ours, not pre-compiled)
├── scripts/
│   └── compile.mjs        solc compile script -> abis/HelloVlad.json
├── abis/
│   └── HelloVlad.json     generated: { abi, bytecode }
└── src/
    └── index.ts           deploy + call + verify events
```

## Prerequisites

- A running Paladin network. From repo root: `./install-tools.sh && ./start-paladin.sh`
  (choose option 1 = private Besu, or option 2 = Sepolia)
- Node.js 20+

## Run

```bash
cd examples/hello-vlad
npm install
npm run compile      # hello-vlad.sol -> abis/HelloVlad.json
npm run start        # deploy + sayHello + verify event
```

Expected output:

```
STEP 1: HelloVlad deployed at 0x...
STEP 2: sayHello executed!
STEP 3: Events verified!

Welcome to Paladin, Vlad
```

## Configuration (env vars)

| Var | Default | Purpose |
|-----|---------|---------|
| `PALADIN_URL` | `http://localhost:31548` | Paladin node JSON-RPC |
| `PALADIN_NODE_ID` | `node1` | Node identity for the verifier lookup |
| `GREET_NAME` | `Vlad` | Name passed to `sayHello` |
| `POLL_TIMEOUT` | `60000` | Receipt poll timeout (ms) |

## How it works

**Compile step** — `scripts/compile.mjs` feeds `hello-vlad.sol` to `solc`
(npm package, no global install needed). Output: `abis/HelloVlad.json` with
`abi` + `bytecode` (hex, `0x`-prefixed).

**Deploy** — `paladin.ptx.sendTransaction` with `type: PUBLIC`, the compiled
`bytecode`, and no `to` address (contract does not exist yet).

**Call** — same API, but with `function: "sayHello"` and `to: <deployed address>`.

**Verify** — `paladin.bidx.decodeTransactionEvents` decodes the event emitted
during the call. We compare its `message` field with the expected string.

## Differences vs the official helloworld example

| | Official helloworld | This tutorial |
|---|---|---|
| ABI/bytecode source | pre-compiled, bundled | compiled from `hello-vlad.sol` |
| Dependencies | `paladin-example-common` package | none — self-contained |
| Config | env config files | env vars with defaults |
| Node | `localhost:31548` | same, overridable via `PALADIN_URL` |

## Next steps

- Change the contract, recompile, run again: edit `contracts/hello-vlad.sol`
  then `npm run compile && npm run start`
- Private contract: change `TransactionType.PUBLIC` to `PRIVATE` — Paladin
  then distributes the transaction privately between group members
- Connect to Sepolia: `PALADIN_URL` pointing at a Sepolia-backed node
