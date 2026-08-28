#!/usr/bin/env bash
set -euo pipefail

AGENT_BIN="${AGENT_BIN:-$HOME/projects/paladin/signingmodules/notary-2of2/cosigner/cosigner}"
TMP="$(mktemp -d)"
AGENT_PID=""
cleanup() { [ -n "$AGENT_PID" ] && kill "$AGENT_PID" 2>/dev/null || true; rm -rf "$TMP"; }
trap cleanup EXIT

if [ ! -x "$AGENT_BIN" ]; then
  echo "cosigner binary not found at $AGENT_BIN"
  echo "Build it: scripts/build-signingmodule.sh"
  exit 1
fi

echo "== 2-of-2 cosign API demo =="
echo "Simulates: Device A node wants to sign -> Device B agent must approve"

# Generate keys for both agents
AGENT_B_PRIV=$("$AGENT_BIN" -genkey | sed -n 's/^privateKey (agent config):  //p')
AGENT_B_PUB=$("$AGENT_BIN" -genkey | sed -n 's/^publicKey (module config):  //p')

cat > "$TMP/agent-b.json" <<EOF
{
  "listen": "127.0.0.1:9192",
  "privateKey": "$AGENT_B_PRIV",
  "allowedKeyIdentifiers": ["notary@node.*"]
}
EOF

echo ""
echo "1. Starting Device B cosigner agent (policy: notary@node.* only)"
"$AGENT_BIN" -config "$TMP/agent-b.json" >"$TMP/agent-b.log" 2>&1 &
AGENT_PID=$!
sleep 1

ATT=$(python3 -c "import hashlib; print(hashlib.sha256(b'paladin-2of2-v1:deadbeef:notary@node1').hexdigest())")

echo "2. Module A -> Agent B: POST /cosign for key 'notary@node1'"
RES=$(curl -s -m 5 -X POST http://127.0.0.1:9192/cosign \
  -H 'Content-Type: application/json' \
  -d "{\"keyIdentifier\":\"notary@node1\",\"algorithm\":\"ecdsa:secp256k1\",\"payload\":\"deadbeef\",\"attestation\":\"$ATT\"}")
printf '   '; echo "$RES" | head -c 120; echo

echo "3. Module A -> Agent B: POST /cosign for key 'badguy@node3'"
RES2=$(curl -s -m 5 -X POST http://127.0.0.1:9192/cosign \
  -H 'Content-Type: application/json' \
  -d "{\"keyIdentifier\":\"badguy@node3\",\"algorithm\":\"ecdsa:secp256k1\",\"payload\":\"deadbeef\",\"attestation\":\"$ATT\"}")
echo "   $RES2"

echo "4. Kill Device B agent -> module cannot sign (2-of-2 enforcement)"
kill "$AGENT_PID" 2>/dev/null; AGENT_PID=""; sleep 1
if curl -s -m 2 -X POST http://127.0.0.1:9192/cosign \
  -H 'Content-Type: application/json' \
  -d "{\"keyIdentifier\":\"notary@node1\",\"algorithm\":\"ecdsa:secp256k1\",\"payload\":\"deadbeef\",\"attestation\":\"$ATT\"}" >/dev/null 2>&1; then
  echo "   UNEXPECTED: agent still responding"
else
  echo "   agent unreachable -> Paladin node A CANNOT sign. 2-of-2 holds."
fi

echo ""
echo "Agent B public key (for module config): $AGENT_B_PUB"
