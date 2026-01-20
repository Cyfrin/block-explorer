FROM ghcr.io/joshstevens19/rindexer:latest

WORKDIR /app

# Copy configuration and ABIs
COPY rindexer.yaml .
COPY abis/ ./abis/

# rindexer expects these environment variables:
# - DATABASE_URL: PostgreSQL connection string
# - BLOCKCHAIN_RPC_URL: RPC endpoint for the chain
# - ATTACK_REGISTRY_ADDRESS: Address of AttackRegistry contract
# - AGREEMENT_FACTORY_ADDRESS: Address of AgreementFactory contract
# - START_BLOCK: Block number to start indexing from
# - CHAIN_ID: Chain ID of the network

CMD ["rindexer", "start", "all"]
