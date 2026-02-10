# BattleChain Block Explorer API
## Overview

Block explorer API for the BattleChain network, forked from the ZKsync Era Block Explorer API.

The service provides three sets of endpoints:
1. **`/api/*`** - External API endpoints similar to [Etherscan API](https://docs.etherscan.io), designed for direct external usage.
2. **`/battlechain/*`** - BattleChain-specific endpoints for querying Safe Harbor agreement data, contract states, authorized owners, and attack moderators. See the [root README](/README.md#battlechain-api) for a full endpoint list.
3. **Other endpoints** - Designed to be used by the front-end [App](/packages/app) only.

The service must be connected to the [Block explorer Worker](/packages/worker) database. BattleChain data is indexed into the `battlechain` schema by the [BattleChain Indexer](/packages/battlechain-indexer).

## Installation

```bash
$ npm install
```

## Setting up env variables

- Create `.env` file in the `api` package folder and copy paste `.env.example` content in there.
```
cp .env.example .env
```
- Set up env variables for Worker Postgres database connection. By default it points to `postgres://postgres:postgres@localhost:5432/block-explorer`.
You need to have a running Worker database, for instructions on how to run the worker service see [Block explorer Worker](/packages/worker). Set the following env variables to point the service to your worker database:
  - `DATABASE_URL`
  - `DATABASE_REPLICA_URL_<<replica_index>>`
  - `DATABASE_CONNECTION_IDLE_TIMEOUT_MS`
  - `DATABASE_CONNECTION_POOL_SIZE`
- Set `CONTRACT_VERIFICATION_API_URL` to your verification API URL.
- Set `CHAIN_ID` to your chain id.
- Set `BATTLECHAIN_RPC_URL` to your chain's JSON-RPC URL (e.g. `http://localhost:3050`). This enables on-chain fetching of agreement details (protocol name, bounty terms, etc.) via a polling job that runs every 10 seconds. Falls back to `BLOCKCHAIN_RPC_URL` if not set. If neither is set, agreement details will only contain data captured by the indexer.

## Custom base token configuration
For networks with a custom base token, there are a number of environment variables used to configure custom base and ETH tokens:
- `BASE_TOKEN_L1_ADDRESS` - required, example: `0xB44A106F271944fEc1c27cd60b8D6C8792df86d8`. Base token L1 address can be fetched using the RPC call:
  ```
  curl http://localhost:3050 \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"method":"zks_getBaseTokenL1Address","params":[],"id":1,"jsonrpc":"2.0"}'
  ```
  or SDK:
  ```
  import { Provider } from "zksync-ethers";

  async function main() {
      const l2provider = new Provider("http://localhost:3050");
      const baseTokenAddress = await l2provider.getBaseTokenContractAddress();
      console.log('baseTokenAddress', baseTokenAddress);
  }
  main()
      .then()
      .catch((error) => {
          console.error(error);
          process.exitCode = 1;
      });
  ```
- `BASE_TOKEN_SYMBOL` - required, example: `ZK`
- `BASE_TOKEN_NAME` - required, example: `ZK`
- `BASE_TOKEN_DECIMALS` - required, example: `18`
- `BASE_TOKEN_LIQUIDITY` -  optional, example: `20000`
- `BASE_TOKEN_ICON_URL` - optional, example: `https://assets.coingecko.com/coins/images/279/large/ethereum.png?1698873266`
- `BASE_TOKEN_USDPRICE` - optional, example: `3300.30`.

- `ETH_TOKEN_L2_ADDRESS` - required, example: `0x642C0689b87dEa060B9f0E2e715DaB8564840861`. Eth L2  address can be calculated using SDK:
  ```
  import { utils, Provider } from "zksync-ethers";

  async function main() {
      const l2provider = new Provider("http://localhost:3050");
      const ethL2Address = await l2provider.l2TokenAddress(utils.ETH_ADDRESS);
      console.log('ethL2Address', ethL2Address);
  }
  main()
      .then()
      .catch((error) => {
          console.error(error);
          process.exitCode = 1;
      });
  ```
- `ETH_TOKEN_NAME` - optional, default is `Ether`
- `ETH_TOKEN_SYMBOL` - optional, default is `ETH`
- `ETH_TOKEN_DECIMALS` - optional, default is `18`
- `ETH_TOKEN_LIQUIDITY` - optional, example: `20000`
- `ETH_TOKEN_ICON_URL` - optional, default (ETH icon) is: `https://assets.coingecko.com/coins/images/279/large/ethereum.png?1698873266`
- `ETH_TOKEN_USDPRICE` - optional, example: `3300.30`.

## Running the app

```bash
# development
$ npm run dev

# watch mode
$ npm run dev:watch

# debug mode
$ npm run dev:debug

# production mode
$ npm run start
```

## Test

```bash
# unit tests
$ npm run test

# unit tests debug mode
$ npm run test:debug

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Docs
Locally Swagger docs are available at http://localhost:3020/docs. JSON version - http://localhost:3020/docs-json. BattleChain endpoints are grouped under the "BattleChain" tag.

## Development

### Linter
Run `npm run lint` to make sure the code base follows configured linter rules.

### Performance tests
There are number of [artillery](https://www.artillery.io/docs) configs in `/performance` folder. 

`/performance/load-test.yaml` is the load test config that contains requests to all API endpoints. It is used to simulate the number of concurrent users and to reach the desired API RPS.

Before running it, check if the config has desired phases and run it with the following command:

```
artillery run ./performance/load-test.yaml -e <name of the environment>
```

supported environments:
* local

Feel free to add other API requests to the config if anything is missing. Keep in mind that performance tests may affect the running environment or/and any of its dependencies.

To output performance results to a file use next command:
```
artillery run ./performance/load-test.yaml -e testnet -o ./performance/29-06/testnet.json
```

for more command options check [official artillery docs](https://www.artillery.io/docs).
