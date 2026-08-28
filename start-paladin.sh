#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================="
echo " Paladin cluster starter"
echo "=============================================="

command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found. Install docker (or colima on macOS)."; exit 1; }
command -v kind >/dev/null 2>&1 || { echo "ERROR: kind not found. Run: ./install-tools.sh (or: nix develop)"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "ERROR: kubectl not found. Run: ./install-tools.sh (or: nix develop)"; exit 1; }
command -v helm >/dev/null 2>&1 || { echo "ERROR: helm not found. Run: ./install-tools.sh (or: nix develop)"; exit 1; }

echo ""
echo "Base ledger choice:"
echo "  1) Private Besu  - local kind cluster, fully offline"
echo "  2) Sepolia       - public testnet, requires an RPC provider (Infura/Alchemy)"
read -r -p "Choose [1/2]: " LEDGER

add_repos() {
  helm repo add paladin https://LFDT-Paladin.github.io/paladin --force-update >/dev/null
  helm repo add jetstack https://charts.jetstack.io --force-update >/dev/null
  helm repo update >/dev/null
}

install_core() {
  echo "==> Installing Paladin CRDs"
  helm upgrade --install paladin-crds paladin/paladin-operator-crd >/dev/null
  echo "==> Installing cert-manager"
  helm upgrade --install cert-manager --namespace cert-manager --version v1.16.1 \
    jetstack/cert-manager --create-namespace --set crds.enabled=true >/dev/null
}

ensure_kind_cluster() {
  if kind get clusters 2>/dev/null | grep -qx paladin; then
    echo "==> kind cluster 'paladin' already exists"
  else
    echo "==> Creating kind cluster 'paladin'"
    kind create cluster --name paladin --config "$SCRIPT_DIR/paladin-kind.yaml"
  fi
}

case "$LEDGER" in
  1)
    echo "==> Starting local private Besu network"
    ensure_kind_cluster
    add_repos
    install_core
    echo "==> Installing Paladin operator (devnet: 3 Paladin + 3 Besu nodes)"
    helm upgrade --install paladin paladin/paladin-operator -n paladin --create-namespace
    ;;
  2)
    echo "==> Starting Sepolia-backed Paladin node"
    ensure_kind_cluster
    add_repos
    install_core
    read -r -p "Sepolia JSON-RPC HTTP URL (e.g. https://sepolia.infura.io/v3/KEY): " RPC_HTTP
    read -r -p "Sepolia WebSocket URL (e.g. wss://sepolia.infura.io/ws/v3/KEY): " RPC_WS
    echo "==> Installing Paladin operator (no local Besu)"
    helm upgrade --install paladin paladin/paladin-operator -n paladin \
      --create-namespace --set mode=none >/dev/null
    echo "==> Applying Paladin node connected to Sepolia"
    sed -e "s|\$JSONRPC_URL|$RPC_HTTP|g" -e "s|\$WS_URL|$RPC_WS|g" \
      "$SCRIPT_DIR/manifests/paladin-sepolia.yaml.tmpl" | kubectl apply -f -
    ;;
  *)
    echo "Invalid choice."
    exit 1
    ;;
esac

echo ""
echo "Done. Watch pods: kubectl -n paladin get pods -w"
echo "Paladin UI (node 1): http://localhost:31548/ui"
