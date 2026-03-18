<template>
  <a
    v-if="network === 'L1' && !!currentNetwork.l1ExplorerUrl"
    target="_blank"
    :href="`${currentNetwork.l1ExplorerUrl}/${props.isTokenAddress ? `token` : `address`}/${formattedAddress}`"
  >
    <slot>
      {{ formattedAddress }}
    </slot>
  </a>
  <span v-else-if="network === 'L1' && !currentNetwork.l1ExplorerUrl">
    <slot>
      {{ formattedAddress }}
    </slot>
  </span>
  <a v-else-if="newTab" :href="localUrl" target="_blank" rel="noopener noreferrer">
    <slot>
      {{ formattedAddress }}
    </slot>
  </a>
  <router-link v-else :to="{ name: props.isTokenAddress ? `token` : `address`, params: { address: formattedAddress } }">
    <slot>
      {{ formattedAddress }}
    </slot>
  </router-link>
</template>

<script lang="ts" setup>
import { computed, type PropType } from "vue";
import { useRouter } from "vue-router";

import useContext from "@/composables/useContext";

import type { Address } from "@/types";
import type { NetworkOrigin } from "@/types";

import { checksumAddress } from "@/utils/formatters";

const props = defineProps({
  address: {
    type: String as PropType<Address>,
    default: "",
    required: true,
  },
  network: {
    type: String as PropType<NetworkOrigin>,
    default: "L2",
  },
  isTokenAddress: {
    type: Boolean,
    default: false,
    required: false,
  },
  newTab: {
    type: Boolean,
    default: false,
  },
});

const router = useRouter();
const { currentNetwork } = useContext();
const formattedAddress = computed(() => checksumAddress(props.address));
const localUrl = computed(() => {
  const resolved = router.resolve({
    name: props.isTokenAddress ? "token" : "address",
    params: { address: formattedAddress.value },
  });
  return resolved.href;
});
</script>
