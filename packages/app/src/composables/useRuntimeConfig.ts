import type { NetworkConfig, RuntimeConfig } from "@/configs";

import { checksumAddress } from "@/utils/formatters";

export const DEFAULT_NETWORK: NetworkConfig = {
  groupId: "battlechain",
  apiUrl: "https://block-explorer-api.mainnet.battlechain.com",
  verificationApiUrl: "https://block-explorer-api.mainnet.battlechain.com/api",
  bridgeUrl: "https://bridge.battlechain.com",
  hostnames: ["https://block-explorer.mainnet.battlechain.com"],
  icon: "/images/icons/zksync-arrows.svg",
  l1ExplorerUrl: "https://etherscan.io",
  l2ChainId: 626,
  l2NetworkName: "BattleChain Mainnet",
  maintenance: false,
  name: "mainnet",
  published: true,
  rpcUrl: "https://mainnet.battlechain.com",
  baseTokenAddress: checksumAddress("0x0000000000000000000000000000000000000001"),
  excludedFromBattlechain: [
    checksumAddress("0x000000000000000000000000000000000000800f"),
    checksumAddress("0x0000000000000000000000000000000000010001"),
    checksumAddress("0x0000000000000000000000000000000000010002"),
    checksumAddress("0x0000000000000000000000000000000000010003"),
    checksumAddress("0x0000000000000000000000000000000000010004"),
    checksumAddress("0x0000000000000000000000000000000000010005"),
    checksumAddress("0x0000000000000000000000000000000000010007"),
    checksumAddress("0x000000000000000000000000000000000001000a"),
    checksumAddress("0x000000000000000000000000000000000001000b"),
    checksumAddress("0x000000000000000000000000000000000001000c"),
  ],
};

export default (): RuntimeConfig => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const runtimeConfig = window && window["##runtimeConfig"];

  return {
    version: import.meta.env?.VITE_VERSION || "localhost",
    sentryDSN: runtimeConfig?.sentryDSN || import.meta.env?.VITE_SENTRY_DSN,
    appEnvironment: runtimeConfig?.appEnvironment || import.meta.env?.VITE_APP_ENVIRONMENT || "default",
    environmentConfig: runtimeConfig?.environmentConfig,
  };
};
