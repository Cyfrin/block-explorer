<template>
  <Popup :opened="isOpen">
    <RequestUnderAttackContent
      ref="contentRef"
      :contract-address="contractAddress"
      @close="handleClose"
      @success="handleSuccess"
    />
  </Popup>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";

import Popup from "@/components/common/Popup.vue";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Component used in template
import RequestUnderAttackContent from "@/components/contract/RequestUnderAttackContent.vue";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  contractAddress: {
    type: String,
    required: true,
  },
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "success"): void;
}>();

const contentRef = ref<InstanceType<typeof RequestUnderAttackContent> | null>(null);

const handleClose = () => {
  emit("close");
};

const handleSuccess = () => {
  emit("success");
};

// Reset form when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && contentRef.value) {
      contentRef.value.reset();
    }
  }
);
</script>
