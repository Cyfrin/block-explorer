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

# Check if triggers already exist (i.e. SQL setup has run before)
cd "${SCRIPT_DIR}"
TRIGGERS_EXIST=false
if psql "$DATABASE_URL" -c "SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agreement_created' LIMIT 1" 2>/dev/null | grep -q "1"; then
    TRIGGERS_EXIST=true
fi

if [ "$TRIGGERS_EXIST" = true ]; then
    # Triggers already exist — just run SQL setup to update trigger functions
    # (CREATE OR REPLACE FUNCTION updates in-place) and start rindexer normally
    echo "========================================"
    echo "Triggers already exist — updating functions"
    echo "========================================"
    echo ""

    if [ -f "${SCRIPT_DIR}/sql/create-agreement-current-state.sql" ]; then
        if psql "$DATABASE_URL" -f "${SCRIPT_DIR}/sql/create-agreement-current-state.sql"; then
            echo "SQL setup updated successfully!"
        else
            echo "WARNING: SQL setup script had errors (non-fatal)"
        fi
    fi

    echo ""
    echo "========================================"
    echo "Starting rindexer"
    echo "========================================"
    echo ""
    exec /app/rindexer "$@"
else
    # First run: triggers don't exist yet.
    # Start rindexer briefly to create event tables, then stop it,
    # run SQL setup (creates triggers), reset the cursor, and restart.
    echo "========================================"
    echo "First run — setting up triggers"
    echo "========================================"
    echo ""

    echo "Starting rindexer to create event tables..."
    /app/rindexer "$@" &
    RINDEXER_PID=$!

    # Wait for factory tables (always created immediately by rindexer)
    echo "Waiting for rindexer to create factory tables..."
    sleep 10
    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM battlechainindexer_agreement_factory.agreement_created LIMIT 0" 2>/dev/null; then
            echo "Factory tables exist!"
            break
        fi
        attempt=$((attempt + 1))
        echo "  Waiting for factory tables... ($attempt/$max_attempts)"
        sleep 5
    done

    # Wait a bit longer for agreement/registry tables (created once rindexer
    # discovers Agreement contracts via factory events). These may never appear
    # if no agreements exist on chain yet — that's OK, we'll proceed without them.
    echo "Waiting for agreement & registry tables (up to 60s)..."
    extra_attempts=12
    extra=0
    all_ready=false
    while [ $extra -lt $extra_attempts ]; do
        agreement_ok=false
        registry_ok=false
        psql "$DATABASE_URL" -c "SELECT 1 FROM battlechainindexer_agreement.protocol_name_updated LIMIT 0" 2>/dev/null && agreement_ok=true
        psql "$DATABASE_URL" -c "SELECT 1 FROM battlechainindexer_attack_registry.agreement_state_changed LIMIT 0" 2>/dev/null && registry_ok=true

        if [ "$agreement_ok" = true ] && [ "$registry_ok" = true ]; then
            echo "All event tables exist!"
            all_ready=true
            break
        fi

        extra=$((extra + 1))
        echo "  Waiting... ($extra/$extra_attempts) [agreement=$agreement_ok registry=$registry_ok]"
        sleep 5
    done

    if [ "$all_ready" = false ]; then
        echo "Some event tables not yet created (no agreements on chain yet?)"
        echo "Triggers for missing tables will be created on next restart."
    fi

    # Stop rindexer
    echo "Stopping rindexer for SQL setup..."
    kill $RINDEXER_PID 2>/dev/null || true
    echo "  kill exit code: $?"
    wait $RINDEXER_PID 2>/dev/null || true
    echo "  wait exit code: $?"
    echo "  Rindexer stopped. Sleeping 2s..."
    sleep 2

    # Run SQL setup (creates materialized table + triggers for existing event tables)
    echo "Checking for SQL file: ${SCRIPT_DIR}/sql/create-agreement-current-state.sql"
    ls -la "${SCRIPT_DIR}/sql/" 2>&1 || echo "  Could not list sql directory"
    if [ -f "${SCRIPT_DIR}/sql/create-agreement-current-state.sql" ]; then
        echo "Running create-agreement-current-state.sql..."
        psql "$DATABASE_URL" -f "${SCRIPT_DIR}/sql/create-agreement-current-state.sql" 2>&1
        SQL_EXIT=$?
        echo "  SQL exit code: $SQL_EXIT"
        if [ $SQL_EXIT -eq 0 ]; then
            echo "SQL setup completed successfully!"
        else
            echo "WARNING: SQL setup script had errors (may be OK if some event tables don't exist yet)"
        fi
    else
        echo "ERROR: SQL file not found at ${SCRIPT_DIR}/sql/create-agreement-current-state.sql"
    fi

    # Reset rindexer cursor so it re-processes all blocks with triggers in place
    echo "Resetting rindexer cursor to reprocess events with triggers..."
    psql "$DATABASE_URL" -c "TRUNCATE rindexer_internal.latest_block;" 2>/dev/null || true

    # Restart rindexer for real
    echo ""
    echo "========================================"
    echo "Starting rindexer (with triggers ready)"
    echo "========================================"
    echo ""
    exec /app/rindexer "$@"
fi
