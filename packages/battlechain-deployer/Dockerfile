# BattleChain Contract Deployer
# Uses foundry-zksync for zkSync-compatible smart contract deployment

FROM ubuntu:22.04

WORKDIR /app

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        git \
        jq \
        ca-certificates \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 foundry

# Install foundry-zksync
RUN curl -L https://raw.githubusercontent.com/matter-labs/foundry-zksync/main/install-foundry-zksync | bash
ENV PATH="/root/.foundry/bin:${PATH}"

# Verify installation
RUN forge --version && cast --version

# Copy deployment scripts
COPY deploy.sh /app/deploy.sh
COPY seed-data.sh /app/seed-data.sh

RUN chmod +x /app/deploy.sh /app/seed-data.sh

# Contracts are mounted at runtime via volume
# This allows using either submodule or external path

ENTRYPOINT ["/app/deploy.sh"]
