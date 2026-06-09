import { defineAsyncComponent, type Component } from 'vue'

const PasswordGenerator = defineAsyncComponent(() => import('./PasswordGenerator.vue'))
const QrCodeGenerator = defineAsyncComponent(() => import('./QrCodeGenerator.vue'))
const RegexTester = defineAsyncComponent(() => import('./RegexTester.vue'))
const UuidGenerator = defineAsyncComponent(() => import('./UuidGenerator.vue'))

export const utilitiesToolComponents = {
  'password-generator': PasswordGenerator,
  'regex-tester': RegexTester,
  'uuid-generator': UuidGenerator,
  'qrcode-generator': QrCodeGenerator
} satisfies Record<string, Component>
