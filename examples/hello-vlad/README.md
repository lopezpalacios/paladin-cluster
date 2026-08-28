# HelloVlad

Compile your own Solidity contract (`hello-vlad.sol`) and deploy it through a Paladin node.

Unlike the official helloworld example, nothing is pre-compiled: this example
compiles the ABI + bytecode from source with `solc`, then deploys, calls, and
verifies the emitted event.

## Quick start

```bash
cd examples/hello-vlad
npm install
npm run compile      # hello-vlad.sol -> abis/HelloVlad.json
npm run start        # deploy + sayHello + verify event
```

Expected output:

```
Welcome to Paladin, Vlad
```

Needs a running Paladin network — from repo root: `./start-paladin.sh`

Full walkthrough: [TUTORIAL.md](TUTORIAL.md)
