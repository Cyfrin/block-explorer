import { ref } from "vue";

import { Interface } from "ethers";

import useAddress from "./useAddress";
import useContext from "./useContext";
import useContractABI from "./useContractABI";
import { fetchErrorSignatures } from "./useOpenChain";

import type { AbiFragment } from "./useAddress";
import type { Address } from "@/types";

import { parseErrorSignature } from "@/utils/parseSignature";

export type DecodedRevertReason = {
  raw: string;
  decoded?: {
    name: string;
    signature: string;
    args: Array<{ name: string; type: string; value: string }>;
  };
  isPartialDecoding?: boolean;
};

function tryDecodeErrorWithABI(revertData: string, abi: AbiFragment[]): DecodedRevertReason["decoded"] | undefined {
  try {
    const iface = new Interface(abi);
    const parsed = iface.parseError(revertData);
    if (!parsed) return undefined;
    return {
      name: parsed.name,
      signature: parsed.signature,
      args: parsed.fragment.inputs.map((input, index) => ({
        name: input.name || `arg${index}`,
        type: input.type,
        value: parsed.args[index]?.toString() ?? "",
      })),
    };
  } catch {
    return undefined;
  }
}

export default (context = useContext()) => {
  const {
    collection: ABICollection,
    isRequestFailed: isABIRequestFailed,
    getCollection: getABICollection,
  } = useContractABI(context);
  const { getContractProxyInfo } = useAddress(context);

  const decodedRevertReason = ref<DecodedRevertReason | null>(null);
  const isDecodePending = ref(false);

  const decodeRevertReason = async (rawReason: string, contractAddress: Address | null) => {
    if (!rawReason) {
      decodedRevertReason.value = null;
      return;
    }

    // If it doesn't start with 0x, it's already a human-readable string
    if (!rawReason.startsWith("0x")) {
      decodedRevertReason.value = { raw: rawReason };
      return;
    }

    isDecodePending.value = true;
    const result: DecodedRevertReason = { raw: rawReason };

    try {
      // Try decoding with the top-level contract's ABI
      if (contractAddress) {
        await getABICollection([contractAddress]);
        if (!isABIRequestFailed.value) {
          const contractAbi = ABICollection.value[contractAddress];
          if (contractAbi) {
            const decoded = tryDecodeErrorWithABI(rawReason, contractAbi);
            if (decoded) {
              result.decoded = decoded;
              decodedRevertReason.value = result;
              return;
            }
          }

          // Try proxy implementation ABI
          const proxyInfo = await getContractProxyInfo(contractAddress);
          if (proxyInfo?.implementation.verificationInfo) {
            const decoded = tryDecodeErrorWithABI(rawReason, proxyInfo.implementation.verificationInfo.abi);
            if (decoded) {
              result.decoded = decoded;
              decodedRevertReason.value = result;
              return;
            }
          }
        }
      }

      // Try signature database lookup for the 4-byte selector
      const selector = rawReason.slice(0, 10);
      if (selector.length === 10) {
        const signatureMap = await fetchErrorSignatures([selector], context);
        const signature = signatureMap[selector];
        if (signature) {
          const parsedSig = parseErrorSignature(signature);
          if (parsedSig) {
            result.decoded = {
              name: parsedSig.name,
              signature,
              args: parsedSig.inputs.map((input) => ({
                ...input,
                value: "",
              })),
            };
            result.isPartialDecoding = true;
          }
        }
      }
    } catch {
      // Decoding failed — result stays with just raw hex
    } finally {
      decodedRevertReason.value = result;
      isDecodePending.value = false;
    }
  };

  return {
    decodedRevertReason,
    isDecodePending,
    decodeRevertReason,
  };
};
