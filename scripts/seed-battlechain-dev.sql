-- Battlechain Development Seeding Script
-- This script populates test data for various battlechain UI states
--
-- Test Contracts:
-- 0x...0001: NOT_REGISTERED, no agreement
-- 0x...0002: REGISTERED, no agreement
-- 0x...0003: REGISTERED, has agreement
-- 0x...0004: ATTACK_REQUESTED, has agreement
-- 0x...0005: UNDER_ATTACK, has agreement
-- 0x...0006: PRODUCTION (was under attack), has agreement
-- 0x...0007: PRODUCTION (no attack history), has agreement

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
  ('\x0000000000000000000000000000000000000007', '\x00')
ON CONFLICT (address) DO UPDATE SET bytecode = EXCLUDED.bytecode;

-- ============================================
-- 2. Insert state change events
-- ============================================
-- Note: target_contract uses the indexed form from the event
-- State values: 0=REGISTERED, 1=UNDER_ATTACK, 2=PRODUCTION, 3=ATTACK_REQUESTED

-- Clear existing seed data (optional - comment out to preserve existing data)
DELETE FROM battlechainindexer_attack_registry.contract_state_changed
WHERE target_contract IN (
  '0x0000000000000000000000000000000000000001',
  '0x0000000000000000000000000000000000000002',
  '0x0000000000000000000000000000000000000003',
  '0x0000000000000000000000000000000000000004',
  '0x0000000000000000000000000000000000000005',
  '0x0000000000000000000000000000000000000006',
  '0x0000000000000000000000000000000000000007'
);

-- 0x01: No state changes (NOT_REGISTERED) - nothing to insert

-- 0x02: REGISTERED only
INSERT INTO battlechainindexer_attack_registry.contract_state_changed
  (target_contract, new_state, tx_hash, block_number, log_index, block_timestamp, contract_address, block_hash, network, tx_index)
VALUES
  ('0x0000000000000000000000000000000000000002', 0, '0x' || repeat('a', 64), 100, '0', NOW() - INTERVAL '7 days', '0x' || repeat('0', 40), '0x' || repeat('b', 64), 'local', 0);

-- 0x03: REGISTERED with agreement
INSERT INTO battlechainindexer_attack_registry.contract_state_changed
  (target_contract, new_state, tx_hash, block_number, log_index, block_timestamp, contract_address, block_hash, network, tx_index)
VALUES
  ('0x0000000000000000000000000000000000000003', 0, '0x' || repeat('c', 64), 101, '0', NOW() - INTERVAL '6 days', '0x' || repeat('0', 40), '0x' || repeat('d', 64), 'local', 0);

-- 0x04: REGISTERED -> ATTACK_REQUESTED
INSERT INTO battlechainindexer_attack_registry.contract_state_changed
  (target_contract, new_state, tx_hash, block_number, log_index, block_timestamp, contract_address, block_hash, network, tx_index)
VALUES
  ('0x0000000000000000000000000000000000000004', 0, '0x' || repeat('e', 64), 102, '0', NOW() - INTERVAL '5 days', '0x' || repeat('0', 40), '0x' || repeat('f', 64), 'local', 0),
  ('0x0000000000000000000000000000000000000004', 3, '0x' || repeat('1', 64), 103, '0', NOW() - INTERVAL '4 days', '0x' || repeat('0', 40), '0x' || repeat('2', 64), 'local', 0);

-- 0x05: REGISTERED -> UNDER_ATTACK
INSERT INTO battlechainindexer_attack_registry.contract_state_changed
  (target_contract, new_state, tx_hash, block_number, log_index, block_timestamp, contract_address, block_hash, network, tx_index)
VALUES
  ('0x0000000000000000000000000000000000000005', 0, '0x' || repeat('3', 64), 104, '0', NOW() - INTERVAL '4 days', '0x' || repeat('0', 40), '0x' || repeat('4', 64), 'local', 0),
  ('0x0000000000000000000000000000000000000005', 1, '0x' || repeat('5', 64), 105, '0', NOW() - INTERVAL '3 days', '0x' || repeat('0', 40), '0x' || repeat('6', 64), 'local', 0);

-- 0x06: REGISTERED -> UNDER_ATTACK -> PRODUCTION (with attack history)
INSERT INTO battlechainindexer_attack_registry.contract_state_changed
  (target_contract, new_state, tx_hash, block_number, log_index, block_timestamp, contract_address, block_hash, network, tx_index)
VALUES
  ('0x0000000000000000000000000000000000000006', 0, '0x' || repeat('7', 64), 106, '0', NOW() - INTERVAL '10 days', '0x' || repeat('0', 40), '0x' || repeat('8', 64), 'local', 0),
  ('0x0000000000000000000000000000000000000006', 1, '0x' || repeat('9', 64), 107, '0', NOW() - INTERVAL '8 days', '0x' || repeat('0', 40), '0x' || repeat('a', 64), 'local', 0),
  ('0x0000000000000000000000000000000000000006', 2, '0x' || repeat('b', 64), 108, '0', NOW() - INTERVAL '5 days', '0x' || repeat('0', 40), '0x' || repeat('c', 64), 'local', 0);

-- 0x07: REGISTERED -> PRODUCTION (no attack history)
INSERT INTO battlechainindexer_attack_registry.contract_state_changed
  (target_contract, new_state, tx_hash, block_number, log_index, block_timestamp, contract_address, block_hash, network, tx_index)
VALUES
  ('0x0000000000000000000000000000000000000007', 0, '0x' || repeat('d', 64), 109, '0', NOW() - INTERVAL '14 days', '0x' || repeat('0', 40), '0x' || repeat('e', 64), 'local', 0),
  ('0x0000000000000000000000000000000000000007', 2, '0x' || repeat('f', 64), 110, '0', NOW() - INTERVAL '7 days', '0x' || repeat('0', 40), '0x' || repeat('0', 64), 'local', 0);

-- ============================================
-- 3. Insert agreements (for contracts 0x03-0x07)
-- ============================================
-- Clear existing seed agreements
DELETE FROM battlechainindexer_agreement_factory.agreement_created
WHERE agreement_address IN (
  '0xaaaa000000000000000000000000000000000003',
  '0xaaaa000000000000000000000000000000000004',
  '0xaaaa000000000000000000000000000000000005',
  '0xaaaa000000000000000000000000000000000006',
  '0xaaaa000000000000000000000000000000000007'
);

INSERT INTO battlechainindexer_agreement_factory.agreement_created
  (agreement_address, owner, salt, tx_hash, block_number, log_index, block_timestamp, contract_address, block_hash, network, tx_index)
VALUES
  ('0xaaaa000000000000000000000000000000000003', '0x1111111111111111111111111111111111111111', '\x00', '0x' || repeat('1', 64), 101, '1', NOW() - INTERVAL '6 days', '0x' || repeat('0', 40), '0x' || repeat('d', 64), 'local', 1),
  ('0xaaaa000000000000000000000000000000000004', '0x1111111111111111111111111111111111111111', '\x01', '0x' || repeat('2', 64), 102, '1', NOW() - INTERVAL '5 days', '0x' || repeat('0', 40), '0x' || repeat('f', 64), 'local', 1),
  ('0xaaaa000000000000000000000000000000000005', '0x1111111111111111111111111111111111111111', '\x02', '0x' || repeat('3', 64), 104, '1', NOW() - INTERVAL '4 days', '0x' || repeat('0', 40), '0x' || repeat('4', 64), 'local', 1),
  ('0xaaaa000000000000000000000000000000000006', '0x1111111111111111111111111111111111111111', '\x03', '0x' || repeat('4', 64), 106, '1', NOW() - INTERVAL '10 days', '0x' || repeat('0', 40), '0x' || repeat('8', 64), 'local', 1),
  ('0xaaaa000000000000000000000000000000000007', '0x1111111111111111111111111111111111111111', '\x04', '0x' || repeat('5', 64), 109, '1', NOW() - INTERVAL '14 days', '0x' || repeat('0', 40), '0x' || repeat('e', 64), 'local', 1);

-- ============================================
-- 4. Create agreement_scope table and seed data (legacy, kept for compatibility)
-- ============================================
CREATE TABLE IF NOT EXISTS battlechainindexer_agreement_factory.agreement_scope (
  id SERIAL PRIMARY KEY,
  agreement_address CHAR(42) NOT NULL,
  contract_address CHAR(42) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agreement_scope_agreement
  ON battlechainindexer_agreement_factory.agreement_scope(agreement_address);
CREATE INDEX IF NOT EXISTS idx_agreement_scope_contract
  ON battlechainindexer_agreement_factory.agreement_scope(contract_address);

-- Clear existing seed scope data
DELETE FROM battlechainindexer_agreement_factory.agreement_scope
WHERE contract_address IN (
  '0x0000000000000000000000000000000000000003',
  '0x0000000000000000000000000000000000000004',
  '0x0000000000000000000000000000000000000005',
  '0x0000000000000000000000000000000000000006',
  '0x0000000000000000000000000000000000000007'
);

-- Link agreements to contracts
INSERT INTO battlechainindexer_agreement_factory.agreement_scope (agreement_address, contract_address)
VALUES
  ('0xaaaa000000000000000000000000000000000003', '0x0000000000000000000000000000000000000003'),
  ('0xaaaa000000000000000000000000000000000004', '0x0000000000000000000000000000000000000004'),
  ('0xaaaa000000000000000000000000000000000005', '0x0000000000000000000000000000000000000005'),
  ('0xaaaa000000000000000000000000000000000006', '0x0000000000000000000000000000000000000006'),
  ('0xaaaa000000000000000000000000000000000007', '0x0000000000000000000000000000000000000007');

-- ============================================
-- 5. Create agreement current state table (materialized view)
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
-- 6. Seed agreement current state with test data
-- ============================================
-- Clear existing seed data
DELETE FROM battlechainindexer_agreement.agreement_current_state
WHERE agreement_address IN (
  '0xaaaa000000000000000000000000000000000003',
  '0xaaaa000000000000000000000000000000000004',
  '0xaaaa000000000000000000000000000000000005',
  '0xaaaa000000000000000000000000000000000006',
  '0xaaaa000000000000000000000000000000000007'
);

-- Insert test agreement states with full details
-- Agreement for 0x03: REGISTERED with full agreement details
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

-- Agreement for 0x04: ATTACK_REQUESTED with terms locked
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

-- Agreement for 0x05: UNDER_ATTACK with Named identity requirement
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
  104, NOW() - INTERVAL '4 days',
  'DeFi Lending Pool', 'https://example.com/agreement.pdf', 20, 25000000,
  false, 2, 'Must provide valid government ID and proof of address', 50000000,
  '[{"name":"Emergency Contact","contact":"emergency@defilending.io"},{"name":"Legal Team","contact":"legal@defilending.io"}]'::jsonb,
  EXTRACT(EPOCH FROM NOW() + INTERVAL '180 days'),
  ARRAY['0x0000000000000000000000000000000000000005'],
  NOW()
);

-- Agreement for 0x06: PRODUCTION (was under attack), commitment expired
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
  106, NOW() - INTERVAL '10 days',
  'Staking Protocol', 'ipfs://QmStakingProtocolAgreement', 12, 8000000,
  false, 0, NULL, 0,
  '[{"name":"Security","contact":"security@stakingprotocol.xyz"}]'::jsonb,
  EXTRACT(EPOCH FROM NOW() - INTERVAL '5 days'),
  ARRAY['0x0000000000000000000000000000000000000006'],
  NOW()
);

-- Agreement for 0x07: PRODUCTION (no attack history), multiple covered contracts
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
  109, NOW() - INTERVAL '14 days',
  'Multi-Sig Treasury', NULL, 5, 1000000,
  false, 1, NULL, 5000000,
  '[{"name":"Treasury Team","contact":"treasury@multisig.org"}]'::jsonb,
  EXTRACT(EPOCH FROM NOW() + INTERVAL '365 days'),
  ARRAY['0x0000000000000000000000000000000000000007', '0x0000000000000000000000000000000000000008', '0x0000000000000000000000000000000000000009'],
  NOW()
);

-- ============================================
-- 7. Summary output
-- ============================================
SELECT 'Seeding complete!' AS status;
SELECT 'Contracts seeded:' AS info;
SELECT '  0x...0001: NOT_REGISTERED, no agreement' AS contract_1;
SELECT '  0x...0002: REGISTERED, no agreement' AS contract_2;
SELECT '  0x...0003: REGISTERED, has agreement' AS contract_3;
SELECT '  0x...0004: ATTACK_REQUESTED, has agreement' AS contract_4;
SELECT '  0x...0005: UNDER_ATTACK, has agreement' AS contract_5;
SELECT '  0x...0006: PRODUCTION (was under attack), has agreement' AS contract_6;
SELECT '  0x...0007: PRODUCTION (no attack history), has agreement' AS contract_7;
