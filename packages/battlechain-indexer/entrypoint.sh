#!/bin/bash
# Note: not using set -e because rindexer may panic/crash during the
# first-run setup phase, and we need the script to continue past that
# to run SQL setup and restart rindexer.

# BattleChain Indexer Entrypoint
# Waits for deployed contract addresses and generates rindexer config

ADDRESSES_FILE="${ADDRESSES_FILE:-/shared/addresses.json}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-300}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_TEMPLATE="${SCRIPT_DIR}/rindexer.yaml.template"
CONFIG_OUTPUT="${SCRIPT_DIR}/rindexer.yaml"

echo "========================================"
echo "BattleChain Indexer Starting"
echo "========================================"
echo ""

# Function to load addresses from JSON file
load_addresses() {
    if [ -f "$ADDRESSES_FILE" ]; then
        export ATTACK_REGISTRY_ADDRESS=$(jq -r '.ATTACK_REGISTRY_ADDRESS // empty' "$ADDRESSES_FILE")
        export AGREEMENT_FACTORY_ADDRESS=$(jq -r '.AGREEMENT_FACTORY_ADDRESS // empty' "$ADDRESSES_FILE")
        export SAFE_HARBOR_REGISTRY_ADDRESS=$(jq -r '.SAFE_HARBOR_REGISTRY_ADDRESS // empty' "$ADDRESSES_FILE")
        export BATTLECHAIN_START_BLOCK=$(jq -r '.BATTLECHAIN_START_BLOCK // "0"' "$ADDRESSES_FILE")
        export CHAIN_ID=$(jq -r '.CHAIN_ID // "626"' "$ADDRESSES_FILE")

        # Validate addresses are not empty
        if [ -n "$ATTACK_REGISTRY_ADDRESS" ] && [ -n "$AGREEMENT_FACTORY_ADDRESS" ]; then
            return 0
        fi
    fi
    return 1
}

# Check if addresses are already provided via environment
# (allows manual override without waiting for deployer)
if [ -n "$ATTACK_REGISTRY_ADDRESS" ] && \
   [ "$ATTACK_REGISTRY_ADDRESS" != "0x0000000000000000000000000000000000000000" ] && \
   [ -n "$AGREEMENT_FACTORY_ADDRESS" ] && \
   [ "$AGREEMENT_FACTORY_ADDRESS" != "0x0000000000000000000000000000000000000000" ]; then
    echo "Using addresses from environment variables"
    echo ""
else
    echo "Waiting for contract addresses..."
    echo "  File: $ADDRESSES_FILE"
    echo "  Timeout: ${WAIT_TIMEOUT}s"
    echo ""

    elapsed=0
    while [ $elapsed -lt $WAIT_TIMEOUT ]; do
        if load_addresses; then
            echo "Addresses loaded from file!"
            break
        fi

        # Show progress every 10 seconds
        if [ $((elapsed % 10)) -eq 0 ]; then
            echo "  Waiting... ($elapsed/${WAIT_TIMEOUT}s)"
        fi

        sleep 2
        elapsed=$((elapsed + 2))
    done

    if [ $elapsed -ge $WAIT_TIMEOUT ]; then
        echo ""
        echo "WARNING: Timeout waiting for addresses file"
        echo "Using fallback null addresses (indexer will not index real contracts)"
        echo ""
        export ATTACK_REGISTRY_ADDRESS="${ATTACK_REGISTRY_ADDRESS:-0x0000000000000000000000000000000000000000}"
        export AGREEMENT_FACTORY_ADDRESS="${AGREEMENT_FACTORY_ADDRESS:-0x0000000000000000000000000000000000000000}"
        export SAFE_HARBOR_REGISTRY_ADDRESS="${SAFE_HARBOR_REGISTRY_ADDRESS:-0x0000000000000000000000000000000000000000}"
        export BATTLECHAIN_START_BLOCK="${BATTLECHAIN_START_BLOCK:-0}"
    fi
fi

# Set defaults for any missing values
export CHAIN_ID="${CHAIN_ID:-626}"
export BLOCKCHAIN_RPC_URL="${BLOCKCHAIN_RPC_URL:-http://zksync:3050}"
export BATTLECHAIN_START_BLOCK="${BATTLECHAIN_START_BLOCK:-0}"

echo "========================================"
echo "Contract Addresses"
echo "========================================"
echo "  ATTACK_REGISTRY_ADDRESS:      $ATTACK_REGISTRY_ADDRESS"
echo "  AGREEMENT_FACTORY_ADDRESS:    $AGREEMENT_FACTORY_ADDRESS"
echo "  SAFE_HARBOR_REGISTRY_ADDRESS: $SAFE_HARBOR_REGISTRY_ADDRESS"
echo "  CHAIN_ID:                     $CHAIN_ID"
echo "  BATTLECHAIN_START_BLOCK:                  $BATTLECHAIN_START_BLOCK"
echo "  RPC_URL:                      $BLOCKCHAIN_RPC_URL"
echo ""

# Generate rindexer.yaml from template
if [ -f "$CONFIG_TEMPLATE" ]; then
    echo "Generating rindexer.yaml from template..."
    envsubst < "$CONFIG_TEMPLATE" > "$CONFIG_OUTPUT"
    echo "  Generated: $CONFIG_OUTPUT"
    echo ""
else
    echo "WARNING: Config template not found at $CONFIG_TEMPLATE"
    echo "Using existing rindexer.yaml if available"
    echo ""
fi

# ========================================
# SQL Setup + Rindexer Startup
# ========================================
# Strategy:
#   1. Start rindexer in the background (creates event tables on startup)
#   2. Wait for event tables to appear, then run SQL setup
#   3. Keep rindexer running as the main process
#
# We intentionally avoid `exec` so the shell survives a rindexer panic
# and the SQL setup can complete even if rindexer crashes on first run.

cd "${SCRIPT_DIR}"

echo ""
echo "========================================"
echo "Starting rindexer"
echo "========================================"
echo ""

# Start rindexer in the background
/app/rindexer "$@" &
RINDEXER_PID=$!

# Forward SIGTERM/SIGINT from the container runtime to rindexer so it can shut
# down cleanly. Without this, `docker stop` only signals the shell (PID 1) and
# rindexer gets SIGKILL after the grace period.
trap 'kill -TERM $RINDEXER_PID 2>/dev/null; wait $RINDEXER_PID' TERM INT

# Wait for event tables (rindexer creates them within ~1s of startup)
echo "[sql-setup] Waiting for rindexer to create event tables..."
max_attempts=60
attempt=0
while [ $attempt -lt $max_attempts ]; do
    factory_ok=false
    agreement_ok=false
    registry_ok=false

    psql "$DATABASE_URL" -c "SELECT 1 FROM battlechainindexer_agreement_factory.agreement_created LIMIT 0" 2>/dev/null && factory_ok=true
    psql "$DATABASE_URL" -c "SELECT 1 FROM battlechainindexer_agreement.protocol_name_updated LIMIT 0" 2>/dev/null && agreement_ok=true
    psql "$DATABASE_URL" -c "SELECT 1 FROM battlechainindexer_attack_registry.agreement_state_changed LIMIT 0" 2>/dev/null && registry_ok=true

    if [ "$factory_ok" = true ] && [ "$agreement_ok" = true ] && [ "$registry_ok" = true ]; then
        echo "[sql-setup] All event tables exist!"
        break
    fi

    # Once factory exists, only wait 60s more for agreement/registry
    if [ "$factory_ok" = true ] && [ $attempt -gt 30 ]; then
        echo "[sql-setup] Factory exists but agreement/registry tables not found after 30 extra attempts."
        echo "[sql-setup] Proceeding with partial setup (triggers for missing tables will fail)."
        break
    fi

    attempt=$((attempt + 1))
    if [ $((attempt % 5)) -eq 0 ]; then
        echo "[sql-setup] Waiting... ($attempt/$max_attempts) [factory=$factory_ok agreement=$agreement_ok registry=$registry_ok]"
    fi
    sleep 2
done

# Run SQL setup
if [ -f "${SCRIPT_DIR}/sql/create-agreement-current-state.sql" ]; then
    echo "[sql-setup] Running create-agreement-current-state.sql..."
    psql "$DATABASE_URL" -f "${SCRIPT_DIR}/sql/create-agreement-current-state.sql" 2>&1
    echo "[sql-setup] SQL exit code: $?"
else
    echo "[sql-setup] ERROR: SQL file not found!"
fi

echo "[sql-setup] Done."

# If rindexer is still running, wait for it (keeps container alive).
# If it already crashed, restart it — the SQL setup is now complete
# so the triggers and materialized table are in place.
if kill -0 $RINDEXER_PID 2>/dev/null; then
    echo "[entrypoint] Rindexer is running (PID $RINDEXER_PID), waiting..."
    wait $RINDEXER_PID
else
    echo "[entrypoint] Rindexer exited before SQL setup finished. Restarting..."
    exec /app/rindexer "$@"
fi
