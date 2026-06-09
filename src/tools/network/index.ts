import { defineAsyncComponent, type Component } from 'vue'

const loadNetworkTools = () => import('./components')

const IpLookup = defineAsyncComponent(() => loadNetworkTools().then(module => module.IpLookup))
const UserAgentParser = defineAsyncComponent(() => loadNetworkTools().then(module => module.UserAgentParser))
const HttpStatus = defineAsyncComponent(() => loadNetworkTools().then(module => module.HttpStatus))
const SubnetCalculator = defineAsyncComponent(() => loadNetworkTools().then(module => module.SubnetCalculator))
const PortScanner = defineAsyncComponent(() => loadNetworkTools().then(module => module.PortScanner))
const UrlEncoder = defineAsyncComponent(() => loadNetworkTools().then(module => module.UrlEncoder))

export const networkToolComponents = {
  'ip-lookup': IpLookup,
  'subnet-calculator': SubnetCalculator,
  'port-scanner': PortScanner,
  'url-encoder': UrlEncoder,
  'user-agent-parser': UserAgentParser,
  'http-status': HttpStatus
} satisfies Record<string, Component>
