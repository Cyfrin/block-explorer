#!/bin/bash
set -e

# =============================================================================
# BattleChain Full-Stack Smoke Test
# =============================================================================
# Tests the complete flow: Contract Deployment → Event Indexing → API Response
#
# Prerequisites:
#   - Docker and docker-compose installed
#   - cast (foundry) installed for contract interaction
#   - curl and jq installed
#
# Usage:
#   ./scripts/smoke-test-battlechain.sh [--skip-startup] [--skip-cleanup]
#
# Options:
#   --skip-startup   Assume Docker stack is already running
#   --skip-cleanup   Don't stop containers after test
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
RPC_URL="http://localhost:3050"
API_URL="http://localhost:3020"
PRIVATE_KEY="0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110"
ADDRESSES_FILE="/tmp/battlechain-addresses.json"
MAX_WAIT_SECONDS=120
POLL_INTERVAL=2

# Parse arguments
SKIP_STARTUP=false
SKIP_CLEANUP=false
for arg in "$@"; do
  case $arg in
    --skip-startup) SKIP_STARTUP=true ;;
    --skip-cleanup) SKIP_CLEANUP=true ;;
  esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

assert() {
  local description="$1"
  local condition="$2"

  if eval "$condition"; then
    log_success "$description"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "$description"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# =============================================================================
# Setup Functions
# =============================================================================

start_docker_stack() {
  log_info "Starting Docker stack..."
  cd "$PROJECT_ROOT"
  CREATE_TEST_AGREEMENT=true docker compose up -d
  log_info "Waiting for services to initialize..."
}

stop_docker_stack() {
  log_info "Stopping Docker stack..."
  cd "$PROJECT_ROOT"
  docker compose down
}

wait_for_rpc() {
  log_info "Waiting for zkSync RPC to be ready..."
  local elapsed=0

  while [ $elapsed -lt $MAX_WAIT_SECONDS ]; do
    if curl -s -X POST "$RPC_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null | grep -q result; then
      log_success "zkSync RPC is ready"
      return 0
    fi
    sleep $POLL_INTERVAL
    elapsed=$((elapsed + POLL_INTERVAL))
    echo -n "."
  done
  echo ""
  log_error "zkSync RPC not ready after ${MAX_WAIT_SECONDS}s"
  return 1
}

wait_for_api() {
  log_info "Waiting for API to be ready..."
  local elapsed=0

  while [ $elapsed -lt $MAX_WAIT_SECONDS ]; do
    if curl -s "$API_URL/health" 2>/dev/null | grep -q "ok\|OK"; then
      log_success "API is ready"
      return 0
    fi
    sleep $POLL_INTERVAL
    elapsed=$((elapsed + POLL_INTERVAL))
    echo -n "."
  done
  echo ""
  log_error "API not ready after ${MAX_WAIT_SECONDS}s"
  return 1
}

wait_for_deployer() {
  log_info "Waiting for battlechain-deployer to complete..."
  local elapsed=0

  while [ $elapsed -lt $MAX_WAIT_SECONDS ]; do
    # Use native docker ps to get container status (works for exited containers)
    local status_line=$(docker ps -a --filter "name=battlechain-deployer" --format "{{.Status}}" 2>/dev/null || echo "")

    if echo "$status_line" | grep -q "Exited"; then
      # Extract exit code from status like "Exited (0) 5 seconds ago"
      local exit_code=$(echo "$status_line" | grep -oE '\([0-9]+\)' | tr -d '()')
      if [ "$exit_code" = "0" ]; then
        echo ""
        log_success "battlechain-deployer completed successfully"
        return 0
      else
        echo ""
        log_error "battlechain-deployer exited with code $exit_code"
        docker compose logs battlechain-deployer | tail -20
        return 1
      fi
    fi

    sleep $POLL_INTERVAL
    elapsed=$((elapsed + POLL_INTERVAL))
    echo -n "."
  done
  echo ""
  log_error "battlechain-deployer did not complete after ${MAX_WAIT_SECONDS}s"
  return 1
}

get_addresses() {
  log_info "Extracting deployed contract addresses..."

  # Copy addresses from Docker volume
  docker compose exec -T battlechain-indexer cat /shared/addresses.json > "$ADDRESSES_FILE" 2>/dev/null || \
  docker compose cp battlechain-indexer:/shared/addresses.json "$ADDRESSES_FILE" 2>/dev/null || {
    log_error "Failed to extract addresses.json"
    return 1
  }

  # Parse addresses
  AGREEMENT_FACTORY=$(jq -r '.AGREEMENT_FACTORY_ADDRESS' "$ADDRESSES_FILE")
  ATTACK_REGISTRY=$(jq -r '.ATTACK_REGISTRY_ADDRESS' "$ADDRESSES_FILE")
  SAFE_HARBOR_REGISTRY=$(jq -r '.SAFE_HARBOR_REGISTRY_ADDRESS' "$ADDRESSES_FILE")
  BATTLECHAIN_DEPLOYER=$(jq -r '.BATTLECHAIN_DEPLOYER_ADDRESS' "$ADDRESSES_FILE")
  TEST_AGREEMENT_ADDRESS=$(jq -r '.TEST_AGREEMENT_ADDRESS // empty' "$ADDRESSES_FILE")

  log_info "Contract Addresses:"
  echo "  AGREEMENT_FACTORY:    $AGREEMENT_FACTORY"
  echo "  ATTACK_REGISTRY:      $ATTACK_REGISTRY"
  echo "  SAFE_HARBOR_REGISTRY: $SAFE_HARBOR_REGISTRY"
  echo "  BATTLECHAIN_DEPLOYER: $BATTLECHAIN_DEPLOYER"
  if [ -n "$TEST_AGREEMENT_ADDRESS" ]; then
    echo "  TEST_AGREEMENT:       $TEST_AGREEMENT_ADDRESS"
  fi
}

# =============================================================================
# Test Functions
# =============================================================================

test_contracts_deployed() {
  echo ""
  log_info "=== Test: Contract Deployment ==="

  assert "AGREEMENT_FACTORY has valid address" \
    '[ -n "$AGREEMENT_FACTORY" ] && [ "$AGREEMENT_FACTORY" != "null" ] && [ ${#AGREEMENT_FACTORY} -eq 42 ]'

  assert "ATTACK_REGISTRY has valid address" \
    '[ -n "$ATTACK_REGISTRY" ] && [ "$ATTACK_REGISTRY" != "null" ] && [ ${#ATTACK_REGISTRY} -eq 42 ]'

  assert "SAFE_HARBOR_REGISTRY has valid address" \
    '[ -n "$SAFE_HARBOR_REGISTRY" ] && [ "$SAFE_HARBOR_REGISTRY" != "null" ] && [ ${#SAFE_HARBOR_REGISTRY} -eq 42 ]'

  assert "BATTLECHAIN_DEPLOYER has valid address" \
    '[ -n "$BATTLECHAIN_DEPLOYER" ] && [ "$BATTLECHAIN_DEPLOYER" != "null" ] && [ ${#BATTLECHAIN_DEPLOYER} -eq 42 ]'
}

test_api_health() {
  echo ""
  log_info "=== Test: API Health ==="

  local health_response=$(curl -s "$API_URL/health")
  assert "API health endpoint responds" '[ -n "$health_response" ]'
}

test_agreements_endpoint_empty() {
  echo ""
  log_info "=== Test: Agreements Endpoint (Initially) ==="

  local response=$(curl -s "$API_URL/battlechain/agreements")
  local items_count=$(echo "$response" | jq '.items | length' 2>/dev/null || echo "-1")

  assert "GET /battlechain/agreements returns valid response" '[ "$items_count" != "-1" ]'
  log_info "Current agreements count: $items_count"
}

test_create_agreement() {
  echo ""
  log_info "=== Test: Create Agreement via Contract ==="

  # The AgreementFactory.create() function requires a complex AgreementDetails struct
  # that is difficult to encode via cast. For full agreement creation testing,
  # use a forge script in the contracts repo.
  #
  # This test verifies we can read contract state and the factory is accessible.

  # Get deployer address
  DEPLOYER_ADDRESS=$(cast wallet address "$PRIVATE_KEY")
  log_info "Deployer address: $DEPLOYER_ADDRESS"

  # Verify we can call view functions on the factory
  log_info "Verifying AgreementFactory is accessible..."

  local version=$(cast call --rpc-url "$RPC_URL" "$AGREEMENT_FACTORY" "version()(string)" 2>/dev/null || echo "")

  if [ -n "$version" ]; then
    log_success "AgreementFactory.version() returned: $version"
  else
    log_warn "Could not call version() - factory may need initialization"
  fi

  # Check if factory knows about the registry
  local registry=$(cast call --rpc-url "$RPC_URL" "$AGREEMENT_FACTORY" "getRegistry()(address)" 2>/dev/null || echo "")

  if [ -n "$registry" ] && [ "$registry" != "0x0000000000000000000000000000000000000000" ]; then
    log_success "AgreementFactory.getRegistry() returned: $registry"
    # Compare addresses case-insensitively
    local registry_lower=$(echo "$registry" | tr '[:upper:]' '[:lower:]')
    local expected_lower=$(echo "$SAFE_HARBOR_REGISTRY" | tr '[:upper:]' '[:lower:]')
    if [ "$registry_lower" = "$expected_lower" ]; then
      log_success "Factory registry matches deployed registry"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      log_error "Factory registry doesn't match deployed registry"
      log_info "  Factory.getRegistry(): $registry"
      log_info "  Expected Registry:     $SAFE_HARBOR_REGISTRY"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
  else
    log_warn "Could not get registry - factory may need initialization"
  fi

  # Note: Full agreement creation test requires forge script
  log_info ""
  log_info "NOTE: To create test agreements, use a forge script from the contracts repo:"
  log_info "  cd packages/battlechain-deployer/contracts"
  log_info "  forge script script/CreateTestAgreement.s.sol --rpc-url $RPC_URL --broadcast"
  log_info ""

  AGREEMENT_CREATION_SKIPPED=true
}

test_indexer_running() {
  echo ""
  log_info "=== Test: Indexer Status ==="

  # Check if indexer container is running
  local indexer_status=$(docker compose ps --format json battlechain-indexer 2>/dev/null | jq -r '.State // empty' 2>/dev/null || echo "")

  assert "battlechain-indexer container is running" '[ "$indexer_status" = "running" ]'

  # Check indexer logs for successful startup
  local indexer_logs=$(docker compose logs battlechain-indexer 2>/dev/null | tail -20)

  if echo "$indexer_logs" | grep -q "rindexer\|Starting\|indexing"; then
    log_success "Indexer shows activity in logs"
  else
    log_info "Indexer logs (last 20 lines):"
    echo "$indexer_logs"
  fi

  # Check current agreements count
  local agreements_count=$(curl -s "$API_URL/battlechain/agreements" | jq '.meta.totalItems // 0')
  log_info "Current indexed agreements: $agreements_count"
}

test_agreement_api_response() {
  echo ""
  log_info "=== Test: Agreement API Response ==="

  local response=$(curl -s "$API_URL/battlechain/agreements")
  local items=$(echo "$response" | jq '.items // []')
  local total=$(echo "$response" | jq '.meta.totalItems // 0')

  log_info "Total agreements in API: $total"

  if [ "$total" -gt 0 ]; then
    # Check first agreement has expected fields
    local first_agreement=$(echo "$items" | jq '.[0]')
    local has_address=$(echo "$first_agreement" | jq 'has("agreementAddress")')
    local has_owner=$(echo "$first_agreement" | jq 'has("owner")')

    assert "Agreement has agreementAddress field" '[ "$has_address" = "true" ]'
    assert "Agreement has owner field" '[ "$has_owner" = "true" ]'

    log_info "First agreement:"
    echo "$first_agreement" | jq '{agreementAddress, owner, protocolName, state}'
  else
    log_info "No agreements found - this may be expected depending on contract interface"
  fi

  # Test specific agreement endpoint if we have an address
  if [ -n "$CREATED_AGREEMENT_ADDRESS" ]; then
    log_info "Testing GET /battlechain/agreement/$CREATED_AGREEMENT_ADDRESS"
    local agreement_response=$(curl -s "$API_URL/battlechain/agreement/$CREATED_AGREEMENT_ADDRESS")
    local agreement_addr=$(echo "$agreement_response" | jq -r '.agreementAddress // empty')

    assert "GET /battlechain/agreement/:address returns agreement" \
      '[ -n "$agreement_addr" ] && [ "$agreement_addr" != "null" ]'
  fi
}

test_contract_state_endpoint() {
  echo ""
  log_info "=== Test: Contract State Endpoint ==="

  # Test with a random address (should return NOT_REGISTERED)
  local random_addr="0x0000000000000000000000000000000000001234"
  local response=$(curl -s "$API_URL/battlechain/contract-state/$random_addr")
  local state=$(echo "$response" | jq -r '.state // empty')

  assert "Contract state endpoint returns state field" '[ -n "$state" ]'
  assert "Unknown contract returns NOT_REGISTERED" '[ "$state" = "NOT_REGISTERED" ]'
}

test_agreement_indexed() {
  echo ""
  log_info "=== Test: Agreement Indexing (CREATE_TEST_AGREEMENT=true) ==="

  if [ -z "$TEST_AGREEMENT_ADDRESS" ]; then
    log_info "No test agreement deployed (CREATE_TEST_AGREEMENT not set)"
    return 0
  fi

  log_info "Test agreement address: $TEST_AGREEMENT_ADDRESS"
  log_info "Waiting for indexer to process agreement creation event..."

  # Wait for the agreement to be indexed (up to 30 seconds)
  local elapsed=0
  local max_wait=30
  local indexed=false

  while [ $elapsed -lt $max_wait ]; do
    local response=$(curl -s "$API_URL/battlechain/agreement/$TEST_AGREEMENT_ADDRESS")
    local agreement_addr=$(echo "$response" | jq -r '.agreementAddress // empty')

    if [ -n "$agreement_addr" ] && [ "$agreement_addr" != "null" ]; then
      indexed=true
      break
    fi

    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
  done
  echo ""

  assert "Test agreement indexed within ${max_wait}s" '[ "$indexed" = true ]'

  if [ "$indexed" = true ]; then
    # Verify agreement details — this request triggers lazy RPC fetch
    # because the indexer only captures AgreementCreated (address + owner),
    # and the API fills in the rest via getDetails() RPC call.
    local response=$(curl -s "$API_URL/battlechain/agreement/$TEST_AGREEMENT_ADDRESS")

    local protocol_name=$(echo "$response" | jq -r '.protocolName // empty')
    assert "Agreement has protocolName (RPC-fetched)" '[ -n "$protocol_name" ]'

    if [ -n "$protocol_name" ]; then
      assert "protocolName is SmokeTestProtocol" '[ "$protocol_name" = "SmokeTestProtocol" ]'
    fi

    local owner=$(echo "$response" | jq -r '.owner // empty')
    local expected_owner="0x36615Cf349d7F6344891B1e7CA7C72883F5dc049"
    # Case-insensitive comparison
    local owner_lower=$(echo "$owner" | tr '[:upper:]' '[:lower:]')
    local expected_lower=$(echo "$expected_owner" | tr '[:upper:]' '[:lower:]')
    assert "Agreement has correct owner" '[ "$owner_lower" = "$expected_lower" ]'

    # Verify RPC-fetched fields are populated (not null)
    local bounty_pct=$(echo "$response" | jq -r '.bountyPercentage // empty')
    assert "Agreement has bountyPercentage (RPC-fetched)" '[ -n "$bounty_pct" ]'

    local agreement_uri=$(echo "$response" | jq -r '.agreementUri // empty')
    assert "Agreement has agreementUri (RPC-fetched)" '[ -n "$agreement_uri" ]'

    log_info "Agreement details from API (includes RPC-fetched data):"
    echo "$response" | jq '{agreementAddress, owner, protocolName, state, bountyPercentage, bountyCapUsd, agreementUri}' 2>/dev/null || echo "$response"

    # Second request should use cached data (rpc_fetched_at is set)
    log_info "Verifying second request uses cached data..."
    local response2=$(curl -s "$API_URL/battlechain/agreement/$TEST_AGREEMENT_ADDRESS")
    local protocol_name2=$(echo "$response2" | jq -r '.protocolName // empty')
    assert "Second request returns same protocolName (cached)" '[ "$protocol_name2" = "$protocol_name" ]'
  fi

  # Test agreements list includes our test agreement
  local list_response=$(curl -s "$API_URL/battlechain/agreements")
  local total_items=$(echo "$list_response" | jq '.meta.totalItems // 0')
  assert "Agreements list has at least 1 agreement" '[ "$total_items" -ge 1 ]'

  # Verify agreement appears in list (case-insensitive: deployer uses checksummed, API lowercases)
  local addr_lower=$(echo "$TEST_AGREEMENT_ADDRESS" | tr '[:upper:]' '[:lower:]')
  local found_in_list=$(echo "$list_response" | jq --arg addr "$addr_lower" \
    '.items | map(select(.agreementAddress == $addr)) | length')
  assert "Test agreement appears in agreements list" '[ "$found_in_list" -ge 1 ]'
}

test_commitment_window_indexed() {
  echo ""
  log_info "=== Test: CommitmentWindowExtended Event Indexing ==="

  if [ -z "$TEST_AGREEMENT_ADDRESS" ]; then
    log_info "No test agreement deployed (CREATE_TEST_AGREEMENT not set) — skipping"
    return 0
  fi

  # The deployer (deploy.sh) already calls extendCommitmentWindow on the test
  # agreement with a deadline ~30 days from now. Verify that the indexer picked
  # up the CommitmentWindowExtended event and the API exposes it.

  log_info "Test agreement address: $TEST_AGREEMENT_ADDRESS"
  log_info "Waiting for commitment deadline to be indexed..."

  local elapsed=0
  local max_wait=30
  local indexed=false

  while [ $elapsed -lt $max_wait ]; do
    local response=$(curl -s "$API_URL/battlechain/agreement/$TEST_AGREEMENT_ADDRESS")
    local commitment=$(echo "$response" | jq -r '.commitmentDeadline // empty')

    if [ -n "$commitment" ] && [ "$commitment" != "null" ]; then
      indexed=true
      break
    fi

    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
  done
  echo ""

  assert "CommitmentWindowExtended event indexed within ${max_wait}s" '[ "$indexed" = true ]'

  if [ "$indexed" = true ]; then
    local response=$(curl -s "$API_URL/battlechain/agreement/$TEST_AGREEMENT_ADDRESS")
    local commitment_ms=$(echo "$response" | jq -r '.commitmentDeadline')

    # The API returns commitmentDeadline in milliseconds. The deployer sets it
    # to ~30 days from deploy time. Verify it's a reasonable future timestamp.
    local now_ms=$(( $(date +%s) * 1000 ))
    # Should be at least 7 days in the future (7 * 86400 * 1000 ms)
    local min_future_ms=$(( now_ms + 7 * 86400 * 1000 ))

    assert "commitmentDeadline is a number > 0" '[ "$commitment_ms" -gt 0 ] 2>/dev/null'
    assert "commitmentDeadline is in the future (>7 days from now)" '[ "$commitment_ms" -gt "$min_future_ms" ] 2>/dev/null'

    log_info "commitmentDeadline: $commitment_ms ($(date -r $((commitment_ms / 1000)) 2>/dev/null || echo 'N/A'))"

    # Also verify via RPC that on-chain value matches
    # cast returns values like "1774020182 [1.774e9]" — strip the annotation
    local onchain_deadline=$(cast call --rpc-url "$RPC_URL" "$TEST_AGREEMENT_ADDRESS" \
      "getCantChangeUntil()(uint256)" 2>/dev/null | awk '{print $1}' || echo "")

    if [ -n "$onchain_deadline" ] && [ "$onchain_deadline" != "0" ]; then
      local onchain_ms=$(( onchain_deadline * 1000 ))
      assert "API commitmentDeadline matches on-chain value" '[ "$commitment_ms" = "$onchain_ms" ]'
    else
      log_warn "Could not read getCantChangeUntil() from chain — skipping on-chain comparison"
    fi
  fi
}

test_child_contract_scope() {
  echo ""
  log_info "=== Test: Child Contract Scope Resolution (Factory Pattern) ==="

  if [ -z "$TEST_AGREEMENT_ADDRESS" ]; then
    log_info "No test agreement deployed — skipping"
    return 0
  fi

  # The AgreementFactory was added as an in-scope account with childContractScope=All.
  # The child resolution job detects factory→child relationships by joining the
  # `addresses` and `transactions` tables: when a factory is called, transactions.to
  # = factory, and any contracts created in that tx have creatorTxHash = tx.hash.
  #
  # The worker doesn't sync in local docker, so we seed mock addresses + transactions
  # rows to simulate a factory deploying a child contract.

  log_info "Test agreement:  $TEST_AGREEMENT_ADDRESS"
  log_info "Factory:         $AGREEMENT_FACTORY (in-scope with childContractScope=All)"
  log_info "Expected child:  $BATTLECHAIN_DEPLOYER (deployed by factory)"

  log_info "Seeding mock addresses + transactions data for child resolution test..."
  local factory_hex=$(echo "$AGREEMENT_FACTORY" | sed 's/0x//' | tr '[:upper:]' '[:lower:]')
  local child_hex=$(echo "$BATTLECHAIN_DEPLOYER" | sed 's/0x//' | tr '[:upper:]' '[:lower:]')

  docker compose exec -T postgres psql -U postgres block-explorer -q <<EOSQL
    -- Insert a mock block if none exists yet (worker hasn't synced)
    INSERT INTO blocks (number, hash, "parentHash", "timestamp", nonce, difficulty,
                        "gasLimit", "gasUsed", "baseFeePerGas", "l1TxCount", "l2TxCount",
                        miner, "extraData")
    VALUES (1,
            '\\x0000000000000000000000000000000000000000000000000000000000000001',
            '\\x0000000000000000000000000000000000000000000000000000000000000000',
            '2026-01-01 00:00:00', '0', 0, '0', '0', '0', 0, 0,
            '\\x0000000000000000000000000000000000000000',
            '\\x00')
    ON CONFLICT DO NOTHING;

    -- Insert a mock transaction where the factory was the target (transactions.to = factory)
    INSERT INTO transactions (hash, "blockNumber", "transactionIndex", "from", "to",
                              nonce, data, value, "gasLimit", "gasPrice", "gasUsed",
                              "maxFeePerGas", "maxPriorityFeePerGas", "isL1Originated",
                              fee, "receivedAt", type)
    VALUES (
      '\\x0000000000000000000000000000000000000000000000000000000000000099',
      1,
      0,
      '\\x0000000000000000000000000000000000000001',
      '\\x${factory_hex}',
      0,
      '\\x',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      false,
      '0',
      '2026-01-01 00:00:00',
      0
    )
    ON CONFLICT DO NOTHING;

    -- Insert the child contract address with creatorTxHash pointing to the factory call
    INSERT INTO addresses (address, bytecode, "createdInBlockNumber", "creatorTxHash",
                           "creatorAddress", "isEvmLike")
    VALUES (
      '\\x${child_hex}',
      '\\x00',
      1,
      '\\x0000000000000000000000000000000000000000000000000000000000000099',
      '\\x0000000000000000000000000000000000000001',
      true
    )
    ON CONFLICT DO NOTHING;
EOSQL

  if [ $? -eq 0 ]; then
    log_info "Mock addresses + transactions data seeded successfully"
  else
    log_warn "Failed to seed mock data — child resolution test may fail"
  fi

  # Re-enqueue the agreement for child reindex, since the initial queue entry
  # may have been consumed before the mock data existed.
  docker compose exec -T postgres psql -U postgres block-explorer -q <<EOSQL
    INSERT INTO battlechainindexer_agreement.child_scope_reindex_queue (agreement_address)
    SELECT DISTINCT agreement_address
    FROM battlechainindexer_agreement.agreement_accounts
    WHERE child_contract_scope != 0
    ON CONFLICT DO NOTHING;
EOSQL

  # The child resolution polling job runs every 15 seconds in the API service.
  log_info "Waiting for child contract scope resolution..."

  local elapsed=0
  local max_wait=90
  local resolved=false
  local expected_child_lower=$(echo "$BATTLECHAIN_DEPLOYER" | tr '[:upper:]' '[:lower:]')

  while [ $elapsed -lt $max_wait ]; do
    # Check if the BattleChainDeployer contract appears in covered_contracts
    local response=$(curl -s "$API_URL/battlechain/agreement/$TEST_AGREEMENT_ADDRESS")
    local covered=$(echo "$response" | jq -r '.coveredContracts // [] | .[]' 2>/dev/null)

    if echo "$covered" | tr '[:upper:]' '[:lower:]' | grep -q "$expected_child_lower"; then
      resolved=true
      break
    fi

    sleep 5
    elapsed=$((elapsed + 5))
    echo -n "."
  done
  echo ""

  assert "Child contract resolved into covered_contracts within ${max_wait}s" '[ "$resolved" = true ]'

  if [ "$resolved" = true ]; then
    log_success "BattleChainDeployer ($BATTLECHAIN_DEPLOYER) found in agreement's covered_contracts (factory pattern)"

    # Count total covered contracts
    local covered_count=$(echo "$response" | jq '.coveredContracts | length' 2>/dev/null)
    log_info "Total covered_contracts: $covered_count"

    # Verify the by-contract lookup also works for the child
    local by_contract_response=$(curl -s "$API_URL/battlechain/agreement/by-contract/$BATTLECHAIN_DEPLOYER")
    local has_coverage=$(echo "$by_contract_response" | jq -r '.hasCoverage // false')

    assert "GET /battlechain/agreement/by-contract/:childAddress returns hasCoverage=true" \
      '[ "$has_coverage" = "true" ]'

    local returned_agreement=$(echo "$by_contract_response" | jq -r '.agreements[0].agreementAddress // empty')
    local agreement_lower=$(echo "$TEST_AGREEMENT_ADDRESS" | tr '[:upper:]' '[:lower:]')
    local returned_lower=$(echo "$returned_agreement" | tr '[:upper:]' '[:lower:]')
    assert "by-contract lookup returns the correct parent agreement" \
      '[ "$returned_lower" = "$agreement_lower" ]'
  fi
}

# =============================================================================
# Main
# =============================================================================

main() {
  echo ""
  echo "========================================"
  echo "  BattleChain Full-Stack Smoke Test"
  echo "========================================"
  echo ""

  cd "$PROJECT_ROOT"

  # Setup
  if [ "$SKIP_STARTUP" = false ]; then
    start_docker_stack
  else
    log_info "Skipping Docker startup (--skip-startup)"
  fi

  # Wait for services
  wait_for_rpc || exit 1
  wait_for_deployer || exit 1
  wait_for_api || exit 1

  # Get contract addresses
  get_addresses || exit 1

  # Run tests
  test_contracts_deployed
  test_api_health
  test_agreements_endpoint_empty
  test_create_agreement
  test_indexer_running
  test_agreement_api_response
  test_contract_state_endpoint
  test_agreement_indexed
  test_commitment_window_indexed
  test_child_contract_scope

  # Cleanup
  if [ "$SKIP_CLEANUP" = false ]; then
    echo ""
    read -p "Press Enter to stop Docker stack (or Ctrl+C to keep running)..."
    stop_docker_stack
  else
    log_info "Skipping cleanup (--skip-cleanup)"
  fi

  # Summary
  echo ""
  echo "========================================"
  echo "  Test Summary"
  echo "========================================"
  echo -e "  ${GREEN}Passed:${NC} $TESTS_PASSED"
  echo -e "  ${RED}Failed:${NC} $TESTS_FAILED"
  echo "========================================"
  echo ""

  if [ $TESTS_FAILED -gt 0 ]; then
    exit 1
  fi
}

main "$@"
