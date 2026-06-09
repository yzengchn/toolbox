import { defineAsyncComponent, type Component } from 'vue'

const Base64Encoder = defineAsyncComponent(() => import('./Base64Encoder.vue'))
const Base64ImageTool = defineAsyncComponent(() => import('../utilities/Base64ImageTool.vue'))
const ColorConverter = defineAsyncComponent(() => import('../utilities/ColorConverter.vue'))
const JwtDecoder = defineAsyncComponent(() => import('./JwtDecoder.vue'))
const HashCalculator = defineAsyncComponent(() => import('./HashCalculator.vue'))
const EncryptionTool = defineAsyncComponent(() => import('./EncryptionTool.vue'))

export const encodingToolComponents = {
  'base64-encoder': Base64Encoder,
  'base64-image': Base64ImageTool,
  'color-converter': ColorConverter,
  'jwt-decoder': JwtDecoder,
  'encryption-tool': EncryptionTool,
  'hash-calculator': HashCalculator
} satisfies Record<string, Component>
