import type { NetworkConfig, RuntimeConfig } from "@/configs";

import { checksumAddress } from "@/utils/formatters";

export const DEFAULT_NETWORK: NetworkConfig = {
  groupId: "battlechain",
  apiUrl: "https://block-explorer-api.testnet.battlechain.com",
  verificationApiUrl: "https://block-explorer-api.testnet.battlechain.com/api",
  bridgeUrl: "https://portal.battlechain.com/bridge/?network=sepolia",
  hostnames: ["https://block-explorer.testnet.battlechain.com"],
  icon: "/images/icons/zksync-arrows.svg",
  l1ExplorerUrl: "https://sepolia.etherscan.io",
  l2ChainId: 300,
  l2NetworkName: "Battle Chain Testnet",
  maintenance: false,
  name: "testnet",
  published: true,
  rpcUrl: "http://testnet.battlechain.com",
  baseTokenAddress: checksumAddress("0x000000000000000000000000000000000000800A"),
  excludedFromBattlechain: [
    checksumAddress("0x0000000000000000000000000000000000008001"),
    checksumAddress("0x0000000000000000000000000000000000008002"),
    checksumAddress("0x0000000000000000000000000000000000008003"),
    checksumAddress("0x0000000000000000000000000000000000008004"),
    checksumAddress("0x0000000000000000000000000000000000008005"),
    checksumAddress("0x0000000000000000000000000000000000008006"),
    checksumAddress("0x0000000000000000000000000000000000008007"),
    checksumAddress("0x0000000000000000000000000000000000008008"),
    checksumAddress("0x0000000000000000000000000000000000008009"),
    checksumAddress("0x000000000000000000000000000000000000800A"),
    checksumAddress("0x000000000000000000000000000000000000800B"),
    checksumAddress("0x000000000000000000000000000000000000800C"),
    checksumAddress("0x000000000000000000000000000000000000800D"),
    checksumAddress("0x000000000000000000000000000000000000800E"),
    checksumAddress("0x000000000000000000000000000000000000800F"),
    checksumAddress("0x0000000000000000000000000000000000008010"),
    checksumAddress("0x0000000000000000000000000000000000008011"),
    checksumAddress("0x0000000000000000000000000000000000008012"),
    checksumAddress("0x0000000000000000000000000000000000010000"),
    checksumAddress("0x0000000000000000000000000000000000010001"),
    checksumAddress("0x0000000000000000000000000000000000010002"),
    checksumAddress("0x0000000000000000000000000000000000010003"),
    checksumAddress("0x0000000000000000000000000000000000010004"),
    checksumAddress("0x0000000000000000000000000000000000010005")
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
