/* Host FaceModel reflection for dsh-bottom-bar. Consumed by dsh-typert-loader
   at mount time (contributes the host face to the Typert registry); the running
   Host also falls back to SRC discovery. TYPERT_JSON is a passthrough schema
   (no zod dependency): parse returns the value unchanged. */
const TYPERT_JSON = { _zod: {}, parse: (v) => v }

export const TYPERT = {
  package: '@kc0ed/dsh-bottom-bar',
  face: 'host',
  schemas: [],
  model: {
    services: [],
    events: [],
    objects: [],
  },
  invocations: [
    {
      id: 'dsh-bottom-bar#bottomBar/estimateCost',
      service: 'bottomBar',
      namespace: 'bottomBar',
      method: 'estimateCost',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }],
      result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON },
    },
    {
      id: 'dsh-bottom-bar#bottomBar/getClientUsage',
      service: 'bottomBar',
      namespace: 'bottomBar',
      method: 'getClientUsage',
      invocation: { kind: 'direct' },
      parameters: [],
      result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON },
    },
    {
      id: 'dsh-bottom-bar#bottomBar/getConfig',
      service: 'bottomBar',
      namespace: 'bottomBar',
      method: 'getConfig',
      invocation: { kind: 'direct' },
      parameters: [],
      result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON },
    },
    {
      id: 'dsh-bottom-bar#bottomBar/setConfig',
      service: 'bottomBar',
      namespace: 'bottomBar',
      method: 'setConfig',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }],
      result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON },
    },
    {
      id: 'dsh-bottom-bar#bottomBar/resetConfig',
      service: 'bottomBar',
      namespace: 'bottomBar',
      method: 'resetConfig',
      invocation: { kind: 'direct' },
      parameters: [],
      result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON },
    },
    {
      id: 'dsh-bottom-bar#bottomBar/getPrices',
      service: 'bottomBar',
      namespace: 'bottomBar',
      method: 'getPrices',
      invocation: { kind: 'direct' },
      parameters: [],
      result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON },
    },
    {
      id: 'dsh-bottom-bar#bottomBar/setPrice',
      service: 'bottomBar',
      namespace: 'bottomBar',
      method: 'setPrice',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }],
      result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON },
    },
    {
      id: 'dsh-bottom-bar#bottomBar/removePrice',
      service: 'bottomBar',
      namespace: 'bottomBar',
      method: 'removePrice',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }],
      result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON },
    },
    {
      id: 'dsh-bottom-bar#bottomBar/resetPrices',
      service: 'bottomBar',
      namespace: 'bottomBar',
      method: 'resetPrices',
      invocation: { kind: 'direct' },
      parameters: [],
      result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON },
    },
    {
      id: 'dsh-bottom-bar#bottomBar/diagnostics',
      service: 'bottomBar',
      namespace: 'bottomBar',
      method: 'diagnostics',
      invocation: { kind: 'direct' },
      parameters: [],
      result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON },
    },
  ],
  events: [],
  objects: [],
}

export default TYPERT
