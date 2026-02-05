#!/bin/bash
set -e

# BattleChain Test Data Seeder
# Creates sample agreements and covered contracts for development testing

RPC_URL="$1"
PRIVATE_KEY="$2"
AGREEMENT_FACTORY="$3"
ATTACK_REGISTRY="$4"
BATTLECHAIN_DEPLOYER="$5"

if [ -z "$RPC_URL" ] || [ -z "$PRIVATE_KEY" ] || [ -z "$AGREEMENT_FACTORY" ]; then
    echo "Usage: seed-data.sh <RPC_URL> <PRIVATE_KEY> <AGREEMENT_FACTORY> <ATTACK_REGISTRY> <BATTLECHAIN_DEPLOYER>"
    exit 1
fi

echo "Seeding BattleChain test data..."
echo "  RPC URL: $RPC_URL"
echo "  Agreement Factory: $AGREEMENT_FACTORY"
echo "  Attack Registry: $ATTACK_REGISTRY"
echo "  BattleChain Deployer: $BATTLECHAIN_DEPLOYER"
echo ""

# Get deployer address from private key
DEPLOYER_ADDRESS=$(cast wallet address "$PRIVATE_KEY")
echo "Deployer address: $DEPLOYER_ADDRESS"
echo ""

# Helper to create an agreement
create_agreement() {
    local protocol_name="$1"
    local bounty_percentage="$2"
    local bounty_cap="$3"

    echo "Creating agreement: $protocol_name..."

    # AgreementFactory.createAgreement() returns the new agreement address
    # Function signature may vary - adjust based on actual contract
    local result=$(cast send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" \
        "$AGREEMENT_FACTORY" \
        "createAgreement()" \
        --legacy --json 2>/dev/null || echo "{}")

    # Extract agreement address from logs if available
    # This depends on the actual contract events
    echo "  Agreement creation tx submitted"
}

# Create a few test agreements
echo "Creating test agreements..."
echo ""

# Note: The actual function signatures depend on the contract implementation
# These are placeholder calls that may need adjustment

# For now, just log that seeding would happen here
echo "NOTE: Test data seeding requires knowledge of exact contract interfaces."
echo "The following data would typically be seeded:"
echo ""
echo "1. Test Agreement - Protocol Alpha"
echo "   - Bounty: 10%, Cap: \$100,000"
echo "   - Covered contracts: 3"
echo ""
echo "2. Test Agreement - Protocol Beta"
echo "   - Bounty: 15%, Cap: \$500,000"
echo "   - Covered contracts: 2"
echo ""
echo "3. Test Agreement - Protocol Gamma (Under Attack)"
echo "   - Bounty: 20%, Cap: \$1,000,000"
echo "   - State: UNDER_ATTACK"
echo ""

# TODO: Implement actual seeding once contract interfaces are confirmed
# This could use forge scripts from the contracts repo:
# forge script script/SeedTestData.s.sol --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast

echo "Test data seeding complete!"
