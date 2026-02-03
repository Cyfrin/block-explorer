-- Battlechain Development Seeding Script
-- This script populates test data for various battlechain UI states
--
-- Contract State Values (from AttackRegistry.sol):
--   0 = NOT_DEPLOYED (contract not deployed via BattleChainDeployer)
--   1 = NEW_DEPLOYMENT (just deployed, display: "Registered")
--   2 = ATTACK_REQUESTED (waiting DAO approval, display: "Warming Up")
--   3 = UNDER_ATTACK (open for ethical hacking, display: "Attackable")
--   4 = PROMOTION_REQUESTED (owner requested promotion, 3-day delay, display: "Promotion Pending")
--   5 = PRODUCTION (protected, display: "Production")
--   6 = CORRUPTED (marked corrupted after successful attack, display: "Compromised")
--
-- Test Contracts:
-- Safe Harbor tab HIDDEN (pre-requestUnderAttack):
-- 0x...0001: NOT_REGISTERED (no state events), no agreement
-- 0x...0002: NEW_DEPLOYMENT, no agreement (shows ContractNewDeployment prompt)
-- 0x...0003: NEW_DEPLOYMENT, has agreement (shows ContractNewDeployment prompt)
--
-- Safe Harbor tab VISIBLE (post-requestUnderAttack):
-- 0x...0004: ATTACK_REQUESTED ("Warming Up"), has agreement
-- 0x...0005: UNDER_ATTACK ("Attackable"), has agreement
-- 0x...0006: PROMOTION_REQUESTED ("Promotion Pending"), has agreement
-- 0x...0007: PRODUCTION (was under attack), has agreement
-- 0x...0008: PRODUCTION (no attack history - used goToProduction), has agreement
-- 0x...0009: CORRUPTED ("Compromised"), has agreement

-- ============================================
-- 1. Insert contract addresses into addresses table
-- ============================================
INSERT INTO addresses (address, bytecode) VALUES
  ('\x0000000000000000000000000000000000000001', '\x00'),
  ('\x0000000000000000000000000000000000000002', '\x00'),
  ('\x0000000000000000000000000000000000000003', '\x00'),
  ('\x0000000000000000000000000000000000000004', '\x00'),
  ('\x0000000000000000000000000000000000000005', '\x00'),
  ('\x0000000000000000000000000000000000000006', '\x00'),
  ('\x0000000000000000000000000000000000000007', '\x00'),
  ('\x0000000000000000000000000000000000000008', '\x00'),
  ('\x0000000000000000000000000000000000000009', '\x00')
ON CONFLICT (address) DO UPDATE SET bytecode = EXCLUDED.bytecode;

-- ============================================
-- 2. Insert agreement state changes (for agreement addresses)
-- ============================================
-- Note: This table tracks state changes indexed by AGREEMENT address (not contract address)
-- The API queries this table to get state info for agreements

-- Create the table if it doesn't exist (normally created by rindexer)
CREATE TABLE IF NOT EXISTS battlechainindexer_attack_registry.agreement_state_changed (
  rindexer_id INT PRIMARY KEY,
  agreement_address CHAR(42),
  new_state SMALLINT,
  tx_hash CHAR(66) NOT NULL,
  block_number NUMERIC NOT NULL,
  log_index VARCHAR(78) NOT NULL,
  block_timestamp TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agreement_state_changed_address
  ON battlechainindexer_attack_registry.agreement_state_changed(agreement_address);

-- Clear existing seed data
DELETE FROM battlechainindexer_attack_registry.agreement_state_changed
WHERE agreement_address IN (
  '0xaaaa000000000000000000000000000000000003',
  '0xaaaa000000000000000000000000000000000004',
  '0xaaaa000000000000000000000000000000000005',
  '0xaaaa000000000000000000000000000000000006',
  '0xaaaa000000000000000000000000000000000007',
  '0xaaaa000000000000000000000000000000000008',
  '0xaaaa000000000000000000000000000000000009'
);

-- Reset the sequence for rindexer_id to avoid conflicts
-- (We'll use explicit IDs starting from 1000 to avoid conflicts with real indexed data)

-- 0xaaaa...0003: NEW_DEPLOYMENT only
INSERT INTO battlechainindexer_attack_registry.agreement_state_changed
  (rindexer_id, agreement_address, new_state, tx_hash, block_number, log_index, block_timestamp)
VALUES
  (1003, '0xaaaa000000000000000000000000000000000003', 1, '0x' || repeat('c', 64), 101, '0', NOW() - INTERVAL '6 days');

-- 0xaaaa...0004: NEW_DEPLOYMENT -> ATTACK_REQUESTED ("Warming Up")
-- The tx_hash for ATTACK_REQUESTED (state=2) will be shown as "View transaction" link
INSERT INTO battlechainindexer_attack_registry.agreement_state_changed
  (rindexer_id, agreement_address, new_state, tx_hash, block_number, log_index, block_timestamp)
VALUES
  (1004, '0xaaaa000000000000000000000000000000000004', 1, '0x' || repeat('e', 64), 102, '0', NOW() - INTERVAL '5 days'),
  (1005, '0xaaaa000000000000000000000000000000000004', 2, '0xabcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab', 103, '0', NOW() - INTERVAL '4 days');

-- 0xaaaa...0005: NEW_DEPLOYMENT -> ATTACK_REQUESTED -> UNDER_ATTACK ("Attackable")
INSERT INTO battlechainindexer_attack_registry.agreement_state_changed
  (rindexer_id, agreement_address, new_state, tx_hash, block_number, log_index, block_timestamp)
VALUES
  (1006, '0xaaaa000000000000000000000000000000000005', 1, '0x' || repeat('3', 64), 104, '0', NOW() - INTERVAL '10 days'),
  (1007, '0xaaaa000000000000000000000000000000000005', 2, '0x' || repeat('5', 64), 105, '0', NOW() - INTERVAL '8 days'),
  (1008, '0xaaaa000000000000000000000000000000000005', 3, '0x5' || repeat('0', 63), 106, '0', NOW() - INTERVAL '3 days');

-- 0xaaaa...0006: NEW_DEPLOYMENT -> ATTACK_REQUESTED -> UNDER_ATTACK -> PROMOTION_REQUESTED ("Promotion Pending")
INSERT INTO battlechainindexer_attack_registry.agreement_state_changed
  (rindexer_id, agreement_address, new_state, tx_hash, block_number, log_index, block_timestamp)
VALUES
  (1009, '0xaaaa000000000000000000000000000000000006', 1, '0x' || repeat('7', 64), 107, '0', NOW() - INTERVAL '20 days'),
  (1010, '0xaaaa000000000000000000000000000000000006', 2, '0x' || repeat('9', 64), 108, '0', NOW() - INTERVAL '18 days'),
  (1011, '0xaaaa000000000000000000000000000000000006', 3, '0x91' || repeat('0', 62), 109, '0', NOW() - INTERVAL '10 days'),
  (1012, '0xaaaa000000000000000000000000000000000006', 4, '0x' || repeat('b', 64), 110, '0', NOW() - INTERVAL '2 days');

-- 0xaaaa...0007: Full lifecycle -> PRODUCTION (was under attack)
INSERT INTO battlechainindexer_attack_registry.agreement_state_changed
  (rindexer_id, agreement_address, new_state, tx_hash, block_number, log_index, block_timestamp)
VALUES
  (1013, '0xaaaa000000000000000000000000000000000007', 1, '0x' || repeat('d', 64), 111, '0', NOW() - INTERVAL '30 days'),
  (1014, '0xaaaa000000000000000000000000000000000007', 2, '0xd1' || repeat('0', 62), 112, '0', NOW() - INTERVAL '28 days'),
  (1015, '0xaaaa000000000000000000000000000000000007', 3, '0xd2' || repeat('0', 62), 113, '0', NOW() - INTERVAL '21 days'),
  (1016, '0xaaaa000000000000000000000000000000000007', 4, '0xd3' || repeat('0', 62), 114, '0', NOW() - INTERVAL '10 days'),
  (1017, '0xaaaa000000000000000000000000000000000007', 5, '0x' || repeat('f', 64), 115, '0', NOW() - INTERVAL '7 days');

-- 0xaaaa...0008: Direct to PRODUCTION (no attack history - used goToProduction())
INSERT INTO battlechainindexer_attack_registry.agreement_state_changed
  (rindexer_id, agreement_address, new_state, tx_hash, block_number, log_index, block_timestamp)
VALUES
  (1018, '0xaaaa000000000000000000000000000000000008', 1, '0xf1' || repeat('0', 62), 116, '0', NOW() - INTERVAL '14 days'),
  (1019, '0xaaaa000000000000000000000000000000000008', 5, '0xf2' || repeat('0', 62), 117, '0', NOW() - INTERVAL '7 days');

-- 0xaaaa...0009: CORRUPTED ("Compromised") - agreement was successfully attacked
INSERT INTO battlechainindexer_attack_registry.agreement_state_changed
  (rindexer_id, agreement_address, new_state, tx_hash, block_number, log_index, block_timestamp)
VALUES
  (1020, '0xaaaa000000000000000000000000000000000009', 1, '0xf3' || repeat('0', 62), 118, '0', NOW() - INTERVAL '15 days'),
  (1021, '0xaaaa000000000000000000000000000000000009', 2, '0xf4' || repeat('0', 62), 119, '0', NOW() - INTERVAL '13 days'),
  (1022, '0xaaaa000000000000000000000000000000000009', 3, '0xf5' || repeat('0', 62), 120, '0', NOW() - INTERVAL '10 days'),
  (1023, '0xaaaa000000000000000000000000000000000009', 6, '0xf6' || repeat('0', 62), 121, '0', NOW() - INTERVAL '5 days');

-- ============================================
-- 4. Insert agreements (for contracts 0x03-0x09)
-- ============================================
-- Clear existing seed agreements
DELETE FROM battlechainindexer_agreement_factory.agreement_created
WHERE agreement_address IN (
  '0xaaaa000000000000000000000000000000000003',
  '0xaaaa000000000000000000000000000000000004',
  '0xaaaa000000000000000000000000000000000005',
  '0xaaaa000000000000000000000000000000000006',
  '0xaaaa000000000000000000000000000000000007',
  '0xaaaa000000000000000000000000000000000008',
  '0xaaaa000000000000000000000000000000000009'
);

INSERT INTO battlechainindexer_agreement_factory.agreement_created
  (agreement_address, owner, salt, tx_hash, block_number, log_index, block_timestamp, contract_address, block_hash, network, tx_index)
VALUES
  ('0xaaaa000000000000000000000000000000000003', '0x1111111111111111111111111111111111111111', '\x00', '0x' || repeat('1', 64), 101, '1', NOW() - INTERVAL '6 days', '0x' || repeat('0', 40), '0x' || repeat('d', 64), 'local', 1),
  ('0xaaaa000000000000000000000000000000000004', '0x1111111111111111111111111111111111111111', '\x01', '0x' || repeat('2', 64), 102, '1', NOW() - INTERVAL '5 days', '0x' || repeat('0', 40), '0x' || repeat('f', 64), 'local', 1),
  ('0xaaaa000000000000000000000000000000000005', '0x1111111111111111111111111111111111111111', '\x02', '0x' || repeat('3', 64), 104, '1', NOW() - INTERVAL '10 days', '0x' || repeat('0', 40), '0x' || repeat('4', 64), 'local', 1),
  ('0xaaaa000000000000000000000000000000000006', '0x1111111111111111111111111111111111111111', '\x03', '0x' || repeat('4', 64), 107, '1', NOW() - INTERVAL '20 days', '0x' || repeat('0', 40), '0x' || repeat('8', 64), 'local', 1),
  ('0xaaaa000000000000000000000000000000000007', '0x1111111111111111111111111111111111111111', '\x04', '0x' || repeat('5', 64), 111, '1', NOW() - INTERVAL '30 days', '0x' || repeat('0', 40), '0x' || repeat('e', 64), 'local', 1),
  ('0xaaaa000000000000000000000000000000000008', '0x1111111111111111111111111111111111111111', '\x05', '0x' || repeat('6', 64), 116, '1', NOW() - INTERVAL '14 days', '0x' || repeat('0', 40), '0x01' || repeat('0', 62), 'local', 1),
  ('0xaaaa000000000000000000000000000000000009', '0x1111111111111111111111111111111111111111', '\x06', '0x' || repeat('7', 64), 118, '1', NOW() - INTERVAL '15 days', '0x' || repeat('0', 40), '0x03' || repeat('0', 62), 'local', 1);

-- ============================================
-- 4. Create agreement current state table (materialized view)
-- ============================================
CREATE SCHEMA IF NOT EXISTS battlechainindexer_agreement;

CREATE TABLE IF NOT EXISTS battlechainindexer_agreement.agreement_current_state (
  agreement_address CHAR(42) PRIMARY KEY,

  -- From agreement_created (via AgreementFactory)
  owner CHAR(42),
  created_at_block NUMERIC,
  created_at TIMESTAMPTZ,

  -- From ProtocolNameUpdated
  protocol_name TEXT,
  protocol_name_updated_at TIMESTAMPTZ,

  -- From AgreementURIUpdated
  agreement_uri TEXT,
  agreement_uri_updated_at TIMESTAMPTZ,

  -- From BountyTermsUpdated
  bounty_percentage NUMERIC,
  bounty_cap_usd NUMERIC,
  retainable BOOLEAN,
  identity_requirement SMALLINT,  -- 0=Anonymous, 1=Pseudonymous, 2=Named
  diligence_requirements TEXT,
  aggregate_bounty_cap_usd NUMERIC,
  bounty_terms_updated_at TIMESTAMPTZ,

  -- From ContactDetailsSet
  contact_details JSONB,  -- Array of {name, contact}
  contact_details_updated_at TIMESTAMPTZ,

  -- From CommitmentWindowExtended
  commitment_deadline NUMERIC,  -- Unix timestamp
  commitment_deadline_updated_at TIMESTAMPTZ,

  -- From scope events (computed)
  covered_contracts TEXT[],  -- Array of addresses
  scope_updated_at TIMESTAMPTZ,

  -- Metadata
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for reverse lookup (find agreement by covered contract)
CREATE INDEX IF NOT EXISTS idx_agreement_covered_contracts
  ON battlechainindexer_agreement.agreement_current_state
  USING GIN (covered_contracts);

-- ============================================
-- 5. Seed agreement current state with test data
-- ============================================
-- Clear existing seed data
DELETE FROM battlechainindexer_agreement.agreement_current_state
WHERE agreement_address IN (
  '0xaaaa000000000000000000000000000000000003',
  '0xaaaa000000000000000000000000000000000004',
  '0xaaaa000000000000000000000000000000000005',
  '0xaaaa000000000000000000000000000000000006',
  '0xaaaa000000000000000000000000000000000007',
  '0xaaaa000000000000000000000000000000000008',
  '0xaaaa000000000000000000000000000000000009'
);

-- Insert test agreement states with full details

-- Agreement for 0x03: NEW_DEPLOYMENT with full agreement details
INSERT INTO battlechainindexer_agreement.agreement_current_state (
  agreement_address, owner, created_at_block, created_at,
  protocol_name, agreement_uri, bounty_percentage, bounty_cap_usd,
  retainable, identity_requirement, diligence_requirements, aggregate_bounty_cap_usd,
  contact_details, commitment_deadline,
  covered_contracts, last_updated_at
)
VALUES (
  '0xaaaa000000000000000000000000000000000003',
  '0x1111111111111111111111111111111111111111',
  101, NOW() - INTERVAL '6 days',
  'Test Protocol Alpha', 'ipfs://QmTestHash123456789', 10, 5000000,
  false, 0, NULL, 10000000,
  '[{"name":"Security Team","contact":"security@testprotocol.com"},{"name":"Discord","contact":"discord.gg/testprotocol"}]'::jsonb,
  EXTRACT(EPOCH FROM NOW() + INTERVAL '30 days'),
  ARRAY['0x0000000000000000000000000000000000000003'],
  NOW()
);

-- Agreement for 0x04: ATTACK_REQUESTED ("Warming Up") with terms locked
INSERT INTO battlechainindexer_agreement.agreement_current_state (
  agreement_address, owner, created_at_block, created_at,
  protocol_name, agreement_uri, bounty_percentage, bounty_cap_usd,
  retainable, identity_requirement, diligence_requirements, aggregate_bounty_cap_usd,
  contact_details, commitment_deadline,
  covered_contracts, last_updated_at
)
VALUES (
  '0xaaaa000000000000000000000000000000000004',
  '0x1111111111111111111111111111111111111111',
  102, NOW() - INTERVAL '5 days',
  'Vault Finance', 'ar://ArweaveHashXYZ789', 15, 10000000,
  true, 1, NULL, 0,
  '[{"name":"Telegram","contact":"@vaultfinance_security"}]'::jsonb,
  EXTRACT(EPOCH FROM NOW() + INTERVAL '90 days'),
  ARRAY['0x0000000000000000000000000000000000000004'],
  NOW()
);

-- Agreement for 0x05: UNDER_ATTACK ("Attackable") with Named identity requirement
INSERT INTO battlechainindexer_agreement.agreement_current_state (
  agreement_address, owner, created_at_block, created_at,
  protocol_name, agreement_uri, bounty_percentage, bounty_cap_usd,
  retainable, identity_requirement, diligence_requirements, aggregate_bounty_cap_usd,
  contact_details, commitment_deadline,
  covered_contracts, last_updated_at
)
VALUES (
  '0xaaaa000000000000000000000000000000000005',
  '0x1111111111111111111111111111111111111111',
  104, NOW() - INTERVAL '10 days',
  'DeFi Lending Pool', 'https://example.com/agreement.pdf', 20, 25000000,
  false, 2, 'Must provide valid government ID and proof of address', 50000000,
  '[{"name":"Emergency Contact","contact":"emergency@defilending.io"},{"name":"Legal Team","contact":"legal@defilending.io"}]'::jsonb,
  EXTRACT(EPOCH FROM NOW() + INTERVAL '180 days'),
  ARRAY['0x0000000000000000000000000000000000000005'],
  NOW()
);

-- Agreement for 0x06: PROMOTION_REQUESTED ("Promotion Pending") - 3-day countdown active
INSERT INTO battlechainindexer_agreement.agreement_current_state (
  agreement_address, owner, created_at_block, created_at,
  protocol_name, agreement_uri, bounty_percentage, bounty_cap_usd,
  retainable, identity_requirement, diligence_requirements, aggregate_bounty_cap_usd,
  contact_details, commitment_deadline,
  covered_contracts, last_updated_at
)
VALUES (
  '0xaaaa000000000000000000000000000000000006',
  '0x1111111111111111111111111111111111111111',
  107, NOW() - INTERVAL '20 days',
  'Staking Protocol', 'ipfs://QmStakingProtocolAgreement', 12, 8000000,
  false, 0, NULL, 0,
  '[{"name":"Security","contact":"security@stakingprotocol.xyz"}]'::jsonb,
  EXTRACT(EPOCH FROM NOW() + INTERVAL '60 days'),
  ARRAY['0x0000000000000000000000000000000000000006'],
  NOW()
);

-- Agreement for 0x07: PRODUCTION (was under attack) - full lifecycle completed
INSERT INTO battlechainindexer_agreement.agreement_current_state (
  agreement_address, owner, created_at_block, created_at,
  protocol_name, agreement_uri, bounty_percentage, bounty_cap_usd,
  retainable, identity_requirement, diligence_requirements, aggregate_bounty_cap_usd,
  contact_details, commitment_deadline,
  covered_contracts, last_updated_at
)
VALUES (
  '0xaaaa000000000000000000000000000000000007',
  '0x1111111111111111111111111111111111111111',
  111, NOW() - INTERVAL '30 days',
  'Battle-Tested DEX', 'ipfs://QmBattleTestedDEX', 10, 15000000,
  false, 1, NULL, 30000000,
  '[{"name":"Security Team","contact":"security@battletested.io"},{"name":"Bug Bounty","contact":"bounty@battletested.io"}]'::jsonb,
  EXTRACT(EPOCH FROM NOW() + INTERVAL '365 days'),
  ARRAY['0x0000000000000000000000000000000000000007'],
  NOW()
);

-- Agreement for 0x08: PRODUCTION (no attack history - used goToProduction())
INSERT INTO battlechainindexer_agreement.agreement_current_state (
  agreement_address, owner, created_at_block, created_at,
  protocol_name, agreement_uri, bounty_percentage, bounty_cap_usd,
  retainable, identity_requirement, diligence_requirements, aggregate_bounty_cap_usd,
  contact_details, commitment_deadline,
  covered_contracts, last_updated_at
)
VALUES (
  '0xaaaa000000000000000000000000000000000008',
  '0x1111111111111111111111111111111111111111',
  116, NOW() - INTERVAL '14 days',
  'Multi-Sig Treasury', NULL, 5, 1000000,
  false, 1, NULL, 5000000,
  '[{"name":"Treasury Team","contact":"treasury@multisig.org"}]'::jsonb,
  EXTRACT(EPOCH FROM NOW() + INTERVAL '365 days'),
  ARRAY['0x0000000000000000000000000000000000000008'],
  NOW()
);

-- Agreement for 0x09: CORRUPTED ("Compromised") - contract was successfully attacked
INSERT INTO battlechainindexer_agreement.agreement_current_state (
  agreement_address, owner, created_at_block, created_at,
  protocol_name, agreement_uri, bounty_percentage, bounty_cap_usd,
  retainable, identity_requirement, diligence_requirements, aggregate_bounty_cap_usd,
  contact_details, commitment_deadline,
  covered_contracts, last_updated_at
)
VALUES (
  '0xaaaa000000000000000000000000000000000009',
  '0x1111111111111111111111111111111111111111',
  118, NOW() - INTERVAL '15 days',
  'Vulnerable Protocol', 'ipfs://QmVulnerableProtocol', 10, 5000000,
  false, 0, NULL, 10000000,
  '[{"name":"Security Team","contact":"security@vulnerable.io"}]'::jsonb,
  EXTRACT(EPOCH FROM NOW() - INTERVAL '5 days'),
  ARRAY['0x0000000000000000000000000000000000000009'],
  NOW()
);

-- ============================================
-- 6. Summary output
-- ============================================
SELECT 'Seeding complete!' AS status;
SELECT 'Contracts seeded:' AS info;
SELECT '  0x...0001: NOT_REGISTERED - Safe Harbor HIDDEN' AS contract_1;
SELECT '  0x...0002: NEW_DEPLOYMENT ("Registered"), no agreement' AS contract_2;
SELECT '  0x...0003: NEW_DEPLOYMENT ("Registered"), has agreement' AS contract_3;
SELECT '  0x...0004: ATTACK_REQUESTED ("Warming Up"), has agreement' AS contract_4;
SELECT '  0x...0005: UNDER_ATTACK ("Attackable"), has agreement' AS contract_5;
SELECT '  0x...0006: PROMOTION_REQUESTED ("Promotion Pending"), has agreement' AS contract_6;
SELECT '  0x...0007: PRODUCTION (was under attack), has agreement' AS contract_7;
SELECT '  0x...0008: PRODUCTION (skipped attack via goToProduction), has agreement' AS contract_8;
SELECT '  0x...0009: CORRUPTED ("Compromised"), has agreement' AS contract_9;
