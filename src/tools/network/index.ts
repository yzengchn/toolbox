import { defineAsyncComponent, type Component } from 'vue'

const UserAgentParser = defineAsyncComponent(() => import('./UserAgentParser.vue'))
const HttpStatus = defineAsyncComponent(() => import('./HttpStatus.vue'))
const SubnetCalculator = defineAsyncComponent(() => import('./SubnetCalculator.vue'))
const PortScanner = defineAsyncComponent(() => import('./PortScanner.vue'))
const UrlEncoder = defineAsyncComponent(() => import('./UrlEncoder.vue'))

export const networkToolComponents = {
  'subnet-calculator': SubnetCalculator,
  'port-scanner': PortScanner,
  'url-encoder': UrlEncoder,
  'user-agent-parser': UserAgentParser,
  'http-status': HttpStatus
} satisfies Record<string, Component>
