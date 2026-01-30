<template>
  <Popup :opened="isOpen">
    <GoToProductionContent
      ref="contentRef"
      :contract-address="contractAddress"
      :agreement-address="agreementAddress"
      @close="handleClose"
      @success="handleSuccess"
    />
  </Popup>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";

import Popup from "@/components/common/Popup.vue";

import type GoToProductionContent from "@/components/contract/GoToProductionContent.vue";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  contractAddress: {
    type: String,
    required: true,
  },
  agreementAddress: {
    type: String,
    required: true,
  },
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "success"): void;
}>();

const contentRef = ref<InstanceType<typeof GoToProductionContent> | null>(null);

const handleClose = () => {
  emit("close");
};

const handleSuccess = () => {
  emit("success");
};

// Reset state when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && contentRef.value) {
      contentRef.value.reset();
    }
  }
);
</script>
