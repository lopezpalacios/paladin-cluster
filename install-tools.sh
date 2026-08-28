#!/usr/bin/env bash
set -euo pipefail

OS="$(uname -s)"
ARCH="$(uname -m)"

echo "==> Checking tools"

have() { command -v "$1" >/dev/null 2>&1; }

if [ "$OS" = "Darwin" ]; then
  if ! have brew; then
    echo "ERROR: Homebrew not found. Install: https://brew.sh"
    exit 1
  fi
  have colima || brew install colima
  have docker || brew install docker
  have kind || brew install kind
  have kubectl || brew install kubectl
  have helm || brew install helm
  if ! have nix; then
    echo "NOTE: nix not found. Using brew tools only (no flake)."
  fi
  echo "==> Starting colima (docker VM)"
  colima status >/dev/null 2>&1 || colima start
else
  if ! have docker; then
    echo "ERROR: docker not found. Install it first (apt install docker.io)."
    exit 1
  fi
  BIN="$HOME/.local/bin"
  mkdir -p "$BIN"
  case ":$PATH:" in *":$BIN:"*) ;; *) export PATH="$BIN:$PATH" ;; esac
  if ! have kind; then
    echo "==> Installing kind"
    curl -Lo "$BIN/kind" "https://kind.sigs.k8s.io/dl/v0.31.0/kind-linux-$( [ "$ARCH" = "aarch64" ] && echo arm64 || echo amd64 )"
    chmod +x "$BIN/kind"
  fi
  if ! have kubectl; then
    echo "==> Installing kubectl"
    curl -Lo "$BIN/kubectl" "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/$( [ "$ARCH" = "aarch64" ] && echo arm64 || echo amd64 )/kubectl"
    chmod +x "$BIN/kubectl"
  fi
  if ! have helm; then
    echo "==> Installing helm"
    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  fi
fi

echo "==> Verify:"
echo "docker: $(docker --version 2>/dev/null || echo MISSING)"
echo "kind:   $(kind --version 2>/dev/null || echo MISSING)"
echo "kubectl: $(kubectl version --client 2>/dev/null | head -1 || echo MISSING)"
echo "helm:   $(helm version 2>/dev/null || echo MISSING)"

echo ""
echo "All tools ready. Now run: ./start-paladin.sh"
