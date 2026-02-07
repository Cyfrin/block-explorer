# Using forked rindexer with tuple[] JSONB support
# Fork: https://github.com/cyfrin/rindexer
# Fix: tuple[] (array of structs) now stored as JSONB instead of panicking
FROM ghcr.io/cyfrin/rindexer:sha-4c1f59a

WORKDIR /app

# Install tools needed for address loading, config generation, and DB setup
USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends jq gettext-base postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Copy SQL scripts for database setup (agreement_current_state table and triggers)
COPY sql/ ./sql/

# Copy configuration template and ABIs
COPY rindexer.yaml.template .
COPY abis/ ./abis/

# rindexer expects these environment variables (set by entrypoint or env):
# - DATABASE_URL: PostgreSQL connection string
# - BLOCKCHAIN_RPC_URL: RPC endpoint for the chain
# - ATTACK_REGISTRY_ADDRESS: Address of AttackRegistry contract
# - AGREEMENT_FACTORY_ADDRESS: Address of AgreementFactory contract
# - SAFE_HARBOR_REGISTRY_ADDRESS: Address of BattleChainSafeHarborRegistry contract
# - START_BLOCK: Block number to start indexing from
# - CHAIN_ID: Chain ID of the network

# Use entrypoint to wait for addresses and generate config
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["start", "all"]
