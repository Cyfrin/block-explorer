#!/bin/bash
set -e

# BattleChain Contract Deployer for zkSync Local Node
# Deploys contracts using forge script with CreateX for deterministic addresses

# Configuration from environment
RPC_URL="${BLOCKCHAIN_RPC_URL:-http://zksync:3050}"
PRIVATE_KEY="${DEPLOYER_PRIVATE_KEY:-0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110}"
CHAIN_ID="${CHAIN_ID:-626}"
OUTPUT_DIR="${OUTPUT_DIR:-/shared}"
SEED_DATA="${SEED_BATTLECHAIN_DATA:-false}"
CONTRACTS_SOURCE="${CONTRACTS_DIR:-/app/contracts}"
CONTRACTS_DIR="/app/contracts-build"

# Confidence pool contracts live in a separate submodule. We default DEPLOY_CONFIDENCE_POOL_FACTORY
# to true so the address is always written into addresses.json — the indexer falls back to the
# null address if the var is missing, but for local dev we want the real deployment.
DEPLOY_CONFIDENCE_POOL_FACTORY="${DEPLOY_CONFIDENCE_POOL_FACTORY:-true}"
POOL_CONTRACTS_SOURCE="${POOL_CONTRACTS_DIR:-/app/confidence-pool-contracts}"
POOL_CONTRACTS_DIR="/app/confidence-pool-contracts-build"

echo "========================================"
echo "BattleChain Contract Deployer"
echo "========================================"
echo "RPC URL: $RPC_URL"
echo "Chain ID: $CHAIN_ID"
echo "Seed Data: $SEED_DATA"
echo "Contracts Source: $CONTRACTS_SOURCE"
echo ""

# Check if contracts directory exists
if [ ! -d "$CONTRACTS_SOURCE/src" ]; then
    echo "ERROR: Contracts not found at $CONTRACTS_SOURCE/src"
    echo ""
    echo "The BattleChain contracts submodule may not be initialized."
    echo "Run: git submodule update --init --recursive"
    exit 1
fi

# Copy contracts to writable location (volume mounts may be read-only)
echo "Copying contracts to build directory..."
rm -rf "$CONTRACTS_DIR"
cp -r "$CONTRACTS_SOURCE" "$CONTRACTS_DIR"

# Copy agreement-contract deployment scripts into the contracts script directory.
# DeployConfidencePool.s.sol is excluded here — it lives in the bc-confidence-pools
# contracts dir, not the agreement-contracts dir, and is copied separately below.
echo "Copying local deployment scripts..."
cp /app/scripts/DeployLocal.s.sol "$CONTRACTS_DIR/script/"
cp /app/scripts/DeployAttackRegistryLocal.s.sol "$CONTRACTS_DIR/script/"
cp /app/scripts/CreateTestAgreement.s.sol "$CONTRACTS_DIR/script/"

# Check if lib directory has content (git submodules may not be initialized in volume)
if [ ! -d "$CONTRACTS_DIR/lib/forge-std/src" ]; then
    echo "Installing Foundry dependencies..."
    cd "$CONTRACTS_DIR"
    forge install --no-git 2>/dev/null || {
        echo "ERROR: Failed to install dependencies. Ensure foundry is installed."
        exit 1
    }
fi

# Wait for RPC to be ready
echo "Waiting for zkSync RPC to be ready..."
max_attempts=60
attempt=0
until curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null | grep -q result; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "ERROR: RPC not ready after $max_attempts attempts"
        exit 1
    fi
    echo "  Attempt $attempt/$max_attempts - RPC not ready, waiting..."
    sleep 2
done
echo "RPC is ready!"
echo ""

# Navigate to contracts directory
cd "$CONTRACTS_DIR"

# Build contracts for zkSync
echo "Building contracts for zkSync..."
forge build --zksync

echo ""
echo "========================================"
echo "Step 1: Deploy Registry and Factory"
echo "========================================"
echo ""

# Deploy Registry and Factory using the local deployment script
# This uses standard CREATE opcode (no CreateX) to avoid zkSync compatibility issues
DEPLOY_OUTPUT=$(forge script script/DeployLocal.s.sol:DeployLocal \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --zksync \
    --legacy \
    -vvv 2>&1) || {
    echo "ERROR: Deploy script failed"
    echo "$DEPLOY_OUTPUT"
    exit 1
}

echo "$DEPLOY_OUTPUT"

# Extract Registry and Factory addresses from output
SAFE_HARBOR_REGISTRY_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "Registry Proxy deployed at:" | awk '{print $NF}')
AGREEMENT_FACTORY_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "AgreementFactory Proxy deployed at:" | awk '{print $NF}')

if [ -z "$SAFE_HARBOR_REGISTRY_ADDRESS" ] || [ -z "$AGREEMENT_FACTORY_ADDRESS" ]; then
    echo ""
    echo "ERROR: Failed to extract Registry/Factory addresses from deploy output"
    exit 1
fi

echo ""
echo "Registry: $SAFE_HARBOR_REGISTRY_ADDRESS"
echo "Factory: $AGREEMENT_FACTORY_ADDRESS"

echo ""
echo "========================================"
echo "Step 2: Deploy AttackRegistry"
echo "========================================"
echo ""

# Deploy AttackRegistry using DeployAttackRegistryLocal.s.sol (no CreateX)
ATTACK_OUTPUT=$(forge script script/DeployAttackRegistryLocal.s.sol:DeployAttackRegistryLocal \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --zksync \
    --legacy \
    --sig "run(address,address)" \
    "$SAFE_HARBOR_REGISTRY_ADDRESS" \
    "$AGREEMENT_FACTORY_ADDRESS" \
    -vvv 2>&1) || {
    echo "ERROR: AttackRegistry deploy script failed"
    echo "$ATTACK_OUTPUT"
    exit 1
}

echo "$ATTACK_OUTPUT"

# Extract AttackRegistry address
ATTACK_REGISTRY_ADDRESS=$(echo "$ATTACK_OUTPUT" | grep "AttackRegistry Proxy deployed at:" | awk '{print $NF}')

if [ -z "$ATTACK_REGISTRY_ADDRESS" ]; then
    echo ""
    echo "ERROR: Failed to extract AttackRegistry address from deploy output"
    exit 1
fi

echo ""
echo "AttackRegistry: $ATTACK_REGISTRY_ADDRESS"

echo ""
echo "========================================"
echo "Step 3: Deploy BattleChainDeployer"
echo "========================================"
echo ""

# BattleChainDeployer uses Solidity 0.8.23 (CreateX compatibility), deploy via forge create
# Note: --broadcast flag is needed for foundry-zksync to actually send the transaction
DEPLOYER_OUTPUT=$(forge create --zksync --legacy --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    src/BattleChainDeployer.sol:BattleChainDeployer \
    --constructor-args "$ATTACK_REGISTRY_ADDRESS" 2>&1)

BATTLECHAIN_DEPLOYER_ADDRESS=$(echo "$DEPLOYER_OUTPUT" | grep -oE "Deployed to: 0x[a-fA-F0-9]{40}" | grep -oE "0x[a-fA-F0-9]{40}" | head -1)
if [ -z "$BATTLECHAIN_DEPLOYER_ADDRESS" ]; then
    echo "ERROR: Failed to deploy BattleChainDeployer"
    echo "$DEPLOYER_OUTPUT"
    exit 1
fi
echo "BattleChainDeployer: $BATTLECHAIN_DEPLOYER_ADDRESS"

echo ""
echo "========================================"
echo "Step 4: Configure AttackRegistry"
echo "========================================"
echo ""

# Set BattleChainDeployer in AttackRegistry
echo "Setting AttackRegistry.battleChainDeployer..."
cast send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" \
    "$ATTACK_REGISTRY_ADDRESS" \
    "setBattleChainDeployer(address)" \
    "$BATTLECHAIN_DEPLOYER_ADDRESS" \
    --legacy >/dev/null 2>&1
echo "Done!"

# Get current block number for BATTLECHAIN_START_BLOCK
BATTLECHAIN_START_BLOCK=$(curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | \
    grep -oE '"result":"0x[a-fA-F0-9]+"' | grep -oE '0x[a-fA-F0-9]+' | xargs printf "%d" 2>/dev/null || echo "0")

# ============================================
# Step 5: Deploy ConfidencePool stack (impl + factory proxy)
# ============================================
# Built from a separate submodule (Cyfrin/bc-confidence-pools) mounted at
# /app/confidence-pool-contracts. Skipped if DEPLOY_CONFIDENCE_POOL_FACTORY=false
# OR if the source directory isn't mounted (graceful degradation when running
# the deployer against a stack without the submodule initialized).
CONFIDENCE_POOL_IMPLEMENTATION=""
CONFIDENCE_POOL_FACTORY_ADDRESS=""

if [ "$DEPLOY_CONFIDENCE_POOL_FACTORY" = "true" ] && [ -d "$POOL_CONTRACTS_SOURCE/src" ]; then
    echo ""
    echo "========================================"
    echo "Step 5: Deploy ConfidencePool stack"
    echo "========================================"
    echo ""

    # Copy to writable build dir (volume mount may be read-only)
    rm -rf "$POOL_CONTRACTS_DIR"
    cp -r "$POOL_CONTRACTS_SOURCE" "$POOL_CONTRACTS_DIR"

    # Copy our deploy script into the pool contracts' script/ dir so it can resolve src/ imports
    cp /app/scripts/DeployConfidencePool.s.sol "$POOL_CONTRACTS_DIR/script/"

    # Install lib deps if missing (mirrors the agreement-contracts path above).
    if [ ! -d "$POOL_CONTRACTS_DIR/lib/forge-std/src" ]; then
        echo "Installing Foundry dependencies for pool contracts..."
        cd "$POOL_CONTRACTS_DIR"
        forge install --no-git 2>/dev/null || {
            echo "ERROR: Failed to install pool contract dependencies."
            exit 1
        }
    fi

    cd "$POOL_CONTRACTS_DIR"

    echo "Building ConfidencePool contracts for zkSync..."
    forge build --zksync || {
        echo "ERROR: forge build failed for ConfidencePool contracts"
        exit 1
    }

    # Run the deploy script. SAFE_HARBOR_REGISTRY_ADDRESS is read via vm.envAddress.
    POOL_DEPLOY_OUTPUT=$(SAFE_HARBOR_REGISTRY_ADDRESS="$SAFE_HARBOR_REGISTRY_ADDRESS" \
        forge script script/DeployConfidencePool.s.sol:DeployConfidencePool \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        --zksync \
        --legacy \
        -vvv 2>&1) || {
        echo "ERROR: ConfidencePool deploy script failed"
        echo "$POOL_DEPLOY_OUTPUT"
        exit 1
    }

    echo "$POOL_DEPLOY_OUTPUT"

    CONFIDENCE_POOL_IMPLEMENTATION=$(echo "$POOL_DEPLOY_OUTPUT" | grep "ConfidencePool implementation deployed at:" | awk '{print $NF}')
    CONFIDENCE_POOL_FACTORY_ADDRESS=$(echo "$POOL_DEPLOY_OUTPUT" | grep "ConfidencePoolFactory proxy deployed at:" | awk '{print $NF}')

    if [ -z "$CONFIDENCE_POOL_FACTORY_ADDRESS" ]; then
        echo "ERROR: Failed to extract ConfidencePool factory address from deploy output"
        exit 1
    fi

    echo ""
    echo "ConfidencePool implementation: $CONFIDENCE_POOL_IMPLEMENTATION"
    echo "ConfidencePoolFactory proxy:   $CONFIDENCE_POOL_FACTORY_ADDRESS"
elif [ "$DEPLOY_CONFIDENCE_POOL_FACTORY" = "true" ]; then
    echo ""
    echo "WARNING: DEPLOY_CONFIDENCE_POOL_FACTORY=true but $POOL_CONTRACTS_SOURCE not found."
    echo "         Skipping ConfidencePool deployment. Run 'git submodule update --init --recursive' on the host."
    echo ""
fi

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Contract Addresses:"
echo "  SAFE_HARBOR_REGISTRY_ADDRESS: $SAFE_HARBOR_REGISTRY_ADDRESS"
echo "  AGREEMENT_FACTORY_ADDRESS:          $AGREEMENT_FACTORY_ADDRESS"
echo "  ATTACK_REGISTRY_ADDRESS:            $ATTACK_REGISTRY_ADDRESS"
echo "  BATTLECHAIN_DEPLOYER_ADDRESS:       $BATTLECHAIN_DEPLOYER_ADDRESS"
echo "  CONFIDENCE_POOL_FACTORY_ADDRESS:    ${CONFIDENCE_POOL_FACTORY_ADDRESS:-<not deployed>}"
echo "  CONFIDENCE_POOL_IMPLEMENTATION:     ${CONFIDENCE_POOL_IMPLEMENTATION:-<not deployed>}"
echo "  BATTLECHAIN_START_BLOCK:            $BATTLECHAIN_START_BLOCK"
echo ""

# Write addresses to shared volume
mkdir -p "$OUTPUT_DIR"

# Build the JSON. We use jq to produce a clean object so we can conditionally
# include the confidence pool fields (omitting them rather than emitting empty
# strings would make the indexer's load_addresses() see "empty" and fall back
# to the null-address path, which is what we want when the deploy was skipped).
jq -n \
    --arg safeHarbor "$SAFE_HARBOR_REGISTRY_ADDRESS" \
    --arg agreementFactory "$AGREEMENT_FACTORY_ADDRESS" \
    --arg attackRegistry "$ATTACK_REGISTRY_ADDRESS" \
    --arg battleChainDeployer "$BATTLECHAIN_DEPLOYER_ADDRESS" \
    --arg poolFactory "$CONFIDENCE_POOL_FACTORY_ADDRESS" \
    --arg poolImpl "$CONFIDENCE_POOL_IMPLEMENTATION" \
    --arg startBlock "$BATTLECHAIN_START_BLOCK" \
    --arg chainId "$CHAIN_ID" \
    --arg deployedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
        SAFE_HARBOR_REGISTRY_ADDRESS: $safeHarbor,
        AGREEMENT_FACTORY_ADDRESS: $agreementFactory,
        ATTACK_REGISTRY_ADDRESS: $attackRegistry,
        BATTLECHAIN_DEPLOYER_ADDRESS: $battleChainDeployer,
        BATTLECHAIN_START_BLOCK: $startBlock,
        CHAIN_ID: $chainId,
        DEPLOYED_AT: $deployedAt
    }
    + (if $poolFactory != "" then {CONFIDENCE_POOL_FACTORY_ADDRESS: $poolFactory} else {} end)
    + (if $poolImpl != "" then {CONFIDENCE_POOL_IMPLEMENTATION: $poolImpl} else {} end)' \
    > "$OUTPUT_DIR/addresses.json"

# Shell-sourceable format
cat > "$OUTPUT_DIR/addresses.env" << EOF
SAFE_HARBOR_REGISTRY_ADDRESS=$SAFE_HARBOR_REGISTRY_ADDRESS
AGREEMENT_FACTORY_ADDRESS=$AGREEMENT_FACTORY_ADDRESS
ATTACK_REGISTRY_ADDRESS=$ATTACK_REGISTRY_ADDRESS
BATTLECHAIN_DEPLOYER_ADDRESS=$BATTLECHAIN_DEPLOYER_ADDRESS
BATTLECHAIN_START_BLOCK=$BATTLECHAIN_START_BLOCK
CHAIN_ID=$CHAIN_ID
EOF
if [ -n "$CONFIDENCE_POOL_FACTORY_ADDRESS" ]; then
    echo "CONFIDENCE_POOL_FACTORY_ADDRESS=$CONFIDENCE_POOL_FACTORY_ADDRESS" >> "$OUTPUT_DIR/addresses.env"
fi
if [ -n "$CONFIDENCE_POOL_IMPLEMENTATION" ]; then
    echo "CONFIDENCE_POOL_IMPLEMENTATION=$CONFIDENCE_POOL_IMPLEMENTATION" >> "$OUTPUT_DIR/addresses.env"
fi

echo "Addresses written to:"
echo "  $OUTPUT_DIR/addresses.json"
echo "  $OUTPUT_DIR/addresses.env"
echo ""

# Optional: Create test agreement for smoke testing
CREATE_TEST_AGREEMENT="${CREATE_TEST_AGREEMENT:-false}"
if [ "$CREATE_TEST_AGREEMENT" = "true" ]; then
    echo "========================================"
    echo "Creating Test Agreement"
    echo "========================================"
    echo ""

    # Wait for the indexer to be ready and discover the factory.
    # The rindexer needs time to:
    # 1. Start up and read the addresses file
    # 2. Index the AgreementCreated event when we create an agreement
    # 3. Discover the agreement address and start indexing its events
    #
    # To ensure events emitted from the Agreement contract are indexed,
    # we wait for the indexer to be fully synced before creating the agreement.
    INDEXER_URL="${INDEXER_HEALTHCHECK_URL:-http://battlechain-indexer:3001/health}"
    echo "Waiting for indexer to be ready..."

    # Give the indexer time to start and sync
    sleep 30

    # Additional wait to ensure indexer has processed all initial events
    # and is in "live" mode waiting for new blocks
    attempt=0
    max_attempts=30
    while [ $attempt -lt $max_attempts ]; do
        # Check if indexer is responsive (health endpoint may not exist, so we just wait)
        # The key is that the indexer needs to be synced to the current block
        current_block=$(curl -s -X POST "$RPC_URL" \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | \
            grep -oE '"result":"0x[a-fA-F0-9]+"' | grep -oE '0x[a-fA-F0-9]+' | xargs printf "%d" 2>/dev/null || echo "0")

        if [ "$current_block" -gt 0 ]; then
            echo "Blockchain at block $current_block, indexer should be synced"
            break
        fi

        attempt=$((attempt + 1))
        echo "  Waiting for indexer sync... ($attempt/$max_attempts)"
        sleep 2
    done

    echo "Creating test agreement..."

    # Restore the agreement contracts cwd — Step 5 (ConfidencePool deploy) may have
    # changed cwd to $POOL_CONTRACTS_DIR, which doesn't contain CreateTestAgreement.s.sol.
    cd "$CONTRACTS_DIR"

    AGREEMENT_OUTPUT=$(forge script script/CreateTestAgreement.s.sol:CreateTestAgreement \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        --zksync \
        --legacy \
        --sig "run(address)" \
        "$AGREEMENT_FACTORY_ADDRESS" \
        -vvv 2>&1) || {
        echo "ERROR: CreateTestAgreement script failed"
        echo "$AGREEMENT_OUTPUT"
        exit 1
    }

    echo "$AGREEMENT_OUTPUT"

    # Extract agreement address
    TEST_AGREEMENT_ADDRESS=$(echo "$AGREEMENT_OUTPUT" | grep "Agreement created at:" | awk '{print $NF}')

    if [ -n "$TEST_AGREEMENT_ADDRESS" ]; then
        echo ""
        echo "Test Agreement: $TEST_AGREEMENT_ADDRESS"

        # Add to addresses.json
        TMP_JSON=$(mktemp)
        jq --arg addr "$TEST_AGREEMENT_ADDRESS" '. + {"TEST_AGREEMENT_ADDRESS": $addr}' "$OUTPUT_DIR/addresses.json" > "$TMP_JSON"
        mv "$TMP_JSON" "$OUTPUT_DIR/addresses.json"

        # Add to addresses.env
        echo "TEST_AGREEMENT_ADDRESS=$TEST_AGREEMENT_ADDRESS" >> "$OUTPUT_DIR/addresses.env"

        # Post-creation calls via cast send (separate transactions).
        # zkSync local node can't read state from contracts deployed in the same block,
        # so these must be in different blocks from the create() call above.

        # Call addOrSetChains to emit ChainAddedOrSet with tuple[] accounts.
        # Done BEFORE extendCommitmentWindow so we're not in commitment window yet.
        echo ""
        echo "Adding chain via addOrSetChains (tuple[] JSONB test)..."
        cast send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --legacy \
            "$TEST_AGREEMENT_ADDRESS" \
            "addOrSetChains((string,(string,uint8)[],string)[])" \
            "[(\"0x36615Cf349d7F6344891B1e7CA7C72883F5dc049\",[(\"0xABCDEF0123456789ABCDEF0123456789ABCDEF01\",1),(\"0x9876543210987654321098765432109876543210\",2)],\"eip155:626\")]" \
            >/dev/null 2>&1 && echo "ChainAddedOrSet event emitted (2 accounts)" || echo "WARNING: addOrSetChains failed (non-critical)"

        # --- Child Contract Scope Test Setup ---
        # Add the AgreementFactory as an in-scope account with childContractScope=All (2)
        # on the LOCAL chain so the child resolution polling job can be tested.
        # The factory deploys agreement contracts via CREATE — the system ContractDeployer
        # emits a ContractDeployed event with the factory as deployerAddress (topics[1]).
        # The child resolution job queries the logs table for these events.
        echo ""
        echo "Adding AgreementFactory ($AGREEMENT_FACTORY_ADDRESS) with childContractScope=All on local chain..."
        cast send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --legacy \
            "$TEST_AGREEMENT_ADDRESS" \
            "addOrSetChains((string,(string,uint8)[],string)[])" \
            "[(\"0x0000000000000000000000000000000000000000\",[(\"$AGREEMENT_FACTORY_ADDRESS\",2)],\"eip155:626\")]" \
            && echo "AgreementFactory added with childContractScope=All" || echo "WARNING: addOrSetChains (child scope) failed"

        # Extend commitment window to 30 days
        echo "Extending commitment window..."
        COMMITMENT_END=$(($(date +%s) + 2592000))
        cast send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --legacy \
            "$TEST_AGREEMENT_ADDRESS" \
            "extendCommitmentWindow(uint256)" \
            "$COMMITMENT_END" \
            >/dev/null 2>&1 && echo "Commitment window extended" || echo "WARNING: extendCommitmentWindow failed"
    fi
fi

# ============================================
# Step 7: Create test ConfidencePool (gated on CREATE_TEST_CONFIDENCE_POOL=true)
# ============================================
# Requires:
#   - A deployed ConfidencePoolFactory (Step 5)
#   - A deployed test agreement that the deployer's key owns (CREATE_TEST_AGREEMENT=true)
#   - A stake token that's allowlisted on the factory (we deploy a MockERC20 here)
#
# Deploys MockERC20 -> allowlists it -> creates a pool bound to the test agreement with
# the test agreement's BattleChain-scope account address as the pool's single scope account.
# The resulting test pool exercises the indexer's PoolCreated trigger end-to-end and
# verifies the address[]::TEXT[] cast against real rindexer output (the smoke test
# asserts scope_accounts is populated on the materialized state row).
CREATE_TEST_CONFIDENCE_POOL="${CREATE_TEST_CONFIDENCE_POOL:-false}"
TEST_STAKE_TOKEN_ADDRESS=""
TEST_CONFIDENCE_POOL_ADDRESS=""

if [ "$CREATE_TEST_CONFIDENCE_POOL" = "true" ] && [ -n "$CONFIDENCE_POOL_FACTORY_ADDRESS" ] && [ -n "$TEST_AGREEMENT_ADDRESS" ]; then
    echo ""
    echo "========================================"
    echo "Step 7: Create Test ConfidencePool"
    echo "========================================"
    echo ""

    # The test agreement's BattleChain scope contains 0x1234...7890 (set by CreateTestAgreement.s.sol).
    # We use that as the pool's scope account so initialize()'s isContractInScope check passes.
    TEST_SCOPE_ACCOUNT="0x1234567890123456789012345678901234567890"

    cd "$POOL_CONTRACTS_DIR"

    # Deploy MockERC20 from the pool contracts' test/mocks dir
    echo "Deploying MockERC20 stake token..."
    MOCK_TOKEN_OUTPUT=$(forge create --zksync --legacy --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        test/mocks/MockERC20.sol:MockERC20 2>&1)

    TEST_STAKE_TOKEN_ADDRESS=$(echo "$MOCK_TOKEN_OUTPUT" | grep -oE "Deployed to: 0x[a-fA-F0-9]{40}" | grep -oE "0x[a-fA-F0-9]{40}" | head -1)
    if [ -z "$TEST_STAKE_TOKEN_ADDRESS" ]; then
        echo "ERROR: Failed to deploy MockERC20"
        echo "$MOCK_TOKEN_OUTPUT"
        exit 1
    fi
    echo "MockERC20 deployed at: $TEST_STAKE_TOKEN_ADDRESS"

    # Allowlist the stake token on the factory
    echo "Allowlisting MockERC20 on factory..."
    cast send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --legacy \
        "$CONFIDENCE_POOL_FACTORY_ADDRESS" \
        "setStakeTokenAllowed(address,bool)" \
        "$TEST_STAKE_TOKEN_ADDRESS" \
        "true" \
        >/dev/null 2>&1 && echo "Allowlisted" || { echo "ERROR: setStakeTokenAllowed failed"; exit 1; }

    # Create pool: expiry = now + 31 days (factory enforces 30-day min lead),
    # minStake = 1 wei, recovery = deployer, accounts = [test scope account].
    POOL_EXPIRY=$(($(date +%s) + 2678400))  # 31 days in seconds
    DEPLOYER_OWNER="0x36615Cf349d7F6344891B1e7CA7C72883F5dc049"

    echo "Creating ConfidencePool (agreement=$TEST_AGREEMENT_ADDRESS, expiry=$POOL_EXPIRY)..."
    CREATE_POOL_TX=$(cast send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --legacy \
        --json \
        "$CONFIDENCE_POOL_FACTORY_ADDRESS" \
        "createPool(address,address,uint256,uint256,address,address[])" \
        "$TEST_AGREEMENT_ADDRESS" \
        "$TEST_STAKE_TOKEN_ADDRESS" \
        "$POOL_EXPIRY" \
        "1" \
        "$DEPLOYER_OWNER" \
        "[$TEST_SCOPE_ACCOUNT]" 2>&1) || {
        echo "ERROR: createPool failed"
        echo "$CREATE_POOL_TX"
        exit 1
    }

    # Read the pool address back from the factory's getPoolsByAgreement (index 0).
    # Cleaner than parsing the PoolCreated event from the tx receipt — same result either way.
    POOLS_RAW=$(cast call --rpc-url "$RPC_URL" \
        "$CONFIDENCE_POOL_FACTORY_ADDRESS" \
        "getPoolsByAgreement(address)(address[])" \
        "$TEST_AGREEMENT_ADDRESS" 2>&1)
    # Output format: "[0xPOOL_ADDR]"
    TEST_CONFIDENCE_POOL_ADDRESS=$(echo "$POOLS_RAW" | grep -oE "0x[a-fA-F0-9]{40}" | head -1)

    if [ -z "$TEST_CONFIDENCE_POOL_ADDRESS" ]; then
        echo "ERROR: Failed to read created pool address from factory"
        echo "Raw output: $POOLS_RAW"
        exit 1
    fi

    echo "Test ConfidencePool deployed at: $TEST_CONFIDENCE_POOL_ADDRESS"

    # Append to addresses.json/env so the smoke test and any tooling can find them.
    TMP_JSON=$(mktemp)
    jq --arg pool "$TEST_CONFIDENCE_POOL_ADDRESS" \
       --arg token "$TEST_STAKE_TOKEN_ADDRESS" \
       '. + {"TEST_CONFIDENCE_POOL_ADDRESS": $pool, "TEST_STAKE_TOKEN_ADDRESS": $token}' \
       "$OUTPUT_DIR/addresses.json" > "$TMP_JSON"
    mv "$TMP_JSON" "$OUTPUT_DIR/addresses.json"

    echo "TEST_CONFIDENCE_POOL_ADDRESS=$TEST_CONFIDENCE_POOL_ADDRESS" >> "$OUTPUT_DIR/addresses.env"
    echo "TEST_STAKE_TOKEN_ADDRESS=$TEST_STAKE_TOKEN_ADDRESS" >> "$OUTPUT_DIR/addresses.env"
elif [ "$CREATE_TEST_CONFIDENCE_POOL" = "true" ]; then
    echo ""
    echo "WARNING: CREATE_TEST_CONFIDENCE_POOL=true but prerequisites missing:"
    echo "  CONFIDENCE_POOL_FACTORY_ADDRESS: ${CONFIDENCE_POOL_FACTORY_ADDRESS:-<unset>}"
    echo "  TEST_AGREEMENT_ADDRESS: ${TEST_AGREEMENT_ADDRESS:-<unset>}"
    echo "  Set CREATE_TEST_AGREEMENT=true and DEPLOY_CONFIDENCE_POOL_FACTORY=true."
    echo ""
fi

# Optional: Seed test data
if [ "$SEED_DATA" = "true" ]; then
    echo "========================================"
    echo "Seeding Test Data"
    echo "========================================"
    if [ -f "/app/seed-data.sh" ]; then
        /app/seed-data.sh "$RPC_URL" "$PRIVATE_KEY" \
            "$AGREEMENT_FACTORY_ADDRESS" \
            "$ATTACK_REGISTRY_ADDRESS" \
            "$BATTLECHAIN_DEPLOYER_ADDRESS"
    else
        echo "WARNING: seed-data.sh not found, skipping seeding"
    fi
fi

echo ""
echo "Deployment complete! Exiting in 5 seconds..."
sleep 5
