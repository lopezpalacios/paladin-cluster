# notary-2of2 signing module

Operational 2-of-2 signing for Paladin. A node's key cannot sign anything unless
the remote cosigner agent on the other device approves the exact signing request.

Symmetric setup:

- Node A wallet key → module requires cosigner agent running on Node B
- Node B wallet key → module requires cosigner agent running on Node A

Neither node can sign alone. Either agent offline = that node's key is frozen.

## How it works

```
Paladin node
   │ Sign(key, payload)
   ▼
module: builds attestation = sha256("paladin-2of2-v1:" + payload + ":" + keyIdentifier)
   │  POST /cosign {keyIdentifier, algorithm, payload, attestation}
   ▼
cosigner agent (other device):
   1. policy check: keyIdentifier matches allowedKeyIdentifiers regexes
   2. signs attestation with its own ECDSA key
   3. returns {approved: true, signature}
   │
   ▼
module: verifies agent signature against configured cosigner.publicKey
   → on success: signs with the LOCAL key, returns signature to Paladin
   → on failure/rejection: returns error — Paladin cannot sign
```

## Build

The module must be built inside a checkout of the Paladin repo
(replace directives in go.mod point at the paladin tree):

```bash
./scripts/build-signingmodule.sh
```

This rsyncs the module into `~/projects/paladin/signingmodules/notary-2of2`,
builds:

- `libnotary2of2.so` — the c-shared plugin (goes into the custom Paladin image)
- `cosigner` — the standalone cosigner agent binary

## Cosigner agent

Generate a key:

```bash
./cosigner -genkey
# privateKey (agent config):  <hex>
# publicKey (module config):  <hex>
```

Run:

```bash
./cosigner -config cosigner.json
```

`cosigner.json`:

```json
{
  "listen": ":9191",
  "privateKey": "<hex DER EC private key>",
  "clientPublicKey": "",
  "allowedKeyIdentifiers": ["notary@node.*"]
}
```

## Module config (in the Paladin node config / CR)

```yaml
signingModules:
  - name: notary-2of2
    plugin:
      type: c-shared
      library: /app/signingmodules/libnotary2of2.so
    configJSON: |
      {
        "signer": {
          "keyStore": {
            "type": "static",
            "static": {
              "keys": {
                "seed": {
                  "encoding": "none",
                  "inline": "<mnemonic>"
                }
              }
            }
          },
          "keyDerivation": { "type": "bip32" }
        },
        "cosigner": {
          "url": "http://<other-device>:9191",
          "publicKey": "<agent public key hex>",
          "timeoutSeconds": 10
        }
      }

wallets:
  - name: notary-2of2-wallet
    keySelector: ".*"
    keySelectorMustNotMatch: false
    signerType: plugin
    signerPluginName: notary-2of2
```

Then point the Noto notary at this wallet's verifier.

## Roadmap

- [ ] Bake module into custom Paladin image (gradle `buildPaladinImage`)
- [ ] Deploy image on both devices, wire wallets
- [ ] Noto token with 2-of-2 notary; kill agent → transfers blocked test
- [ ] Cryptographic 2-of-2 (2P-ECDSA) to remove the local full-key
