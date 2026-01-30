#!/bin/bash
# Battlechain Development Seeding Script
# Seeds test data for various battlechain UI states into the local database

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/seed-battlechain-dev.sql"

echo "Seeding battlechain development data..."
docker exec -i block-explorer-postgres-1 psql -U postgres -d block-explorer < "$SQL_FILE"
echo ""
echo "Done! You can now view the test contracts at:"
echo ""
echo "  Safe Harbor tab HIDDEN (pre-requestUnderAttack):"
echo "  http://localhost:3010/address/0x0000000000000000000000000000000000000001  (NOT_REGISTERED)"
echo "  http://localhost:3010/address/0x0000000000000000000000000000000000000002  (NEW_DEPLOYMENT 'Registered', no agreement)"
echo "  http://localhost:3010/address/0x0000000000000000000000000000000000000003  (NEW_DEPLOYMENT 'Registered' + agreement)"
echo ""
echo "  Safe Harbor tab VISIBLE (post-requestUnderAttack):"
echo "  http://localhost:3010/address/0x0000000000000000000000000000000000000004  (ATTACK_REQUESTED 'Warming Up' + agreement)"
echo "  http://localhost:3010/address/0x0000000000000000000000000000000000000005  (UNDER_ATTACK 'Attackable' + agreement)"
echo "  http://localhost:3010/address/0x0000000000000000000000000000000000000006  (PROMOTION_REQUESTED 'Promotion Pending' + agreement)"
echo "  http://localhost:3010/address/0x0000000000000000000000000000000000000007  (PRODUCTION, was attacked + agreement)"
echo "  http://localhost:3010/address/0x0000000000000000000000000000000000000008  (PRODUCTION, skipped attack + agreement)"
echo "  http://localhost:3010/address/0x0000000000000000000000000000000000000009  (CORRUPTED 'Compromised' + agreement)"
