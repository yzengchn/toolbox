import { defineAsyncComponent, type Component } from 'vue'

const loadEncodingTools = () => import('./components')

const Base64Encoder = defineAsyncComponent(() => loadEncodingTools().then(module => module.Base64Encoder))
const Base64ImageTool = defineAsyncComponent(() => loadEncodingTools().then(module => module.Base64ImageTool))
const ColorConverter = defineAsyncComponent(() => loadEncodingTools().then(module => module.ColorConverter))
const JwtDecoder = defineAsyncComponent(() => loadEncodingTools().then(module => module.JwtDecoder))
const HashCalculator = defineAsyncComponent(() => loadEncodingTools().then(module => module.HashCalculator))
const EncryptionTool = defineAsyncComponent(() => loadEncodingTools().then(module => module.EncryptionTool))

export const encodingToolComponents = {
  'base64-encoder': Base64Encoder,
  'base64-image': Base64ImageTool,
  'color-converter': ColorConverter,
  'jwt-decoder': JwtDecoder,
  'encryption-tool': EncryptionTool,
  'hash-calculator': HashCalculator
} satisfies Record<string, Component>
