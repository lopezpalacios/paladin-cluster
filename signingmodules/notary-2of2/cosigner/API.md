# Cosigner API

HTTP API for 2-of-2 signing approval. One instance per device. The signing
module inside a Paladin node calls the cosigner on the *other* device before
its local key may sign anything.

## Endpoints

### POST /cosign

Request approval to sign a payload.

**Request**

```json
{
  "keyIdentifier": "notary@node1",
  "algorithm": "ecdsa:secp256k1",
  "payload": "<hex of payload bytes>",
  "attestation": "<hex of sha256('paladin-2of2-v1:' + payloadHex + ':' + keyIdentifier)>"
}
```

**Response — approved**

```json
{
  "approved": true,
  "signature": "<128 hex chars — 64-byte ECDSA r||s over the attestation>"
}
```

**Response — rejected**

```json
{
  "approved": false,
  "reason": "keyIdentifier 'badguy@node3' not allowed by policy"
}
```

### GET /healthz

```json
{ "status": "ok" }
```

## Semantics

- The agent **never sees the private key** of the requesting node
- The agent's signature is an attestation: "I saw this exact request and approve it"
- The module verifies the attestation signature with the agent's public key
  (configured in `cosigner.publicKey`) before signing with its local key
- Policy: `allowedKeyIdentifiers` regex list — first match wins, no match = reject
- Audit: every approval/rejection is logged with keyIdentifier, algorithm, payload length, timestamp

## Deployment

- **Docker:** `Dockerfile` in this directory — stdlib-only, ~12MB image
- **Kubernetes:** `k8s.yaml` — Secret (config) + Deployment + ClusterIP Service
- **Bare binary:** `go build -o cosigner .` — single file, launchd/systemd

## Security

| Concern | Mitigation |
|---|---|
| Anyone can call the API | Put it behind Tailscale/WireGuard; optionally add HMAC shared-secret auth (roadmap) |
| Replay of an old approval | Attestation binds the exact payload — a replayed signature fails verification for any other payload |
| Policy bypass | Key identifier allowlist enforced server-side |
| Agent key leak | Rotate: `-genkey`, update module config `cosigner.publicKey`, restart |
