import { computed } from "vue";

import useContext from "./useContext";

import type { ComputedRef, Ref } from "vue";

export default function useIsBattlechainExcluded(
  contractAddress: Ref<string> | ComputedRef<string>,
  context = useContext()
) {
  const isExcluded = computed(() => {
    const excluded = context.currentNetwork.value.excludedFromBattlechain ?? [];
    const address = contractAddress.value.toLowerCase();
    return excluded.some((addr) => addr.toLowerCase() === address);
  });

  return { isExcluded };
}
