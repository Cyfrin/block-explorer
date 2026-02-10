#!/bin/bash
set -e

# BattleChain Indexer Entrypoint
# Waits for deployed contract addresses and generates rindexer config

ADDRESSES_FILE="${ADDRESSES_FILE:-/shared/addresses.json}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-300}"
CONFIG_TEMPLATE="/app/rindexer.yaml.template"
CONFIG_OUTPUT="/app/rindexer.yaml"

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

# Function to run SQL setup scripts after rindexer creates tables
run_sql_setup() {
    echo ""
    echo "========================================"
    echo "Running SQL Setup Scripts"
    echo "========================================"
    echo ""

    # Parse DATABASE_URL to extract components for psql
    # Format: postgres://user:pass@host:port/dbname?options
    local db_url="$DATABASE_URL"

    # Wait for rindexer to create the event tables (needs a few seconds on startup)
    echo "Waiting for rindexer to create event tables..."
    sleep 10

    # Check if the tables we need exist (agreement_created table from AgreementFactory events)
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM battlechainindexer_agreement_factory.agreement_created LIMIT 0" 2>/dev/null; then
            echo "Event tables exist, running setup scripts..."
            break
        fi
        attempt=$((attempt + 1))
        echo "  Waiting for event tables... ($attempt/$max_attempts)"
        sleep 5
    done

    if [ $attempt -ge $max_attempts ]; then
        echo "WARNING: Event tables not found after ${max_attempts} attempts"
        echo "SQL setup scripts may fail - triggers may need manual setup"
    fi

    # Run the agreement_current_state setup script
    if [ -f "/app/sql/create-agreement-current-state.sql" ]; then
        echo "Running create-agreement-current-state.sql..."
        if psql "$DATABASE_URL" -f /app/sql/create-agreement-current-state.sql; then
            echo "SQL setup completed successfully!"
        else
            echo "WARNING: SQL setup script had errors (non-fatal)"
        fi
    else
        echo "WARNING: create-agreement-current-state.sql not found"
    fi

    echo ""
    echo "SQL setup process finished"
}

# Start rindexer with passed arguments
echo "========================================"
echo "Starting rindexer"
echo "========================================"
echo ""

# Run SQL setup in background after a delay (rindexer needs to create tables first)
run_sql_setup &

exec /app/rindexer "$@"
