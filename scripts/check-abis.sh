#!/usr/bin/env bash
#
# check-abis.sh — fail if the committed ABIs have drifted from the canonical source.
#
# Regenerates the vendored ABIs (via sync-abis.sh) and fails if anything changed.
# Intended for CI: it guarantees the indexer/app ABIs always match the contracts
# submodule, so the canonical repo stays the single source of truth.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ABI_PATHS=(
  packages/battlechain-indexer/abis
  packages/app/src/abi
)

# Regenerate into the working tree, then compare against the committed (HEAD)
# state. Comparing against HEAD — rather than the pre-run working tree — makes
# the result independent of any uncommitted local edits to the ABI files.
"$REPO_ROOT/scripts/sync-abis.sh"

if ! git -C "$REPO_ROOT" diff --quiet HEAD -- "${ABI_PATHS[@]}"; then
  echo "" >&2
  echo "error: committed ABIs are out of date with the canonical contracts." >&2
  echo "       run ./scripts/sync-abis.sh and commit the result." >&2
  echo "" >&2
  git -C "$REPO_ROOT" --no-pager diff --stat HEAD -- "${ABI_PATHS[@]}" >&2
  exit 1
fi

echo "ABIs are in sync with the canonical contracts."
