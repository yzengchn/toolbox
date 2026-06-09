export type LeafletApi = typeof import('leaflet')

let leafletApi: LeafletApi | null = null
let leafletModulePromise: Promise<LeafletApi> | null = null

export function getLoadedLeaflet(): LeafletApi | null {
  return leafletApi
}

export function loadLeaflet(): Promise<LeafletApi> {
  if (leafletApi) {
    return Promise.resolve(leafletApi)
  }

  if (!leafletModulePromise) {
    leafletModulePromise = Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css')
    ])
      .then(([module]) => {
        leafletApi = module
        return module
      })
      .catch((error) => {
        leafletModulePromise = null
        throw error
      })
  }

  return leafletModulePromise
}
