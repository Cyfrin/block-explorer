import { $fetch } from "ohmyfetch";

import useContext from "./useContext";
import { FetchInstance } from "./useFetchInstance";

interface OpenChainMethod {
  name: string;
  filtered: boolean;
}

interface OpenChainLookupResponse {
  ok: boolean;
  result: {
    function?: Record<string, OpenChainMethod[]>;
    event?: Record<string, OpenChainMethod[]>;
  };
}

interface SignatureLookupResponse {
  status: string;
  result: Record<string, { name: string }[] | null>;
}

// Parses the OpenChain API response to extract method/event names
function parseOpenChainResult(data: Record<string, OpenChainMethod[]> | undefined): Record<string, string> {
  const names: Record<string, string> = {};
  if (!data) return names;

  Object.entries(data).forEach(([hash, items]) => {
    if (Array.isArray(items)) {
      items.forEach((item) => {
        if (item?.name && item.name.includes("(")) {
          names[hash] = item.name;
        }
      });
    }
  });

  return names;
}

export async function fetchMethodNames(sighashes: string[]): Promise<Record<string, string>> {
  if (sighashes.length === 0) return {};

  try {
    const response = await $fetch<OpenChainLookupResponse>(
      "https://api.4byte.sourcify.dev/signature-database/v1/lookup",
      {
        method: "GET",
        params: { function: sighashes.join(","), filter: true },
        headers: { accept: "application/json" },
      }
    );
    // only care about functions here
    return parseOpenChainResult(response?.result?.function);
  } catch (error) {
    console.error("Error fetching method names:", error);
    return {};
  }
}

export async function fetchEventNames(topicHashes: string[]): Promise<Record<string, string>> {
  if (topicHashes.length === 0) return {};

  try {
    const response = await $fetch<OpenChainLookupResponse>(
      "https://api.4byte.sourcify.dev/signature-database/v1/lookup",
      {
        method: "GET",
        params: { event: topicHashes.join(","), filter: true },
        headers: { accept: "application/json" },
      }
    );
    // only care about events here
    return parseOpenChainResult(response?.result?.event);
  } catch (error) {
    console.error("Error fetching event names:", error);
    return {};
  }
}

// Error selectors use the same 4-byte hash as function selectors,
// so we look them up under the "function" key in the signature database.
export async function fetchErrorSignatures(
  selectors: string[],
  context = useContext()
): Promise<Record<string, string>> {
  if (selectors.length === 0) return {};

  // Try our own signature database (via API proxy) first
  const verificationApiUrl = context.currentNetwork.value.verificationApiUrl;
  if (verificationApiUrl) {
    try {
      const response = await FetchInstance.verificationApi(context)<SignatureLookupResponse>(
        `?module=contract&action=getsignatures&hashes=${selectors.join(",")}`
      );
      if (response?.status === "1" && response.result) {
        const names: Record<string, string> = {};
        Object.entries(response.result).forEach(([hash, items]) => {
          if (Array.isArray(items)) {
            const match = items.find((item) => item?.name?.includes("("));
            if (match) {
              names[hash] = match.name;
            }
          }
        });
        // Return if we found any matches
        if (Object.keys(names).length > 0) {
          return names;
        }
      }
    } catch {
      // Fall through to public API
    }
  }

  // Fallback to public 4byte API
  return fetchMethodNames(selectors);
}
