#!/usr/bin/env bash
#
# sync-abis.sh — regenerate the vendored contract ABIs from the canonical source.
#
# The BattleChain contract sources live in the git submodule at
#   packages/battlechain-deployer/contracts  (github.com/Cyfrin/battlechain-safe-harbor-contracts)
# which is the single source of truth. The indexer (rindexer) and the app both
# consume bare ABI arrays as committed JSON files. Those committed copies can
# drift from the contracts. This script rebuilds the contracts and extracts each
# ABI straight from the forge build output, writing it to both consumers.
#
# The indexer (rindexer) copies get two deliberate transforms that the app
# copies do NOT — keep them, they are not drift:
#   1. internalType stripped recursively. forge emits an "internalType" on every
#      parameter (incl. nested tuple components); rindexer mis-handles struct/enum
#      internalTypes. The app (ethers) tolerates it, so app copies keep it.
#   2. Event inputs named "contractAddress" renamed to "registeredContractAddress".
#      rindexer reserves an internal "contractAddress" column, so an event param of
#      the same name collides. Only EVENT inputs become columns, so only those are
#      renamed; function inputs/outputs are left as the canonical name.
#
# Run it whenever the contracts submodule is bumped. CI runs it and fails if the
# committed ABIs differ (see scripts/check-abis.sh), so drift can't be merged.
#
# Requirements: foundry (forge) and jq.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$REPO_ROOT/packages/battlechain-deployer/contracts"
INDEXER_ABI_DIR="$REPO_ROOT/packages/battlechain-indexer/abis"
APP_ABI_DIR="$REPO_ROOT/packages/app/src/abi"

# Contracts whose ABIs are consumed by the indexer and/or app. Each is built by
# the canonical repo and emitted to out/<Name>.sol/<Name>.json by forge.
CONTRACTS=(
  Agreement
  AgreementFactory
  AttackRegistry
  BattleChainSafeHarborRegistry
  BondManager
)

command -v forge >/dev/null || { echo "error: forge (foundry) not found in PATH" >&2; exit 1; }
command -v jq    >/dev/null || { echo "error: jq not found in PATH" >&2; exit 1; }

if [ ! -f "$CONTRACTS_DIR/foundry.toml" ]; then
  echo "error: contracts submodule not initialized at $CONTRACTS_DIR" >&2
  echo "       run: git submodule update --init --recursive" >&2
  exit 1
fi

echo "Building canonical contracts in $CONTRACTS_DIR ..."
( cd "$CONTRACTS_DIR" && forge build --skip test script )

for name in "${CONTRACTS[@]}"; do
  artifact="$CONTRACTS_DIR/out/$name.sol/$name.json"
  if [ ! -f "$artifact" ]; then
    echo "error: expected build artifact not found: $artifact" >&2
    exit 1
  fi

  # App copy: full canonical ABI, internalType kept (ethers handles it).
  # 2-space indent, trailing newline — the shape the app already imports.
  app_abi="$(jq '.abi' "$artifact")"

  # Indexer copy: rindexer-specific transforms (see header):
  #   - strip "internalType" recursively
  #   - rename event inputs named "contractAddress" -> "registeredContractAddress"
  indexer_abi="$(jq '
    .abi
    | map(
        if .type == "event" then
          .inputs |= map(if .name == "contractAddress" then .name = "registeredContractAddress" else . end)
        else . end
      )
    | walk(if type == "object" then del(.internalType) else . end)
  ' "$artifact")"

  printf '%s\n' "$indexer_abi" > "$INDEXER_ABI_DIR/$name.abi.json"
  echo "  wrote $INDEXER_ABI_DIR/$name.abi.json (internalType stripped)"

  # The app keeps a copy for every contract that has one. ERC20.json is a
  # standard ABI with no canonical source, so it is left untouched.
  if [ -f "$APP_ABI_DIR/$name.json" ]; then
    printf '%s\n' "$app_abi" > "$APP_ABI_DIR/$name.json"
    echo "  wrote $APP_ABI_DIR/$name.json"
  fi
done

echo "Done. ABIs synced from canonical source."
