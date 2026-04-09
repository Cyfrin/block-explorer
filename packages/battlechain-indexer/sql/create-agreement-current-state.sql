-- Agreement Current State Table and Triggers
-- This script creates a materialized view of agreement state that is updated
-- automatically via database triggers whenever events are indexed.
-- Create schema for Agreement events (rindexer will also create this)
CREATE SCHEMA IF NOT EXISTS battlechainindexer_agreement;

-- Set search path so functions are created in the correct schema
SET
  search_path TO battlechainindexer_agreement,
  public;

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
  identity_requirement SMALLINT,
  -- 0=Anonymous, 1=Pseudonymous, 2=Named
  diligence_requirements TEXT,
  aggregate_bounty_cap_usd NUMERIC,
  bounty_terms_updated_at TIMESTAMPTZ,
  -- From ContactDetailsSet
  contact_details JSONB,
  -- Array of {name, contact}
  contact_details_updated_at TIMESTAMPTZ,
  -- From CommitmentWindowExtended
  commitment_deadline NUMERIC,
  -- Unix timestamp
  commitment_deadline_updated_at TIMESTAMPTZ,
  -- From scope events (manually-specified via BattleChainScopeAddress* events)
  covered_scope_contracts TEXT [] DEFAULT ARRAY [] :: TEXT [],
  -- From child contract resolution (computed by API polling job)
  covered_child_contracts TEXT [] DEFAULT ARRAY [] :: TEXT [],
  -- Union of covered_scope_contracts and covered_child_contracts (used for lookups)
  covered_contracts TEXT [],
  -- Array of addresses
  scope_updated_at TIMESTAMPTZ,
  -- From AgreementStateChanged (via AttackRegistry) — materialized for efficient list queries
  computed_state VARCHAR(20) DEFAULT 'NOT_REGISTERED',
  registered_at TIMESTAMPTZ,
  -- first NEW_DEPLOYMENT timestamp
  promotion_requested_at TIMESTAMPTZ,
  -- last PROMOTION_REQUESTED timestamp
  -- Metadata
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  rpc_fetched_at TIMESTAMPTZ -- NULL = not yet fetched via RPC
);

-- Index for reverse lookup (find agreement by covered contract)
CREATE INDEX IF NOT EXISTS idx_agreement_covered_contracts ON battlechainindexer_agreement.agreement_current_state USING GIN (covered_contracts);

-- Index for reverse lookup on child contracts
CREATE INDEX IF NOT EXISTS idx_agreement_covered_child_contracts ON battlechainindexer_agreement.agreement_current_state USING GIN (covered_child_contracts);

-- Index for state filtering/sorting on the agreements list page
CREATE INDEX IF NOT EXISTS idx_agreement_computed_state ON battlechainindexer_agreement.agreement_current_state (computed_state);

-- Add state columns to existing tables (idempotent for existing deployments)
ALTER TABLE
  battlechainindexer_agreement.agreement_current_state
ADD
  COLUMN IF NOT EXISTS computed_state VARCHAR(20) DEFAULT 'NOT_REGISTERED',
ADD
  COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ,
ADD
  COLUMN IF NOT EXISTS promotion_requested_at TIMESTAMPTZ;

-- ============================================
-- Child contract scope reindex queue
-- ============================================
-- When agreement scope changes (account added/removed/chain changes),
-- the triggers enqueue the agreement for child contract reindexing.
-- PRIMARY KEY deduplicates multiple rapid changes for the same agreement.
CREATE TABLE IF NOT EXISTS battlechainindexer_agreement.child_scope_reindex_queue (
  agreement_address CHAR(42) PRIMARY KEY,
  queued_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Child contract scope cursor (high-water mark)
-- ============================================
-- Tracks the last block number processed by the child contract resolution job.
-- Singleton row (id=1) so the job only processes new contract deployments each cycle.
CREATE TABLE IF NOT EXISTS battlechainindexer_agreement.child_scope_cursor (
  id INT PRIMARY KEY DEFAULT 1,
  last_processed_block BIGINT DEFAULT 0
);

INSERT INTO
  battlechainindexer_agreement.child_scope_cursor (id, last_processed_block)
VALUES
  (1, 0) ON CONFLICT DO NOTHING;

-- ============================================
-- Trigger: Initialize state on AgreementCreated
-- ============================================
CREATE
OR REPLACE FUNCTION init_agreement_state() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO
  battlechainindexer_agreement.agreement_current_state (
    agreement_address,
    owner,
    created_at_block,
    created_at,
    last_updated_at
  )
VALUES
  (
    NEW.agreement_address,
    NEW.owner,
    NEW.block_number,
    NEW.block_timestamp,
    NOW()
  ) ON CONFLICT (agreement_address) DO
UPDATE
SET
  owner = EXCLUDED.owner,
  created_at_block = EXCLUDED.created_at_block,
  created_at = EXCLUDED.created_at,
  last_updated_at = NOW();

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agreement_created ON battlechainindexer_agreement_factory.agreement_created;

CREATE TRIGGER trg_agreement_created
AFTER
INSERT
  ON battlechainindexer_agreement_factory.agreement_created FOR EACH ROW EXECUTE FUNCTION init_agreement_state();

-- ============================================
-- Trigger: Update state on ProtocolNameUpdated
-- ============================================
CREATE
OR REPLACE FUNCTION update_agreement_protocol_name() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO
  battlechainindexer_agreement.agreement_current_state (
    agreement_address,
    protocol_name,
    protocol_name_updated_at,
    last_updated_at
  )
VALUES
  (
    NEW.contract_address,
    NEW.new_name,
    NEW.block_timestamp,
    NOW()
  ) ON CONFLICT (agreement_address) DO
UPDATE
SET
  protocol_name = EXCLUDED.protocol_name,
  protocol_name_updated_at = EXCLUDED.protocol_name_updated_at,
  last_updated_at = NOW();

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protocol_name_updated ON battlechainindexer_agreement.protocol_name_updated;

CREATE TRIGGER trg_protocol_name_updated
AFTER
INSERT
  ON battlechainindexer_agreement.protocol_name_updated FOR EACH ROW EXECUTE FUNCTION update_agreement_protocol_name();

-- ============================================
-- Trigger: Update state on AgreementURIUpdated
-- ============================================
CREATE
OR REPLACE FUNCTION update_agreement_uri() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO
  battlechainindexer_agreement.agreement_current_state (
    agreement_address,
    agreement_uri,
    agreement_uri_updated_at,
    last_updated_at
  )
VALUES
  (
    NEW.contract_address,
    NEW.new_agreement_uri,
    NEW.block_timestamp,
    NOW()
  ) ON CONFLICT (agreement_address) DO
UPDATE
SET
  agreement_uri = EXCLUDED.agreement_uri,
  agreement_uri_updated_at = EXCLUDED.agreement_uri_updated_at,
  last_updated_at = NOW();

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agreement_uri_updated ON battlechainindexer_agreement.agreement_uri_updated;

CREATE TRIGGER trg_agreement_uri_updated
AFTER
INSERT
  ON battlechainindexer_agreement.agreement_uri_updated FOR EACH ROW EXECUTE FUNCTION update_agreement_uri();

-- ============================================
-- Trigger: Update state on BountyTermsUpdated
-- ============================================
CREATE
OR REPLACE FUNCTION update_agreement_bounty_terms() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO
  battlechainindexer_agreement.agreement_current_state (
    agreement_address,
    bounty_percentage,
    bounty_cap_usd,
    retainable,
    identity_requirement,
    diligence_requirements,
    aggregate_bounty_cap_usd,
    bounty_terms_updated_at,
    last_updated_at
  )
VALUES
  (
    NEW.contract_address,
    NEW.new_bounty_terms_bounty_percentage :: NUMERIC,
    NEW.new_bounty_terms_bounty_cap_usd :: NUMERIC,
    NEW.new_bounty_terms_retainable,
    NEW.new_bounty_terms_identity,
    NEW.new_bounty_terms_diligence_requirements,
    NEW.new_bounty_terms_aggregate_bounty_cap_usd :: NUMERIC,
    NEW.block_timestamp,
    NOW()
  ) ON CONFLICT (agreement_address) DO
UPDATE
SET
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
AFTER
INSERT
  ON battlechainindexer_agreement.bounty_terms_updated FOR EACH ROW EXECUTE FUNCTION update_agreement_bounty_terms();

-- ============================================
-- Trigger: Update state on ContactDetailsSet
-- ============================================
CREATE
OR REPLACE FUNCTION update_agreement_contact_details() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO
  battlechainindexer_agreement.agreement_current_state (
    agreement_address,
    contact_details,
    contact_details_updated_at,
    last_updated_at
  )
VALUES
  (
    NEW.contract_address,
    NEW.new_contact_details,
    NEW.block_timestamp,
    NOW()
  ) ON CONFLICT (agreement_address) DO
UPDATE
SET
  contact_details = EXCLUDED.contact_details,
  contact_details_updated_at = EXCLUDED.contact_details_updated_at,
  last_updated_at = NOW();

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_details_set ON battlechainindexer_agreement.contact_details_set;

CREATE TRIGGER trg_contact_details_set
AFTER
INSERT
  ON battlechainindexer_agreement.contact_details_set FOR EACH ROW EXECUTE FUNCTION update_agreement_contact_details();

-- ============================================
-- Trigger: Update state on CommitmentWindowExtended
-- ============================================
CREATE
OR REPLACE FUNCTION update_agreement_commitment_window() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO
  battlechainindexer_agreement.agreement_current_state (
    agreement_address,
    commitment_deadline,
    commitment_deadline_updated_at,
    last_updated_at
  )
VALUES
  (
    NEW.contract_address,
    NEW.new_cant_change_until :: NUMERIC,
    NEW.block_timestamp,
    NOW()
  ) ON CONFLICT (agreement_address) DO
UPDATE
SET
  commitment_deadline = EXCLUDED.commitment_deadline,
  commitment_deadline_updated_at = EXCLUDED.commitment_deadline_updated_at,
  last_updated_at = NOW();

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commitment_window_extended ON battlechainindexer_agreement.commitment_window_extended;

CREATE TRIGGER trg_commitment_window_extended
AFTER
INSERT
  ON battlechainindexer_agreement.commitment_window_extended FOR EACH ROW EXECUTE FUNCTION update_agreement_commitment_window();

-- ============================================
-- Trigger: Add address to scope
-- ============================================
CREATE
OR REPLACE FUNCTION update_agreement_scope_add() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO
  battlechainindexer_agreement.agreement_current_state (
    agreement_address,
    covered_scope_contracts,
    covered_contracts,
    scope_updated_at,
    last_updated_at
  )
VALUES
  (
    NEW.contract_address,
    ARRAY [NEW.addr],
    ARRAY [NEW.addr],
    NEW.block_timestamp,
    NOW()
  ) ON CONFLICT (agreement_address) DO
UPDATE
SET
  covered_scope_contracts = array_append(
    COALESCE(
      battlechainindexer_agreement.agreement_current_state.covered_scope_contracts,
      ARRAY [] :: TEXT []
    ),
    NEW.addr
  ),
  covered_contracts = array_append(
    COALESCE(
      battlechainindexer_agreement.agreement_current_state.covered_scope_contracts,
      ARRAY [] :: TEXT []
    ),
    NEW.addr
  ) || COALESCE(
    battlechainindexer_agreement.agreement_current_state.covered_child_contracts,
    ARRAY [] :: TEXT []
  ),
  scope_updated_at = NEW.block_timestamp,
  last_updated_at = NOW();

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scope_address_added ON battlechainindexer_agreement.battle_chain_scope_address_added;

CREATE TRIGGER trg_scope_address_added
AFTER
INSERT
  ON battlechainindexer_agreement.battle_chain_scope_address_added FOR EACH ROW EXECUTE FUNCTION update_agreement_scope_add();

-- ============================================
-- Trigger: Remove address from scope
-- ============================================
CREATE
OR REPLACE FUNCTION update_agreement_scope_remove() RETURNS TRIGGER AS $$ BEGIN
UPDATE
  battlechainindexer_agreement.agreement_current_state
SET
  covered_scope_contracts = array_remove(
    COALESCE(covered_scope_contracts, ARRAY [] :: TEXT []),
    NEW.addr
  ),
  covered_contracts = array_remove(
    COALESCE(covered_scope_contracts, ARRAY [] :: TEXT []),
    NEW.addr
  ) || COALESCE(covered_child_contracts, ARRAY [] :: TEXT []),
  scope_updated_at = NEW.block_timestamp,
  last_updated_at = NOW()
WHERE
  agreement_address = NEW.contract_address;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scope_address_removed ON battlechainindexer_agreement.battle_chain_scope_address_removed;

CREATE TRIGGER trg_scope_address_removed
AFTER
INSERT
  ON battlechainindexer_agreement.battle_chain_scope_address_removed FOR EACH ROW EXECUTE FUNCTION update_agreement_scope_remove();

-- ============================================
-- Trigger: Clear scope
-- ============================================
CREATE
OR REPLACE FUNCTION update_agreement_scope_clear() RETURNS TRIGGER AS $$ BEGIN
UPDATE
  battlechainindexer_agreement.agreement_current_state
SET
  covered_scope_contracts = ARRAY [] :: TEXT [],
  covered_contracts = COALESCE(covered_child_contracts, ARRAY [] :: TEXT []),
  scope_updated_at = NEW.block_timestamp,
  last_updated_at = NOW()
WHERE
  agreement_address = NEW.contract_address;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scope_cleared ON battlechainindexer_agreement.battle_chain_scope_cleared;

CREATE TRIGGER trg_scope_cleared
AFTER
INSERT
  ON battlechainindexer_agreement.battle_chain_scope_cleared FOR EACH ROW EXECUTE FUNCTION update_agreement_scope_clear();

-- ============================================
-- Trigger: Update computed state on AgreementStateChanged (from AttackRegistry)
-- ============================================
CREATE
OR REPLACE FUNCTION update_agreement_computed_state() RETURNS TRIGGER AS $$ DECLARE state_name VARCHAR(20);

BEGIN -- Map numeric state to string
state_name := CASE
  NEW.new_state
  WHEN 0 THEN 'NOT_DEPLOYED'
  WHEN 1 THEN 'NEW_DEPLOYMENT'
  WHEN 2 THEN 'ATTACK_REQUESTED'
  WHEN 3 THEN 'UNDER_ATTACK'
  WHEN 4 THEN 'PROMOTION_REQUESTED'
  WHEN 5 THEN 'PRODUCTION'
  WHEN 6 THEN 'CORRUPTED'
  ELSE 'NOT_REGISTERED'
END;

UPDATE
  battlechainindexer_agreement.agreement_current_state
SET
  computed_state = state_name,
  -- Set registered_at on the first state change event (registration + attack request are atomic)
  registered_at = CASE
    WHEN registered_at IS NULL THEN NEW.block_timestamp
    ELSE registered_at
  END,
  -- Track latest PROMOTION_REQUESTED timestamp
  promotion_requested_at = CASE
    WHEN NEW.new_state = 4 THEN NEW.block_timestamp
    ELSE promotion_requested_at
  END,
  last_updated_at = NOW()
WHERE
  agreement_address = NEW.agreement_address;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agreement_state_changed ON battlechainindexer_attack_registry.agreement_state_changed;

CREATE TRIGGER trg_agreement_state_changed
AFTER
INSERT
  ON battlechainindexer_attack_registry.agreement_state_changed FOR EACH ROW EXECUTE FUNCTION update_agreement_computed_state();

-- ============================================
-- Backfill existing data (if any events were indexed before triggers existed)
-- ============================================
INSERT INTO
  battlechainindexer_agreement.agreement_current_state (
    agreement_address,
    owner,
    created_at_block,
    created_at,
    last_updated_at
  )
SELECT
  agreement_address,
  owner,
  block_number,
  block_timestamp,
  NOW()
FROM
  battlechainindexer_agreement_factory.agreement_created ON CONFLICT (agreement_address) DO
UPDATE
SET
  owner = EXCLUDED.owner,
  created_at_block = EXCLUDED.created_at_block,
  created_at = EXCLUDED.created_at,
  last_updated_at = NOW();

-- ============================================
-- Create agreement_accounts table for API
-- ============================================
-- This table stores the current set of covered accounts per agreement.
-- Updated via triggers on account_added, account_removed, chain_added_or_set, chain_removed events.
CREATE TABLE IF NOT EXISTS battlechainindexer_agreement.agreement_accounts (
  id SERIAL PRIMARY KEY,
  agreement_address CHAR(42) NOT NULL,
  caip2_chain_id VARCHAR(100) NOT NULL,
  account_address VARCHAR(100) NOT NULL,
  child_contract_scope SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicates
  UNIQUE (
    agreement_address,
    caip2_chain_id,
    account_address
  )
);

-- Index for fast lookups by agreement
CREATE INDEX IF NOT EXISTS idx_agreement_accounts_agreement_address ON battlechainindexer_agreement.agreement_accounts (agreement_address);

-- Index for case-insensitive lookups (API uses LOWER())
CREATE INDEX IF NOT EXISTS idx_agreement_accounts_agreement_address_lower ON battlechainindexer_agreement.agreement_accounts (LOWER(agreement_address));

-- ============================================
-- Trigger: Insert account on AccountAdded
-- ============================================
CREATE
OR REPLACE FUNCTION insert_agreement_account() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO
  battlechainindexer_agreement.agreement_accounts (
    agreement_address,
    caip2_chain_id,
    account_address,
    child_contract_scope,
    created_at,
    updated_at
  )
VALUES
  (
    NEW.contract_address,
    NEW.caip_2_chain_id,
    NEW.account_account_address,
    NEW.account_child_contract_scope,
    NEW.block_timestamp,
    NEW.block_timestamp
  ) ON CONFLICT (
    agreement_address,
    caip2_chain_id,
    account_address
  ) DO
UPDATE
SET
  child_contract_scope = EXCLUDED.child_contract_scope,
  updated_at = NOW();

-- Enqueue child contract reindex for this agreement
INSERT INTO
  battlechainindexer_agreement.child_scope_reindex_queue (agreement_address)
VALUES
  (NEW.contract_address) ON CONFLICT DO NOTHING;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_account_added ON battlechainindexer_agreement.account_added;

CREATE TRIGGER trg_account_added
AFTER
INSERT
  ON battlechainindexer_agreement.account_added FOR EACH ROW EXECUTE FUNCTION insert_agreement_account();

-- ============================================
-- Trigger: Remove account on AccountRemoved
-- ============================================
CREATE
OR REPLACE FUNCTION remove_agreement_account() RETURNS TRIGGER AS $$ BEGIN
DELETE FROM
  battlechainindexer_agreement.agreement_accounts
WHERE
  agreement_address = NEW.contract_address
  AND caip2_chain_id = NEW.caip_2_chain_id
  AND account_address = NEW.account_address;

-- Enqueue child contract reindex for this agreement
INSERT INTO
  battlechainindexer_agreement.child_scope_reindex_queue (agreement_address)
VALUES
  (NEW.contract_address) ON CONFLICT DO NOTHING;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_account_removed ON battlechainindexer_agreement.account_removed;

CREATE TRIGGER trg_account_removed
AFTER
INSERT
  ON battlechainindexer_agreement.account_removed FOR EACH ROW EXECUTE FUNCTION remove_agreement_account();

-- ============================================
-- Trigger: Insert/update accounts from ChainAddedOrSet
-- rindexer stores tuple[] as JSONB "accounts" column containing
-- array of {account_address, child_contract_scope} objects
-- ============================================
CREATE
OR REPLACE FUNCTION upsert_chain_accounts() RETURNS TRIGGER AS $$
DECLARE
  acct JSONB;
BEGIN
IF NEW.accounts IS NOT NULL AND jsonb_typeof(NEW.accounts) = 'array' THEN
  FOR acct IN SELECT * FROM jsonb_array_elements(NEW.accounts)
  LOOP
    INSERT INTO
      battlechainindexer_agreement.agreement_accounts (
        agreement_address,
        caip2_chain_id,
        account_address,
        child_contract_scope,
        created_at,
        updated_at
      )
    VALUES
      (
        NEW.contract_address,
        NEW.caip_2_chain_id,
        acct->>'account_address',
        COALESCE((acct->>'child_contract_scope')::SMALLINT, 0),
        NEW.block_timestamp,
        NEW.block_timestamp
      ) ON CONFLICT (
        agreement_address,
        caip2_chain_id,
        account_address
      ) DO
    UPDATE
    SET
      child_contract_scope = EXCLUDED.child_contract_scope,
      updated_at = NOW();
  END LOOP;
END IF;

-- Enqueue child contract reindex for this agreement
INSERT INTO
  battlechainindexer_agreement.child_scope_reindex_queue (agreement_address)
VALUES
  (NEW.contract_address) ON CONFLICT DO NOTHING;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chain_added_or_set ON battlechainindexer_agreement.chain_added_or_set;

CREATE TRIGGER trg_chain_added_or_set
AFTER
INSERT
  ON battlechainindexer_agreement.chain_added_or_set FOR EACH ROW EXECUTE FUNCTION upsert_chain_accounts();

-- ============================================
-- Trigger: Remove all accounts for chain on ChainRemoved
-- ============================================
CREATE
OR REPLACE FUNCTION remove_chain_accounts() RETURNS TRIGGER AS $$ BEGIN
DELETE FROM
  battlechainindexer_agreement.agreement_accounts
WHERE
  agreement_address = NEW.contract_address
  AND caip2_chain_id = NEW.caip_2_chain_id;

-- Enqueue child contract reindex for this agreement
INSERT INTO
  battlechainindexer_agreement.child_scope_reindex_queue (agreement_address)
VALUES
  (NEW.contract_address) ON CONFLICT DO NOTHING;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chain_removed ON battlechainindexer_agreement.chain_removed;

CREATE TRIGGER trg_chain_removed
AFTER
INSERT
  ON battlechainindexer_agreement.chain_removed FOR EACH ROW EXECUTE FUNCTION remove_chain_accounts();

-- ============================================
-- Backfill agreement_accounts from existing events
-- ============================================
-- Backfill from account_added events
INSERT INTO
  battlechainindexer_agreement.agreement_accounts (
    agreement_address,
    caip2_chain_id,
    account_address,
    child_contract_scope,
    created_at,
    updated_at
  )
SELECT
  contract_address,
  caip_2_chain_id,
  account_account_address,
  account_child_contract_scope,
  block_timestamp,
  block_timestamp
FROM
  battlechainindexer_agreement.account_added ON CONFLICT (
    agreement_address,
    caip2_chain_id,
    account_address
  ) DO NOTHING;

-- Backfill from chain_added_or_set events (rindexer stores tuple[] as JSONB)
INSERT INTO
  battlechainindexer_agreement.agreement_accounts (
    agreement_address,
    caip2_chain_id,
    account_address,
    child_contract_scope,
    created_at,
    updated_at
  )
SELECT
  c.contract_address,
  c.caip_2_chain_id,
  acct->>'account_address',
  COALESCE((acct->>'child_contract_scope')::SMALLINT, 0),
  c.block_timestamp,
  c.block_timestamp
FROM
  battlechainindexer_agreement.chain_added_or_set c,
  jsonb_array_elements(c.accounts) AS acct
WHERE
  c.accounts IS NOT NULL
  AND jsonb_typeof(c.accounts) = 'array'
  AND acct->>'account_address' IS NOT NULL ON CONFLICT (
    agreement_address,
    caip2_chain_id,
    account_address
  ) DO NOTHING;

-- ============================================
-- Backfill covered_scope_contracts from BattleChainScopeAddressAdded events
-- ============================================
-- Due to the race condition (rindexer indexes events before triggers exist),
-- we must backfill covered_scope_contracts directly from the raw event table.
-- Aggregate all scope addresses per agreement, then upsert.
UPDATE
  battlechainindexer_agreement.agreement_current_state AS acs
SET
  covered_scope_contracts = backfill.scope_addrs,
  covered_contracts = backfill.scope_addrs || COALESCE(acs.covered_child_contracts, ARRAY [] :: TEXT [])
FROM
  (
    SELECT
      contract_address,
      array_agg(DISTINCT addr) AS scope_addrs
    FROM
      battlechainindexer_agreement.battle_chain_scope_address_added
    GROUP BY
      contract_address
  ) AS backfill
WHERE
  acs.agreement_address = backfill.contract_address
  AND (
    acs.covered_scope_contracts IS NULL
    OR acs.covered_scope_contracts = ARRAY [] :: TEXT []
  );

-- ============================================
-- Enqueue all agreements with child-scope accounts for initial reindex
-- ============================================
-- On first run, any agreements that already have accounts with child_contract_scope != 0
-- need to have their child contracts resolved.
INSERT INTO
  battlechainindexer_agreement.child_scope_reindex_queue (agreement_address)
SELECT
  DISTINCT agreement_address
FROM
  battlechainindexer_agreement.agreement_accounts
WHERE
  child_contract_scope != 0 ON CONFLICT DO NOTHING;

-- ============================================
-- Backfill computed_state from existing state change events
-- ============================================
-- For each agreement, find the latest state change event and set the state.
-- Also capture the first NEW_DEPLOYMENT timestamp and last PROMOTION_REQUESTED timestamp.
WITH latest_states AS (
  SELECT
    DISTINCT ON (agreement_address) agreement_address,
    new_state,
    block_timestamp
  FROM
    battlechainindexer_attack_registry.agreement_state_changed
  ORDER BY
    agreement_address,
    block_number DESC,
    log_index DESC
),
registered_times AS (
  SELECT
    DISTINCT ON (agreement_address) agreement_address,
    block_timestamp AS registered_at
  FROM
    battlechainindexer_attack_registry.agreement_state_changed
  ORDER BY
    agreement_address,
    block_number ASC,
    log_index ASC
),
promotion_times AS (
  SELECT
    DISTINCT ON (agreement_address) agreement_address,
    block_timestamp AS promotion_requested_at
  FROM
    battlechainindexer_attack_registry.agreement_state_changed
  WHERE
    new_state = 4
  ORDER BY
    agreement_address,
    block_number DESC,
    log_index DESC
)
UPDATE
  battlechainindexer_agreement.agreement_current_state acs
SET
  computed_state = CASE
    ls.new_state
    WHEN 0 THEN 'NOT_DEPLOYED'
    WHEN 1 THEN 'NEW_DEPLOYMENT'
    WHEN 2 THEN 'ATTACK_REQUESTED'
    WHEN 3 THEN 'UNDER_ATTACK'
    WHEN 4 THEN 'PROMOTION_REQUESTED'
    WHEN 5 THEN 'PRODUCTION'
    WHEN 6 THEN 'CORRUPTED'
    ELSE 'NOT_REGISTERED'
  END,
  registered_at = rt.registered_at,
  promotion_requested_at = pt.promotion_requested_at
FROM
  latest_states ls
  LEFT JOIN registered_times rt ON rt.agreement_address = ls.agreement_address
  LEFT JOIN promotion_times pt ON pt.agreement_address = ls.agreement_address
WHERE
  acs.agreement_address = ls.agreement_address
  AND (
    acs.computed_state IS NULL
    OR acs.computed_state = 'NOT_REGISTERED'
  );

-- Apply time-based state transitions for the backfill
-- 1. Auto-promote PROMOTION_REQUESTED after 3-day delay
UPDATE
  battlechainindexer_agreement.agreement_current_state
SET
  computed_state = 'PRODUCTION',
  last_updated_at = NOW()
WHERE
  computed_state = 'PROMOTION_REQUESTED'
  AND promotion_requested_at IS NOT NULL
  AND NOW() >= promotion_requested_at + INTERVAL '3 days';

-- 2. Auto-promote after 14-day window
UPDATE
  battlechainindexer_agreement.agreement_current_state
SET
  computed_state = 'PRODUCTION',
  last_updated_at = NOW()
WHERE
  computed_state IN ('NEW_DEPLOYMENT', 'ATTACK_REQUESTED')
  AND registered_at IS NOT NULL
  AND NOW() >= registered_at + INTERVAL '14 days';

-- ============================================
-- Value estimation columns (for exploit value estimation feature)
-- ============================================
ALTER TABLE
  battlechainindexer_agreement.agreement_current_state
ADD
  COLUMN IF NOT EXISTS value_band VARCHAR(20),
ADD
  COLUMN IF NOT EXISTS value_priced_usd NUMERIC,
ADD
  COLUMN IF NOT EXISTS value_native_usd NUMERIC,
ADD
  COLUMN IF NOT EXISTS value_priced_tokens JSONB,
ADD
  COLUMN IF NOT EXISTS value_unpriced_tokens JSONB,
ADD
  COLUMN IF NOT EXISTS value_confidence VARCHAR(10),
ADD
  COLUMN IF NOT EXISTS value_estimated_at TIMESTAMPTZ;

-- ============================================
-- Token decomposition cache (for local token type detection)
-- ============================================
CREATE TABLE IF NOT EXISTS battlechainindexer_agreement.token_decomposition (
  token_address CHAR(42) PRIMARY KEY,
  decomposition_type VARCHAR(20) NOT NULL, -- erc4626 / uniswap_v2 / compound / aave / wrapper / unknown
  underlying_tokens JSONB, -- [{address, decimals}]
  source VARCHAR(20) NOT NULL DEFAULT 'auto_detected', -- auto_detected / admin_override
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_ratio_update TIMESTAMPTZ,
  cached_ratios JSONB -- [{underlyingAddress, ratio}]
);

SELECT
  'Agreement current state and accounts tables created successfully!' AS status;