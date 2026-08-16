/* Hand-written Remote contribution for dsh-bottom-bar (plain-JS package, no
   Typert generator). Host SRC discovery resolves by method name; the static
   client mounts this contribution at runtime via ctx.remote.$mount(...).
   TYPERT_JSON is a passthrough schema (no zod dependency): parse returns the
   value unchanged, so every parameter/result crosses as raw JSON. */
const TYPERT_JSON = { _zod: {}, parse: (v) => v }

export const TYPERT_REMOTE = {
  package: '@kc0ed/dsh-bottom-bar',
  descriptors: [
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
}

export default TYPERT_REMOTE
