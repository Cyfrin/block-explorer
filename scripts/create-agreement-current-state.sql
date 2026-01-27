-- Agreement Current State Table and Triggers
-- This script creates a materialized view of agreement state that is updated
-- automatically via database triggers whenever events are indexed.

-- Create schema for Agreement events (rindexer will also create this)
CREATE SCHEMA IF NOT EXISTS battlechainindexer_agreement;

-- ============================================
-- Create the materialized current state table
-- ============================================
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
-- Trigger: Initialize state on AgreementCreated
-- ============================================
CREATE OR REPLACE FUNCTION init_agreement_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO battlechainindexer_agreement.agreement_current_state (
    agreement_address, owner, created_at_block, created_at, last_updated_at
  )
  VALUES (NEW.agreement_address, NEW.owner, NEW.block_number, NEW.block_timestamp, NOW())
  ON CONFLICT (agreement_address) DO UPDATE SET
    owner = EXCLUDED.owner,
    created_at_block = EXCLUDED.created_at_block,
    created_at = EXCLUDED.created_at,
    last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agreement_created ON battlechainindexer_agreement_factory.agreement_created;
CREATE TRIGGER trg_agreement_created
  AFTER INSERT ON battlechainindexer_agreement_factory.agreement_created
  FOR EACH ROW EXECUTE FUNCTION init_agreement_state();

-- ============================================
-- Trigger: Update state on ProtocolNameUpdated
-- ============================================
CREATE OR REPLACE FUNCTION update_agreement_protocol_name()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO battlechainindexer_agreement.agreement_current_state (
    agreement_address, protocol_name, protocol_name_updated_at, last_updated_at
  )
  VALUES (NEW.contract_address, NEW.new_name, NEW.block_timestamp, NOW())
  ON CONFLICT (agreement_address) DO UPDATE SET
    protocol_name = EXCLUDED.protocol_name,
    protocol_name_updated_at = EXCLUDED.protocol_name_updated_at,
    last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protocol_name_updated ON battlechainindexer_agreement.protocol_name_updated;
CREATE TRIGGER trg_protocol_name_updated
  AFTER INSERT ON battlechainindexer_agreement.protocol_name_updated
  FOR EACH ROW EXECUTE FUNCTION update_agreement_protocol_name();

-- ============================================
-- Trigger: Update state on AgreementURIUpdated
-- ============================================
CREATE OR REPLACE FUNCTION update_agreement_uri()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO battlechainindexer_agreement.agreement_current_state (
    agreement_address, agreement_uri, agreement_uri_updated_at, last_updated_at
  )
  VALUES (NEW.contract_address, NEW.new_agreement_uri, NEW.block_timestamp, NOW())
  ON CONFLICT (agreement_address) DO UPDATE SET
    agreement_uri = EXCLUDED.agreement_uri,
    agreement_uri_updated_at = EXCLUDED.agreement_uri_updated_at,
    last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agreement_uri_updated ON battlechainindexer_agreement.agreement_uri_updated;
CREATE TRIGGER trg_agreement_uri_updated
  AFTER INSERT ON battlechainindexer_agreement.agreement_uri_updated
  FOR EACH ROW EXECUTE FUNCTION update_agreement_uri();

-- ============================================
-- Trigger: Update state on BountyTermsUpdated
-- ============================================
CREATE OR REPLACE FUNCTION update_agreement_bounty_terms()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO battlechainindexer_agreement.agreement_current_state (
    agreement_address, bounty_percentage, bounty_cap_usd, retainable,
    identity_requirement, diligence_requirements, aggregate_bounty_cap_usd,
    bounty_terms_updated_at, last_updated_at
  )
  VALUES (
    NEW.contract_address,
    NEW.new_bounty_terms_bounty_percentage,
    NEW.new_bounty_terms_bounty_cap_usd,
    NEW.new_bounty_terms_retainable,
    NEW.new_bounty_terms_identity,
    NEW.new_bounty_terms_diligence_requirements,
    NEW.new_bounty_terms_aggregate_bounty_cap_usd,
    NEW.block_timestamp,
    NOW()
  )
  ON CONFLICT (agreement_address) DO UPDATE SET
    bounty_percentage = EXCLUDED.bounty_percentage,
    bounty_cap_usd = EXCLUDED.bounty_cap_usd,
    retainable = EXCLUDED.retainable,
    identity_requirement = EXCLUDED.identity_requirement,
    diligence_requirements = EXCLUDED.diligence_requirements,
    aggregate_bounty_cap_usd = EXCLUDED.aggregate_bounty_cap_usd,
    bounty_terms_updated_at = EXCLUDED.bounty_terms_updated_at,
    last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bounty_terms_updated ON battlechainindexer_agreement.bounty_terms_updated;
CREATE TRIGGER trg_bounty_terms_updated
  AFTER INSERT ON battlechainindexer_agreement.bounty_terms_updated
  FOR EACH ROW EXECUTE FUNCTION update_agreement_bounty_terms();

-- ============================================
-- Trigger: Update state on ContactDetailsSet
-- ============================================
CREATE OR REPLACE FUNCTION update_agreement_contact_details()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO battlechainindexer_agreement.agreement_current_state (
    agreement_address, contact_details, contact_details_updated_at, last_updated_at
  )
  VALUES (NEW.contract_address, NEW.new_contact_details, NEW.block_timestamp, NOW())
  ON CONFLICT (agreement_address) DO UPDATE SET
    contact_details = EXCLUDED.contact_details,
    contact_details_updated_at = EXCLUDED.contact_details_updated_at,
    last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_details_set ON battlechainindexer_agreement.contact_details_set;
CREATE TRIGGER trg_contact_details_set
  AFTER INSERT ON battlechainindexer_agreement.contact_details_set
  FOR EACH ROW EXECUTE FUNCTION update_agreement_contact_details();

-- ============================================
-- Trigger: Update state on CommitmentWindowExtended
-- ============================================
CREATE OR REPLACE FUNCTION update_agreement_commitment_window()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO battlechainindexer_agreement.agreement_current_state (
    agreement_address, commitment_deadline, commitment_deadline_updated_at, last_updated_at
  )
  VALUES (NEW.contract_address, NEW.new_cant_change_until, NEW.block_timestamp, NOW())
  ON CONFLICT (agreement_address) DO UPDATE SET
    commitment_deadline = EXCLUDED.commitment_deadline,
    commitment_deadline_updated_at = EXCLUDED.commitment_deadline_updated_at,
    last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commitment_window_extended ON battlechainindexer_agreement.commitment_window_extended;
CREATE TRIGGER trg_commitment_window_extended
  AFTER INSERT ON battlechainindexer_agreement.commitment_window_extended
  FOR EACH ROW EXECUTE FUNCTION update_agreement_commitment_window();

-- ============================================
-- Trigger: Add address to scope
-- ============================================
CREATE OR REPLACE FUNCTION update_agreement_scope_add()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO battlechainindexer_agreement.agreement_current_state (
    agreement_address, covered_contracts, scope_updated_at, last_updated_at
  )
  VALUES (NEW.contract_address, ARRAY[NEW.addr], NEW.block_timestamp, NOW())
  ON CONFLICT (agreement_address) DO UPDATE SET
    covered_contracts = array_append(
      COALESCE(battlechainindexer_agreement.agreement_current_state.covered_contracts, ARRAY[]::TEXT[]),
      NEW.addr
    ),
    scope_updated_at = NEW.block_timestamp,
    last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scope_address_added ON battlechainindexer_agreement.battle_chain_scope_address_added;
CREATE TRIGGER trg_scope_address_added
  AFTER INSERT ON battlechainindexer_agreement.battle_chain_scope_address_added
  FOR EACH ROW EXECUTE FUNCTION update_agreement_scope_add();

-- ============================================
-- Trigger: Remove address from scope
-- ============================================
CREATE OR REPLACE FUNCTION update_agreement_scope_remove()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE battlechainindexer_agreement.agreement_current_state SET
    covered_contracts = array_remove(covered_contracts, NEW.addr),
    scope_updated_at = NEW.block_timestamp,
    last_updated_at = NOW()
  WHERE agreement_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scope_address_removed ON battlechainindexer_agreement.battle_chain_scope_address_removed;
CREATE TRIGGER trg_scope_address_removed
  AFTER INSERT ON battlechainindexer_agreement.battle_chain_scope_address_removed
  FOR EACH ROW EXECUTE FUNCTION update_agreement_scope_remove();

-- ============================================
-- Trigger: Clear scope
-- ============================================
CREATE OR REPLACE FUNCTION update_agreement_scope_clear()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE battlechainindexer_agreement.agreement_current_state SET
    covered_contracts = ARRAY[]::TEXT[],
    scope_updated_at = NEW.block_timestamp,
    last_updated_at = NOW()
  WHERE agreement_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scope_cleared ON battlechainindexer_agreement.battle_chain_scope_cleared;
CREATE TRIGGER trg_scope_cleared
  AFTER INSERT ON battlechainindexer_agreement.battle_chain_scope_cleared
  FOR EACH ROW EXECUTE FUNCTION update_agreement_scope_clear();

SELECT 'Agreement current state table and triggers created successfully!' AS status;
