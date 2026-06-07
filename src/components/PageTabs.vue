<template>
  <n-tabs
    v-bind="$attrs"
    :value="value"
    type="line"
    animated
    class="page-tabs"
    @update:value="emit('update:value', $event)"
  >
    <slot />
  </n-tabs>
</template>

<script setup lang="ts">
import { NTabs } from 'naive-ui'

type PageTabValue = string | number

defineOptions({
  inheritAttrs: false
})

defineProps<{
  value?: PageTabValue
}>()

const emit = defineEmits<{
  'update:value': [value: PageTabValue]
}>()
</script>

<style scoped>
.page-tabs :deep(.n-tabs-tab) {
  min-width: max-content;
}

.page-tabs :deep(.n-tabs-pane-wrapper) {
  min-height: 0;
}

.page-tabs :deep(.n-tab-pane) {
  padding-top: var(--spacing-sm) !important;
}
</style>
