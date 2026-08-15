// ══════════════════════════════════════════════════════════════════
// 动态插件形式（cost-2 的 client half · 与静态包同步）
// ──
// 本文件由 scripts/static-to-dynamic.cjs 从 lib/client.js 机械变换生成。
// 动态形式 = 开发/正在运行的版本（harness.handle/host.call）；静态包 = 下次
// 启动生效的固化版（ctx.remote.bottomBar）。两者逻辑一致、手工同步，头部
// 修订记录逐条对应。复刻来源与上游版本见 lib/client.js 头部同步块。
// ══════════════════════════════════════════════════════════════════
return {
  inject: ['timer', 'locale', 'slots'],

                
    
    
    async apply(ctx) {
      // 修订 36（静态包）：Remote contribution——host 侧 SRC 发现按方法名路由，
      // 客户端在 apply 里运行时 $mount 本 contribution（预构建的 dsh-api-remotes
      // 不包含我们，必须自挂载），之后 ctx.get('remote.bottomBar') 才可用。
      // ⚠️ 常量必须声明在 apply 内：生成器把 factory 顶层的语句放进动态插件的
      // return 对象字面量中间（const 声明在对象里 = 语法错误）。
      const TYPERT_JSON = { _zod: {}, parse: (v) => v }
      const TYPERT_REMOTE = {
        package: 'dsh-bottom-bar',
        descriptors: [
          { id: 'dsh-bottom-bar#bottomBar/estimateCost', service: 'bottomBar', namespace: 'bottomBar', method: 'estimateCost', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/getClientUsage', service: 'bottomBar', namespace: 'bottomBar', method: 'getClientUsage', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/getConfig', service: 'bottomBar', namespace: 'bottomBar', method: 'getConfig', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/setConfig', service: 'bottomBar', namespace: 'bottomBar', method: 'setConfig', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/resetConfig', service: 'bottomBar', namespace: 'bottomBar', method: 'resetConfig', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/getPrices', service: 'bottomBar', namespace: 'bottomBar', method: 'getPrices', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/setPrice', service: 'bottomBar', namespace: 'bottomBar', method: 'setPrice', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/removePrice', service: 'bottomBar', namespace: 'bottomBar', method: 'removePrice', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/resetPrices', service: 'bottomBar', namespace: 'bottomBar', method: 'resetPrices', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/diagnostics', service: 'bottomBar', namespace: 'bottomBar', method: 'diagnostics', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
        ],
      }
      const mountSvc = ctx.get('remote')
      if (mountSvc !== undefined && typeof mountSvc.$mount === 'function') {
        try {
          await mountSvc.$mount(TYPERT_REMOTE)
        } catch (err) {
          console.error('dsh-bottom-bar: remote mount failed', err)
        }
      }
      // 修订 37c：remote 代理方法返回 {ok, value} 包装——Proxy 统一解包成裸数据
      const unwrapRemote = (r) => (r !== null && typeof r === 'object' && r.ok === true && Object.prototype.hasOwnProperty.call(r, 'value')) ? r.value : r
      const remoteRaw = ctx.get('remote.bottomBar')
      const remote = (remoteRaw !== null && remoteRaw !== undefined && typeof Proxy !== 'undefined')
        ? new Proxy(remoteRaw, {
            get(target, prop) {
              const v = target[prop]
              if (typeof v === 'function') return (...args) => Promise.resolve(v.apply(target, args)).then(unwrapRemote)
              return v
            },
          })
        : remoteRaw
        try {
          ctx.effect(() => ctx.locale.register('dsh-bottom-bar', {
            zh: { input: '输入 {input} tok · 输出 {output} tok', cacheHit: '缓存命中 {tokens} tok' },
            en: { input: 'Input {input} tok · Output {output} tok', cacheHit: 'Cache hit {tokens} tok' },
          }), 'dsh-bottom-bar: dictionaries')
        } catch (err) { console.error('dsh-bottom-bar: locale ns already registered (stale run); continuing', err) }
        const t = ctx.locale.bind('conversation')
        const tb = ctx.locale.bind('dsh-bottom-bar')
        styles.insert(`/* ══════════════════════════════════════════════════════════════════
   dsh-bottom-bar · 经典 Claude 暖纸与黑曜石精雕美学 UI
   ══════════════════════════════════════════════════════════════════ */
.dsh-stats-root {
  text-align: center;
  max-width: var(--dsh-chat-content-width);
  box-sizing: border-box;
  width: 100%;
  padding: 6px calc(var(--dsh-composer-side-clearance) + 16px) 2px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
  text-overflow: ellipsis;
  margin: 0 auto;
  font-family: var(--dsw-font-family);
  font-size: 12px;
  line-height: 22px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  display: block;
  overflow: hidden;
}
.dsh-stats-sep {
  color: var(--dsw-alias-label-tertiary);
  margin: 0 10px;
  opacity: 0.65;
  font-weight: 300;
  user-select: none;
  display: inline-block;
}
.dsh-stats-empty {
  height: 0;
  padding: 0;
  overflow: hidden;
  line-height: 0;
}

.dsh-seg {
  cursor: pointer;
  border-radius: 6px;
  padding: 2px 6px;
  margin: 0 -1px;
  transition: all 0.14s ease;
  display: inline-block;
}
.dsh-seg:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dsh-seg:active {
  transform: scale(0.97);
}

.dsh-tip {
  position: fixed;
  z-index: 1000;
  width: max-content;
  max-width: 50vw;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  box-shadow: 0 8px 24px rgba(35, 30, 20, 0.14), 0 2px 6px rgba(35, 30, 20, 0.06);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  font-size: 12.5px;
  line-height: 19px;
  white-space: pre-line;
  overflow-wrap: break-word;
  pointer-events: none;
  animation: dsh-tip-in 0.12s var(--ds-ease-in-out);
}
body[data-ds-dark-theme] .dsh-tip {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  border-color: var(--dsw-alias-border-l2);
}
.dsh-tip[data-side=top] { transform: translate(-50%, -100%); }
.dsh-tip[data-side=bottom] { transform: translate(-50%); }
@keyframes dsh-tip-in { 0% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .dsh-tip { animation: none; } }

.dsh-detail {
  position: fixed;
  z-index: 1001;
  min-width: 220px;
  max-width: min(460px, 86vw);
  max-height: 48vh;
  overflow: auto;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  box-shadow: 0 16px 40px rgba(35, 30, 20, 0.18), 0 2px 10px rgba(35, 30, 20, 0.08);
  animation: dsh-tip-in 0.12s var(--ds-ease-in-out);
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-border-l2) transparent;
}
body[data-ds-dark-theme] .dsh-detail {
  background: #242320;
  border-color: #383731;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 2px 10px rgba(0, 0, 0, 0.3);
}
.dsh-detail::-webkit-scrollbar { width: 5px; height: 5px; }
.dsh-detail::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2); border-radius: 3px; }
.dsh-detail::-webkit-scrollbar-track { background: transparent; }
.dsh-detail[data-side=top] { transform: translate(-50%, -100%); }
.dsh-detail[data-side=bottom] { transform: translate(-50%); }
.dsh-detail-title { font-weight: 600; font-size: 13px; margin-bottom: 6px; color: var(--dsw-alias-label-primary); }
.dsh-detail-row { display: flex; justify-content: space-between; gap: 20px; font-variant-numeric: tabular-nums; }
.dsh-detail-row + .dsh-detail-row { margin-top: 3px; }
.dsh-detail-sep { border-top: 1px dashed var(--dsw-alias-border-l2); margin: 8px 0; }
.dsh-detail-total { font-weight: 600; color: var(--dsw-alias-brand-primary); }
.dsh-detail-model { font-weight: 600; margin-top: 8px; color: var(--dsw-alias-brand-primary); }
.dsh-detail-empty { opacity: 0.75; margin-top: 3px; }

.dsh-comp-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 20px;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-comp-desc {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12.5px;
  line-height: 18px;
  margin: 0;
}
.dsh-comp-loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}
.dsh-comp-loading-bar {
  height: 14px;
  border-radius: 7px;
  background: var(--dsw-alias-interactive-bg-hover);
  opacity: 0.6;
  animation: dsh-loading-pulse 1.2s ease-in-out infinite;
}
.dsh-comp-loading-bar:nth-child(2) { width: 85%; animation-delay: 0.15s; }
.dsh-comp-loading-bar:nth-child(3) { width: 60%; animation-delay: 0.3s; }
.dsh-comp-warn {
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
  background: rgba(220, 53, 69, 0.08);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
}
@keyframes dsh-loading-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.85; } }

.dsh-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-module-platform);
  box-shadow: 0 1px 3px rgba(35, 30, 20, 0.03);
  box-sizing: border-box;
  max-width: 100%;
  overflow: hidden;
}
.dsh-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dsh-preview-label {
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.dsh-preview-hint {
  font-size: 11.5px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.8;
}
.dsh-preview-dock {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: #FFFFFF;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-border-l2) transparent;
}
body[data-ds-dark-theme] .dsh-preview-dock {
  background: #252420;
  border-color: #383731;
}
.dsh-preview-dock::-webkit-scrollbar {
  height: 4px;
}
.dsh-preview-dock::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-border-l2);
  border-radius: 2px;
}
.dsh-preview-line {
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 22px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: max-content;
  display: inline-flex;
  align-items: center;
}
.dsh-preview-empty {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 22px;
  text-align: center;
  padding: 4px 0;
}
.dsh-preview-seg {
  transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
  border-radius: 5px;
  padding: 2px 6px;
  box-sizing: border-box;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
}
.dsh-preview-seg:hover {
  background: rgba(193, 95, 60, 0.12);
  color: var(--dsw-alias-brand-primary);
}
body[data-ds-dark-theme] .dsh-preview-seg:hover {
  background: rgba(217, 119, 87, 0.18);
  color: #D97757;
}
.dsh-preview-hl {
  background: var(--dsw-alias-brand-primary) !important;
  color: #FFFFFF !important;
  font-weight: 500 !important;
  box-shadow: 0 1px 6px rgba(193, 95, 60, 0.35);
}
body[data-ds-dark-theme] .dsh-preview-hl {
  box-shadow: 0 1px 8px rgba(217, 119, 87, 0.45);
}
.dsh-preview-ghost {
  animation: dsh-ghost-pop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  border: 1px dashed var(--dsw-alias-brand-primary) !important;
  background: rgba(193, 95, 60, 0.15) !important;
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 500 !important;
  box-shadow: 0 0 0 1px rgba(193, 95, 60, 0.25), 0 2px 8px rgba(193, 95, 60, 0.2) !important;
}
body[data-ds-dark-theme] .dsh-preview-ghost {
  border-color: #D97757 !important;
  background: rgba(217, 119, 87, 0.20) !important;
  color: #D97757 !important;
  box-shadow: 0 0 0 1px rgba(217, 119, 87, 0.35), 0 2px 10px rgba(217, 119, 87, 0.25) !important;
}
@keyframes dsh-ghost-pop {
  0% {
    max-width: 0;
    opacity: 0;
    transform: scale(0.7) translateY(4px);
    padding-left: 0;
    padding-right: 0;
  }
  100% {
    max-width: 260px;
    opacity: 1;
    transform: scale(1) translateY(0);
    padding-left: 6px;
    padding-right: 6px;
  }
}
.dsh-comp-row.dsh-row-hovered {
  border-color: var(--dsw-alias-brand-primary) !important;
  background: var(--dsw-alias-button-floating-hover) !important;
  box-shadow: 0 0 0 1.5px var(--dsw-alias-brand-primary), 0 4px 16px rgba(193, 95, 60, 0.18) !important;
  transform: translateY(-1px) scale(1.008);
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-row-hovered {
  border-color: #D97757 !important;
  box-shadow: 0 0 0 1.5px #D97757, 0 4px 18px rgba(217, 119, 87, 0.30) !important;
}

.dsh-comp-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.dsh-drop-ind {
  position: absolute;
  left: 6px;
  right: 6px;
  height: 3px;
  border-radius: 3px;
  background: var(--dsw-alias-brand-primary);
  pointer-events: none;
  transition: top 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 10px var(--dsw-alias-brand-primary), 0 0 20px rgba(193, 95, 60, 0.6);
  z-index: 20;
}
.dsh-drop-ind::before {
  content: '';
  position: absolute;
  left: -4px;
  top: -3.5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 6px var(--dsw-alias-brand-primary);
}
.dsh-drop-ind::after {
  content: '';
  position: absolute;
  right: -4px;
  top: -3.5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 6px var(--dsw-alias-brand-primary);
}
.dsh-comp-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-module-platform);
  cursor: grab;
  will-change: transform, box-shadow, border-color;
  user-select: none;
  box-shadow: 0 1px 3px rgba(35, 30, 20, 0.03);
  transition: opacity 0.2s, border-color 0.25s, box-shadow 0.25s, transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.1), background 0.2s;
}
.dsh-comp-row:hover {
  background: var(--dsw-alias-button-floating-hover);
  border-color: var(--dsw-alias-border-l2);
}
.dsh-comp-row:active {
  cursor: grabbing;
}
.dsh-comp-row.dsh-on {
  background: #FFFFFF;
  border-color: var(--dsw-alias-border-l2);
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-on {
  background: #252420;
  border-color: #383731;
}
.dsh-comp-row.dsh-off {
  opacity: 0.52;
  background: var(--dsw-alias-bg-module-platform);
}
.dsh-comp-row.dsh-selected {
  border-color: var(--dsw-alias-brand-primary) !important;
  background: linear-gradient(90deg, rgba(193, 95, 60, 0.16) 0%, rgba(193, 95, 60, 0.06) 100%) !important;
  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 4px 18px rgba(193, 95, 60, 0.30) !important;
  transform: translateY(-1.5px) scale(1.01);
  animation: dsh-select-pulse 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dsh-select-pulse {
  0% {
    transform: scale(0.985);
    box-shadow: 0 0 0 0 rgba(193, 95, 60, 0.6);
  }
  60% {
    transform: translateY(-2px) scale(1.015);
    box-shadow: 0 0 0 4px rgba(193, 95, 60, 0.25), 0 6px 20px rgba(193, 95, 60, 0.35);
  }
  100% {
    transform: translateY(-1.5px) scale(1.01);
    box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 4px 18px rgba(193, 95, 60, 0.30);
  }
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-selected {
  background: linear-gradient(90deg, rgba(217, 119, 87, 0.24) 0%, rgba(217, 119, 87, 0.09) 100%) !important;
  border-color: #D97757 !important;
  box-shadow: 0 0 0 2px #D97757, 0 4px 22px rgba(217, 119, 87, 0.40) !important;
  transform: translateY(-1.5px) scale(1.01);
  animation: dsh-select-pulse-dark 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dsh-select-pulse-dark {
  0% {
    transform: scale(0.985);
    box-shadow: 0 0 0 0 rgba(217, 119, 87, 0.7);
  }
  60% {
    transform: translateY(-2px) scale(1.015);
    box-shadow: 0 0 0 4px rgba(217, 119, 87, 0.3), 0 6px 24px rgba(217, 119, 87, 0.45);
  }
  100% {
    transform: translateY(-1.5px) scale(1.01);
    box-shadow: 0 0 0 2px #D97757, 0 4px 22px rgba(217, 119, 87, 0.40);
  }
}
.dsh-comp-row.dsh-selected .dsh-comp-label {
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 600;
}
.dsh-comp-selected-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--dsw-alias-brand-primary);
  color: #FFFFFF !important;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(193, 95, 60, 0.4);
  user-select: none;
  cursor: pointer;
  animation: dsh-badge-pop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes dsh-badge-pop {
  0% { transform: scale(0.65); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.dsh-comp-row.dsh-dragging {
  opacity: 0.92;
  transform: scale(1.02) translateY(-2px);
  box-shadow: 0 16px 36px rgba(193, 95, 60, 0.28), 0 0 0 2px var(--dsw-alias-brand-primary) !important;
  z-index: 10;
  cursor: grabbing !important;
  filter: brightness(1.04);
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-dragging {
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65), 0 0 0 2px #D97757, 0 0 18px rgba(217, 119, 87, 0.35) !important;
  filter: brightness(1.08);
}
.dsh-comp-row.dsh-just-moved {
  animation: dsh-settle-glow 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes dsh-settle-glow {
  0% {
    border-color: var(--dsw-alias-brand-primary);
    box-shadow: 0 0 0 2.5px var(--dsw-alias-brand-primary), 0 6px 22px rgba(193, 95, 60, 0.4);
    transform: scale(1.015);
    filter: brightness(1.06);
  }
  100% {
    border-color: var(--dsw-alias-border-l2);
    box-shadow: 0 1px 3px rgba(35, 30, 20, 0.03);
    transform: scale(1);
    filter: none;
  }
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-just-moved {
  animation: dsh-settle-glow-dark 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes dsh-settle-glow-dark {
  0% {
    border-color: #D97757;
    box-shadow: 0 0 0 2.5px #D97757, 0 6px 26px rgba(217, 119, 87, 0.5);
    transform: scale(1.015);
    filter: brightness(1.12);
  }
  100% {
    border-color: #383731;
    box-shadow: none;
    transform: scale(1);
    filter: none;
  }
}
.dsh-multi-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 7px 16px;
  border-radius: 999px;
  background: rgba(44, 39, 32, 0.90);
  border: 1px solid rgba(193, 95, 60, 0.5);
  color: #FFFFFF;
  font-size: 12.5px;
  font-weight: 500;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  animation: dsh-pill-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
}
body[data-ds-dark-theme] .dsh-multi-bar {
  background: rgba(26, 25, 22, 0.94);
  border-color: rgba(217, 119, 87, 0.55);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06);
}
@keyframes dsh-pill-in {
  0% { transform: translate(-50%, 14px) scale(0.95); opacity: 0; }
  100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
}
.dsh-multi-bar-action {
  font-size: 11.5px;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 3px 10px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s ease;
}
.dsh-multi-bar-action:hover {
  background: var(--dsw-alias-brand-primary);
  border-color: var(--dsw-alias-brand-primary);
  color: #FFFFFF;
}
.dsh-price-template-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--dsw-alias-bg-module-platform);
  border: 1px solid var(--dsw-alias-border-l1);
  margin-top: 6px;
}
.dsh-price-preview-badge {
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(193, 95, 60, 0.08);
  border: 1px dashed var(--dsw-alias-brand-primary);
  display: flex;
  align-items: center;
  gap: 10px;
}
.dsh-comp-grip {
  color: var(--dsw-alias-label-tertiary);
  user-select: none;
  font-size: 14px;
  cursor: grab;
}
.dsh-comp-label-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
  overflow: hidden;
}
.dsh-comp-label {
  white-space: nowrap;
  font-size: 13.5px;
  font-weight: 500;
  flex: none;
}
.dsh-comp-sample {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.dsh-comp-row.dsh-on .dsh-comp-label {
  color: var(--dsw-alias-label-primary);
}
.dsh-comp-row.dsh-off .dsh-comp-label {
  color: var(--dsw-alias-label-tertiary);
}
.dsh-comp-row.dsh-off .dsh-comp-sample {
  opacity: 0.45;
}

.dsh-switch {
  position: relative;
  width: 34px;
  height: 20px;
  flex: none;
  cursor: pointer;
}
.dsh-switch input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
}
.dsh-switch input:disabled {
  cursor: not-allowed;
}
.dsh-switch-track {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: var(--dsw-alias-border-l2);
  transition: background 0.15s ease;
}
.dsh-switch input:checked + .dsh-switch-track {
  background: var(--dsw-alias-brand-primary);
}
.dsh-switch input:disabled + .dsh-switch-track {
  opacity: 0.4;
}
.dsh-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease;
  pointer-events: none;
}
.dsh-switch input:checked + .dsh-switch-track + .dsh-switch-knob {
  transform: translateX(14px);
}

.dsh-comp-btn {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 8px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dsh-comp-btn:hover:not(:disabled) {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-button-floating-hover);
}
.dsh-comp-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.dsh-comp-reset {
  margin-top: 4px;
  align-self: flex-start;
}
.dsh-comp-select {
  appearance: auto;
  -webkit-appearance: auto;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-primary);
  transition: all 0.15s ease;
  outline: none;
}
.dsh-comp-select:focus-visible {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px rgba(193, 95, 60, 0.18);
}

.dsh-prices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--dsw-alias-bg-module-platform);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  padding: 14px 16px;
  margin-top: 6px;
}
.dsh-price-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsh-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.dsh-price-model {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
}
.dsh-price-input {
  width: 68px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: #FFFFFF;
  color: var(--dsw-alias-label-primary);
  transition: all 0.15s ease;
  outline: none;
}
body[data-ds-dark-theme] .dsh-price-input {
  background: #181816;
  border-color: #383731;
}
.dsh-price-input:focus-visible,
.dsh-price-input:focus {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px rgba(193, 95, 60, 0.18);
}
.dsh-price-add {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--dsw-alias-border-l1);
}`)
        const usageOutputTokens = (usage) => {
          if (typeof usage !== 'object' || usage === null) return null
          const value = usage.outputTokens
          return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
        }
        const assistantStepReading = (node) => {
          const timing = node.timing
          return {
            ttftMs: timing !== undefined && timing.stepStartTime !== null && timing.firstTokenTime !== null ? Math.max(0, timing.firstTokenTime - timing.stepStartTime) : null,
            decodeMs: timing !== undefined && timing.firstTokenTime !== null ? Math.max(0, timing.completedTime - timing.firstTokenTime) : null,
            outputTokens: usageOutputTokens(node.usage),
          }
        }
        const deriveStats = (nodes) => {
          const list = Array.isArray(nodes) ? nodes : []
          const turns = new Set()
          let steps = 0, llmMs = 0, toolMs = 0, ttftMs = 0, ttftSteps = 0, decodeMs = 0, decodeTokens = 0
          for (const node of list) {
            if (node.kind === 'tool-result') {
              if (node.callTime !== null) toolMs += Math.max(0, node.time - node.callTime)
              continue
            }
            if (node.kind !== 'assistant') continue
            turns.add(node.turn)
            steps += 1
            if (node.timing !== undefined && node.timing.stepStartTime !== null) llmMs += Math.max(0, node.timing.completedTime - node.timing.stepStartTime)
            const reading = assistantStepReading(node)
            if (reading.ttftMs !== null) { ttftMs += reading.ttftMs; ttftSteps += 1 }
            if (reading.decodeMs !== null && reading.outputTokens !== null) { decodeMs += reading.decodeMs; decodeTokens += reading.outputTokens }
          }
          return { turns: turns.size, steps, llmMs, toolMs, ttftMs, ttftSteps, decodeMs, decodeTokens }
        }
        const formatTokens = (n) => {
          const scaled = (v) => v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10)
          if (n < 1e3) return String(n)
          if (n < 1e6) return scaled(n / 1e3) + 'K'
          return scaled(n / 1e6) + 'M'
        }
        const formatDuration = (ms) => {
          const s = ms / 1e3
          if (s < 60) return Math.round(s * 10) / 10 + 's'
          const whole = Math.round(s)
          return Math.floor(whole / 60) + 'm' + whole % 60 + 's'
        }
        const formatTokensPerSecond = (tps) => {
          const clamped = Math.max(0, tps)
          return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10)
        }
        const billedInputTokens = (usage) => (usage ? usage.uncachedInputTokens : 0) + (usage ? usage.cacheReadTokens : 0) + (usage ? usage.cacheWriteTokens : 0)
        const cacheHitPercent = (usage) => {
          const denominator = billedInputTokens(usage)
          return denominator === 0 ? null : Math.round(usage.cacheReadTokens / denominator * 100)
        }
        const compactMoney = (v, currency, precision) => {
          const prefix = currency === 'CNY' ? '¥' : '$'
          if (precision === 'full') return prefix + (v === 0 ? '0.0000' : v.toFixed(4))
          if (v === 0) return prefix + '0'
          if (v >= 1) return prefix + v.toFixed(2)
          if (v >= 0.01) return prefix + v.toFixed(2)
          return prefix + v.toFixed(3)
        }
        const costGroup = (estimate, precision, live) => {
          if (typeof estimate !== 'object' || estimate === null) return null
          if (!estimate.hasUsage) return null
          if (!Array.isArray(estimate.priced) || !Array.isArray(estimate.unpriced)) return null
          if (estimate.priced.length === 0) return estimate.unpriced.length > 0 ? '预估 — · 无官方价' : null
          const parts = []
          const totals = Object.assign({}, typeof estimate.totals === 'object' && estimate.totals !== null ? estimate.totals : {})
          if (live !== null && live !== undefined) totals[live.currency] = (totals[live.currency] || 0) + live.delta
          for (const key of Object.keys(totals)) parts.push(compactMoney(totals[key], key, precision))
          let text = '预估 ' + (parts.length > 0 ? parts.join(' + ') : '—')
          if (estimate.unpriced.length > 0) text += ' (+' + estimate.unpriced.length + ' 无价)'
          return text
        }
        const SEGMENT_IDS = ['counts', 'llm', 'toolCall', 'ttft', 'throughput', 'cacheHit', 'tokens', 'cost']
        const SEGMENT_LABELS = {
          counts: '轮/步', llm: 'LLM 时长', toolCall: '工具调用时长', ttft: '首 token 平均',
          throughput: '吞吐 tok/s', cacheHit: '缓存命中', tokens: '输入/输出 token', cost: '预估费用',
        }
        const PREVIEW_TEXTS = {
          counts: '12 轮 · 45 步', llm: 'LLM 2m10s', toolCall: '工具调用时长 45s', ttft: '首 token 平均 1.8s', throughput: '34.2 tok/s',
          cacheHit: { separate: '缓存命中 5.93M tok', combined: '缓存命中 97%' },
          tokens: { separate: '输入 96.3K tok · 输出 72.8K tok', combined: '输入 6.0M tok · 输出 72.8K tok' },
          cost: '预估 ¥0.36',
        }
        const DEFAULT_COMPOSITION = SEGMENT_IDS.map((id) => ({ id, enabled: true }))
        let compositionValue = null
        const compositionListeners = new Set()
        const setCompositionState = (segments) => {
          if (!Array.isArray(segments)) return
          compositionValue = segments
          for (const fn of compositionListeners) fn()
        }
        const subscribeComposition = (fn) => {
          compositionListeners.add(fn)
          return () => compositionListeners.delete(fn)
        }
        // 修订 26：错误边界——渲染崩溃时显示空占位而非 abdicate 回退官方 StatsLine
        class DockBoundary extends React.Component {
          constructor(props) {
            super(props)
            this.state = { failed: false }
          }
          static getDerivedStateFromError() {
            return { failed: true }
          }
          componentDidCatch(error) {
            console.error('dsh-bottom-bar: dock render crashed, keeping placeholder', error)
          }
          render() {
            if (this.state.failed === true) return React.createElement('div', { className: 'dsh-stats-root dsh-stats-empty' })
            return this.props.children
          }
        }
        // ── 底栏（dock stats cell） ──
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
          // 修订 37：priority -1 shadow 官方 StatsLine（官方同 id 'stats' 默认
          // priority 0；list 槽位同 id 多 entry 时最低 priority 胜出渲染）
          { name: 'conversation.composer.dock', id: 'stats', order: 0, priority: -1 },
          (props) => {
            const settledNodes = props.useSession((s) => (s !== null && s !== undefined && s.chat !== undefined && s.chat !== null && s.chat.legacy !== undefined && s.chat.legacy !== null && Array.isArray(s.chat.legacy.nodes)) ? s.chat.legacy.nodes : [])
            const usage = props.useProjection('tokenUsage')
            const projected = props.useProjection('sessionStats')
            const [estimate, setEstimate] = React.useState(null)
            // 修订 26：首帧就用已加载的配置（重挂时不再先渲染默认值）
            const [composition, setComposition] = React.useState(Array.isArray(compositionValue) ? compositionValue : null)
            const [mode, setMode] = React.useState('separate')
            const [tooltipAlways, setTooltipAlways] = React.useState(false)
            const [precision, setPrecision] = React.useState('compact')
            const [detailSeg, setDetailSeg] = React.useState(null)
            const [panelPos, setPanelPos] = React.useState(null)
            const [panelPlacement, setPanelPlacement] = React.useState('top')
            const panelRef = React.useRef(null)
            const segClickTimerRef = React.useRef(null)
            React.useEffect(() => subscribeComposition(setComposition), [])
            React.useEffect(() => {
              let alive = true
              let timer = null
              const tick = () => {
                if (!alive) return
                host.call('get-composition')
                  .then((result) => {
                    if (!alive) return
                    if (Array.isArray(result.segments)) setComposition(result.segments)
                    if (result.mode === 'separate' || result.mode === 'combined') setMode(result.mode)
                    if (typeof result.tooltip === 'string') setTooltipAlways(result.tooltip === 'always')
                    if (result.precision === 'compact' || result.precision === 'full') setPrecision(result.precision)
                  })
                  .catch((err) => console.error('dsh-bottom-bar: config poll failed', err))
                  .then(() => {
                    if (!alive) return
                    runEstimate()
                    timer = ctx.timeout(tick, 1000)
                  })
              }
              tick()
              return () => { alive = false; if (timer !== null) timer() }
            }, [])
            const estimateBusyRef = React.useRef(false)
            const usageRef = React.useRef(usage)
            const sessionRef = React.useRef(null)
            const foldedUsageRef = React.useRef(null)
            const lastFoldTimeRef = React.useRef(0)
            const disposedRef = React.useRef(false)
            const nowMs = () => (typeof Date !== 'undefined' ? Date.now() : 0)
            React.useEffect(() => () => { disposedRef.current = true }, [])
            const runEstimate = () => {
              if (estimateBusyRef.current || disposedRef.current) return
              const sid = sessionRef.current
              if (typeof sid !== 'string') return
              estimateBusyRef.current = true
              const folded = usageRef.current
              let promise
              // 修订 32：把客户端投影总量随请求捎带给 host（浏览器侧全量折叠是
              // 唯一权威源——服务端投影单元只有部分数据，实测 43M vs 253M）
              const cur = usageRef.current
              const usageArgs = (cur !== null && cur !== undefined && typeof cur === 'object')
                ? {
                    uncachedInputTokens: typeof cur.uncachedInputTokens === 'number' ? cur.uncachedInputTokens : null,
                    outputTokens: typeof cur.outputTokens === 'number' ? cur.outputTokens : null,
                    cacheReadTokens: typeof cur.cacheReadTokens === 'number' ? cur.cacheReadTokens : null,
                    cacheWriteTokens: typeof cur.cacheWriteTokens === 'number' ? cur.cacheWriteTokens : null,
                  }
                : null
              try {
                promise = host.call('estimate-cost', { sessionId: sid, usage: usageArgs })
              } catch (err) {
                console.error('dsh-bottom-bar: estimateCost call failed', err)
                estimateBusyRef.current = false
                return
              }
              promise
                .then((result) => {
                  if (sessionRef.current === sid) {
                    setEstimate(result)
                    foldedUsageRef.current = folded
                    lastFoldTimeRef.current = nowMs()
                  }
                })
                .catch(() => {})
                .then(() => { estimateBusyRef.current = false })
            }
            React.useEffect(() => {
              usageRef.current = usage
              if (sessionRef.current !== props.sessionId) {
                sessionRef.current = props.sessionId
                foldedUsageRef.current = null
                setEstimate(null)
                setDetailSeg(null)
                setPanelPos(null)
                runEstimate()
              }
            }, [props.sessionId, usage])
            const stats = React.useMemo(() => projected ?? deriveStats(settledNodes), [projected, settledNodes])
            const usageActive = usage !== null && usage !== undefined && (billedInputTokens(usage) > 0 || usage.outputTokens > 0)
            const cacheHitPct = usageActive ? cacheHitPercent(usage) : null
            // 修订 33：删除 liveDelta——修订 30-32 对账已把账本拉平到客户端全量，
            // 再按「usage 全量 − lastSample 单步」加增量会把全量重复计入（底栏 ≈ 2× 明细）；
            // 底栏费用 = 明细面板 = 账本（对账后即全量），单一数据源。
            const separate = mode === 'separate'
            const builders = {
              counts: () => stats.steps > 0 ? t('stats.counts', { turns: stats.turns, steps: stats.steps }) : null,
              llm: () => stats.llmMs > 0 ? t('stats.llm', { duration: formatDuration(stats.llmMs) }) : null,
              toolCall: () => stats.toolMs > 0 ? t('stats.toolCall', { duration: formatDuration(stats.toolMs) }) : null,
              ttft: () => stats.ttftSteps > 0 ? t('stats.ttftAverage', { duration: formatDuration(stats.ttftMs / stats.ttftSteps) }) : null,
              throughput: () => stats.decodeMs > 0 ? t('stats.tokensPerSecond', { throughput: formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1e3)) }) : null,
              cacheHit: () => usageActive && (separate ? (usage.cacheReadTokens || 0) > 0 : cacheHitPct !== null)
                ? (separate ? tb('cacheHit', { tokens: formatTokens(usage.cacheReadTokens) }) : t('stats.cacheHit', { percent: cacheHitPct }))
                : null,
              tokens: () => usageActive ? tb('input', {
                input: formatTokens(separate ? (usage.uncachedInputTokens || 0) + (usage.cacheWriteTokens || 0) : billedInputTokens(usage)),
                output: formatTokens(usage.outputTokens || 0),
              }) : null,
              cost: () => {
                if (estimate === null) return usageActive ? '计算中…' : null
                return costGroup(estimate, precision, null)
              },
            }
            // ⚠️ 修订 25：三函数必须在 children 构造之前定义（const TDZ）
            const cancelSegClick = () => {
              if (segClickTimerRef.current !== null) { segClickTimerRef.current(); segClickTimerRef.current = null }
            }
            const onSegClick = (segId, el) => {
              if (typeof window !== 'undefined' && typeof window.getSelection === 'function') {
                const sel = window.getSelection()
                if (sel !== null && sel.toString().length > 0) return
              }
              cancelSegClick()
              segClickTimerRef.current = ctx.timeout(() => {
                segClickTimerRef.current = null
                toggleDetail(segId, el)
              }, 160)
            }
            const toggleDetail = (segId, el) => {
              if (timerRef.current !== null) { timerRef.current(); timerRef.current = null }
              setPos(null)
              if (detailSeg === segId) { setDetailSeg(null); setPanelPos(null); return }
              const r = el.getBoundingClientRect()
              setPanelPlacement('top')
              setDetailSeg(segId)
              setPanelPos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
            }
            const active = Array.isArray(composition) && composition.length > 0 ? composition : DEFAULT_COMPOSITION
            const lineGroups = []
            for (const seg of active) {
              if (seg.enabled !== true) continue
              const build = builders[seg.id]
              if (build === undefined) continue
              const text = build()
              if (text === null) continue
              lineGroups.push({ id: seg.id, text })
            }
            const line = lineGroups.map((g) => g.text).join(' | ')
            const children = []
            lineGroups.forEach((group, i) => {
              if (i > 0) { children.push(React.createElement('span', { className: 'dsh-stats-sep', 'aria-hidden': true, key: 'sep' + i }, '|')); children.push(' ') }
              children.push(React.createElement('span', {
                className: 'dsh-seg', key: group.id, title: '点击查看明细',
                onClick: (e) => onSegClick(group.id, e.currentTarget),
                onDoubleClick: cancelSegClick,
              }, group.text))
            })
            const rootRef = React.useRef(null)
            const bubbleRef = React.useRef(null)
            const timerRef = React.useRef(null)
            const [truncated, setTruncated] = React.useState(false)
            const [pos, setPos] = React.useState(null)
            const [placement, setPlacement] = React.useState('top')
            React.useLayoutEffect(() => {
              const el = rootRef.current
              if (el === null) return
              const measure = () => setTruncated(el.scrollWidth > el.clientWidth)
              measure()
              if (typeof ResizeObserver === 'undefined') return
              const observer = new ResizeObserver(measure)
              observer.observe(el)
              return () => observer.disconnect()
            }, [line])
            const show = React.useCallback(() => {
              const el = rootRef.current
              if (el === null) return
              if (line === '') return
              if (detailSeg !== null) return
              if (!tooltipAlways && !truncated) return
              const r = el.getBoundingClientRect()
              setPlacement('top')
              setPos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
            }, [truncated, line, tooltipAlways, detailSeg])
            const showAfterDelay = () => {
              if (timerRef.current !== null) { timerRef.current(); timerRef.current = null }
              timerRef.current = ctx.timeout(() => { timerRef.current = null; show() }, 260)
            }
            const hide = () => {
              if (timerRef.current !== null) { timerRef.current(); timerRef.current = null }
              setPos(null)
            }
            React.useLayoutEffect(() => {
              if (pos === null) return
              const el = bubbleRef.current
              if (el === null) return
              el.style.left = pos.x + 'px'
              const r = el.getBoundingClientRect()
              let dx = 0
              const vw = typeof window !== 'undefined' ? window.innerWidth : r.right + 12
              const vh = typeof window !== 'undefined' ? window.innerHeight : r.bottom + 12
              if (r.right > vw - 12) dx = vw - 12 - r.right
              if (r.left + dx < 12) dx = 12 - r.left
              el.style.left = pos.x + dx + 'px'
              const fitsBelow = pos.bottom + 8 + r.height <= vh - 12
              const fitsAbove = pos.top - 8 - r.height >= 12
              if (placement === 'bottom' && !fitsBelow && fitsAbove) setPlacement('top')
              if (placement === 'top' && !fitsAbove && fitsBelow) setPlacement('bottom')
            }, [placement, pos])
            React.useEffect(() => () => {
              if (timerRef.current !== null) timerRef.current()
              if (segClickTimerRef.current !== null) segClickTimerRef.current()
            }, [])
            React.useEffect(() => {
              if (detailSeg === null) return
              if (typeof document === 'undefined') return
              const onDown = (e) => {
                const p = panelRef.current
                if (p !== null && p.contains(e.target)) return
                setDetailSeg(null)
                setPanelPos(null)
              }
              document.addEventListener('mousedown', onDown)
              return () => document.removeEventListener('mousedown', onDown)
            }, [detailSeg])
            React.useLayoutEffect(() => {
              if (panelPos === null) return
              const el = panelRef.current
              if (el === null) return
              el.style.left = panelPos.x + 'px'
              const r = el.getBoundingClientRect()
              let dx = 0
              const vw = typeof window !== 'undefined' ? window.innerWidth : r.right + 12
              const vh = typeof window !== 'undefined' ? window.innerHeight : r.bottom + 12
              if (r.right > vw - 12) dx = vw - 12 - r.right
              if (r.left + dx < 12) dx = 12 - r.left
              el.style.left = panelPos.x + dx + 'px'
              const fitsBelow = panelPos.bottom + 8 + r.height <= vh - 12
              const fitsAbove = panelPos.top - 8 - r.height >= 12
              if (panelPlacement === 'bottom' && !fitsBelow && fitsAbove) setPanelPlacement('top')
              if (panelPlacement === 'top' && !fitsAbove && fitsBelow) setPanelPlacement('bottom')
            }, [panelPlacement, panelPos, detailSeg])
            const segDetailRows = (segId) => {
              switch (segId) {
                case 'counts': return [['轮数', String(stats.turns)], ['步数', String(stats.steps)]]
                case 'llm': return [['LLM 总时长', formatDuration(stats.llmMs)], ['步数', String(stats.steps)], ['平均每步', stats.steps > 0 ? formatDuration(stats.llmMs / stats.steps) : '—']]
                case 'toolCall': return [['工具调用总时长', formatDuration(stats.toolMs)]]
                case 'ttft': return [['首 token 总耗时', formatDuration(stats.ttftMs)], ['步数', String(stats.ttftSteps)], ['平均', stats.ttftSteps > 0 ? formatDuration(stats.ttftMs / stats.ttftSteps) : '—']]
                case 'throughput': return [['平均吞吐', formatTokensPerSecond(stats.decodeMs > 0 ? stats.decodeTokens / (stats.decodeMs / 1e3) : 0) + ' tok/s'], ['输出 token', formatTokens(stats.decodeTokens)], ['解码时长', formatDuration(stats.decodeMs)]]
                case 'cacheHit': return usageActive
                  ? [['缓存命中', formatTokens(usage.cacheReadTokens || 0) + ' tok'], ['输入总量', formatTokens(billedInputTokens(usage)) + ' tok'], ['命中率', cacheHitPct === null ? '—' : cacheHitPct + '%']]
                  : null
                case 'tokens': return usageActive
                  ? [['未缓存输入', formatTokens(usage.uncachedInputTokens || 0) + ' tok'], ['缓存读', formatTokens(usage.cacheReadTokens || 0) + ' tok'], ['缓存写', formatTokens(usage.cacheWriteTokens || 0) + ' tok'], ['输出', formatTokens(usage.outputTokens || 0) + ' tok']]
                  : null
                default: return null
              }
            }
            const costDetail = () => {
              if (typeof estimate !== 'object' || estimate === null || !estimate.hasUsage) return null
              const nodes = []
              if (Array.isArray(estimate.priced)) {
                for (const p of estimate.priced) {
                  nodes.push(React.createElement('div', { className: 'dsh-detail-model', key: 'm' + p.model }, p.model))
                  const buckets = [
                    { label: '输入', tokens: p.uncachedInput, unit: p.priceIn, cost: p.inCost },
                    { label: '缓存读', tokens: p.cacheRead, unit: p.priceCacheRead, cost: p.cacheReadCost },
                    { label: '缓存写', tokens: p.cacheWrite, unit: p.priceCacheWrite, cost: p.cacheWriteCost },
                    { label: '输出', tokens: p.output, unit: p.priceOut, cost: p.outCost },
                  ]
                  let any = false
                  for (const b of buckets) {
                    if (!(b.tokens > 0)) continue
                    any = true
                    const unitText = b.unit === null || b.unit === undefined ? '按输入价' : compactMoney(b.unit, p.currency, 'compact') + '/1M'
                    nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'b' + p.model + b.label },
                      React.createElement('span', null, b.label + ' ' + formatTokens(b.tokens) + ' tok'),
                      React.createElement('span', null, unitText + ' → ' + compactMoney(b.cost, p.currency, 'full')),
                    ))
                  }
                  if (!any) nodes.push(React.createElement('div', { className: 'dsh-detail-empty', key: 'e' + p.model }, '（无用量）'))
                  nodes.push(React.createElement('div', { className: 'dsh-detail-row dsh-detail-total', key: 's' + p.model },
                    React.createElement('span', null, '小计'),
                    React.createElement('span', null, compactMoney(p.cost, p.currency, 'full')),
                  ))
                }
              }
              if (Array.isArray(estimate.unpriced) && estimate.unpriced.length > 0) {
                for (const u of estimate.unpriced) {
                  const toks = (u.uncachedInput || 0) + (u.cacheRead || 0) + (u.cacheWrite || 0) + (u.output || 0)
                  nodes.push(React.createElement('div', { className: 'dsh-detail-model', key: 'u' + u.model }, u.model))
                  nodes.push(React.createElement('div', { className: 'dsh-detail-empty', key: 'ue' + u.model }, '无官方价 · ' + formatTokens(toks) + ' tok'))
                }
              }
              const totals = typeof estimate.totals === 'object' && estimate.totals !== null ? estimate.totals : {}
              const totalText = Object.keys(totals).map((k) => compactMoney(totals[k], k, 'full')).join(' + ')
              nodes.push(React.createElement('div', { className: 'dsh-detail-sep', key: 'sep' }))
              nodes.push(React.createElement('div', { className: 'dsh-detail-row dsh-detail-total', key: 'tot' },
                React.createElement('span', null, '总计'),
                React.createElement('span', null, totalText),
              ))
              return nodes
            }
            const detailNodes = detailSeg === 'cost'
              ? costDetail()
              : (() => {
                const rows = segDetailRows(detailSeg)
                if (rows === null) return null
                return rows.map((row, i) => React.createElement('div', { className: 'dsh-detail-row', key: i },
                  React.createElement('span', null, row[0]),
                  React.createElement('span', null, row[1]),
                ))
              })()
            // 修订 16：永不返回 null（槽位看到 null 会回退官方 StatsLine）
            return React.createElement(DockBoundary, null,
              React.createElement(React.Fragment, null,
                React.createElement('div', {
                  className: 'dsh-stats-root' + (lineGroups.length === 0 ? ' dsh-stats-empty' : ''),
                  ref: rootRef, onMouseEnter: showAfterDelay, onMouseLeave: hide,
                }, children),
                pos !== null && React.createElement('span', {
                  ref: bubbleRef, className: 'dsh-tip', 'data-side': placement,
                  style: { left: pos.x, top: placement === 'top' ? pos.top - 8 : pos.bottom + 8 },
                }, line),
                detailSeg !== null && panelPos !== null && React.createElement('div', {
                  ref: panelRef, className: 'dsh-detail', 'data-side': panelPlacement,
                  style: { left: panelPos.x, top: panelPlacement === 'top' ? panelPos.top - 8 : panelPos.bottom + 8 },
                },
                  React.createElement('div', { className: 'dsh-detail-title' }, (SEGMENT_LABELS[detailSeg] || detailSeg) + ' 明细'),
                  detailNodes === null ? React.createElement('div', { className: 'dsh-detail-empty' }, '（暂无数据）') : detailNodes,
                ),
              ),
            )
          },
        ))
        // ── 设置页（设置 → 底栏） ──
        ctx.slots.inject('settings.section', () => ctx.slots.register(
          { name: 'settings.section', id: 'cost-estimate', order: 25, label: '底栏' },
          () => {
            const [segments, setSegments] = React.useState(Array.isArray(compositionValue) ? compositionValue : null)
            const [loaded, setLoaded] = React.useState(Array.isArray(compositionValue))
            const [mode, setMode] = React.useState('separate')
            const [tooltipAlways, setTooltipAlways] = React.useState(false)
            const [precision, setPrecision] = React.useState('compact')
            const [prices, setPrices] = React.useState(null)
            const [pricesOpen, setPricesOpen] = React.useState(false)
            const [vendorTpl, setVendorTpl] = React.useState('auto')
            const [newModel, setNewModel] = React.useState('')
            const [newIn, setNewIn] = React.useState('')
            const [customCurrency, setCustomCurrency] = React.useState('CNY')
            const [customOut, setCustomOut] = React.useState('')
            const [customRead, setCustomRead] = React.useState('')
            const [customWrite, setCustomWrite] = React.useState('')
            const [hovered, setHovered] = React.useState(null)
            const [dragFrom, setDragFrom] = React.useState(null)
            const dragFromRef = React.useRef(null)
            const [dropIndex, setDropIndex] = React.useState(null)
            const [indicatorTop, setIndicatorTop] = React.useState(null)
            const dropIndexRef = React.useRef(null)
            const listRef = React.useRef(null)
            const segmentsRef = React.useRef(null)
            const optionsRef = React.useRef({ mode: 'separate', tooltip: 'auto', precision: 'compact' })
            const rowRefs = React.useRef([])
            const flipTops = React.useRef(null)
            const previewDockRef = React.useRef(null)
            const previewSegRefs = React.useRef({})
            const [selectedIds, setSelectedIds] = React.useState(new Set())
            const selectedIdsRef = React.useRef(new Set())
            selectedIdsRef.current = selectedIds
            const lastClickedIndexRef = React.useRef(null)
            const [justMovedIds, setJustMovedIds] = React.useState(new Set())
            const [diag, setDiag] = React.useState(null)
            // 修订 34：客户端全量用量面板（浏览器侧全量折叠 = 唯一权威源）
            const [fullUsage, setFullUsage] = React.useState(null)
            React.useEffect(() => {
              const onKeyDown = (e) => {
                if (e.key === 'Escape' && selectedIdsRef.current.size > 0) {
                  setSelectedIds(new Set())
                  selectedIdsRef.current = new Set()
                }
              }
              if (typeof window !== 'undefined') window.addEventListener('keydown', onKeyDown)
              return () => { if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeyDown) }
            }, [])
            // 鼠标悬停条目时：预览区自动平滑滚动并将对应分段居中对齐；移开时保持当前视口位置，不强制回弹归零
            React.useEffect(() => {
              const dock = previewDockRef.current
              if (dock === null || dock === undefined) return
              if (hovered !== null && previewSegRefs.current[hovered]) {
                const el = previewSegRefs.current[hovered]
                const elLeft = el.offsetLeft
                const elWidth = el.offsetWidth
                const dockWidth = dock.clientWidth
                const targetScroll = Math.max(0, elLeft - (dockWidth - elWidth) / 2)
                dock.scrollTo({ left: targetScroll, behavior: 'smooth' })
              }
            }, [hovered])
            React.useEffect(() => {
              let cancelled = false
              host.call('get-composition')
                .then((result) => {
                  if (cancelled) return
                  if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                  if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                  if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                  if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
                  setLoaded(true)
                })
                .catch(() => {})
              host.call('get-prices').then((result) => { if (!cancelled && result.prices) setPrices(result.prices) }).catch(() => {})
              host.call('diagnostics').then((result) => { if (!cancelled) setDiag(result) }).catch(() => {})
              host.call('get-client-usage').then((result) => { if (!cancelled && result.usage) setFullUsage(result.usage) }).catch(() => {})
              return () => { cancelled = true }
            }, [])
            // 修订 34/42：客户端全量面板每 1s 刷新（host 侧缓存底栏捎带的用量——
            // 3s 轮询 + 底栏 1s 心跳最坏要等 4s；修订 42 降为 1s 与心跳同频，≤1s 出数）
            React.useEffect(() => {
              let alive = true
              const timer = ctx.interval(() => {
                host.call('get-client-usage').then((result) => { if (alive && result.usage) setFullUsage(result.usage) }).catch(() => {})
              }, 1000)
              return () => { alive = false; timer() }
            }, [])
            React.useEffect(() => {
              if (loaded) return
              const timer = ctx.timeout(() => setLoaded(true), 3000)
              return () => timer()
            }, [loaded])
            segmentsRef.current = segments
            optionsRef.current = { mode, tooltip: tooltipAlways ? 'always' : 'auto', precision }
            React.useLayoutEffect(() => {
              if (flipTops.current === null) return
              const tops = flipTops.current
              flipTops.current = null
              const els = rowRefs.current
              let moved = false
              for (let i = 0; i < els.length; i++) {
                const el = els[i]
                if (el === null || el === undefined) continue
                const delta = tops[i] - el.getBoundingClientRect().top
                if (delta !== 0) { moved = true; el.style.transition = 'none'; el.style.transform = 'translateY(' + delta + 'px)' }
              }
              if (!moved) return
              const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb) => ctx.timeout(cb, 16)
              raf(() => {
                for (const el of els) {
                  if (el === null || el === undefined) continue
                  el.style.transition = 'transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1.1)'
                  el.style.transform = 'translateY(0)'
                }
              })
            }, [segments])
            const saveOptions = (nextOptions, segs) => {
              optionsRef.current = nextOptions
              host.call('set-composition', { segments: segs ?? segmentsRef.current, ...nextOptions })
                .then((result) => {
                  if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                  if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                  if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                  if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
                })
                .catch((err) => console.error('dsh-bottom-bar: setConfig failed', err))
            }
            const apply = (next) => { setSegments(next); setCompositionState(next); saveOptions(optionsRef.current, next) }
            const dropAt = (to) => {
              const from = dragFromRef.current
              const current = segmentsRef.current
              if (from === null || !Array.isArray(current) || to === null) return
              const curSelected = selectedIdsRef.current
              const isBatch = curSelected.size > 1 && curSelected.has(current[from]?.id)

              flipTops.current = rowRefs.current.map((el) => (el === null || el === undefined ? 0 : el.getBoundingClientRect().top))

              if (isBatch) {
                // 严格按照列表中已有的原始顺序提取选中的分段项（原展现顺序）
                const movingItems = current.filter((s) => curSelected.has(s.id))
                const nonMovingItems = current.filter((s) => !curSelected.has(s.id))

                let insertIndex = 0
                for (let i = 0; i < to; i++) {
                  if (!curSelected.has(current[i].id)) {
                    insertIndex++
                  }
                }

                const next = nonMovingItems.slice()
                next.splice(insertIndex, 0, ...movingItems)
                if (next.map((s) => s.id).join(',') === current.map((s) => s.id).join(',')) {
                  setSelectedIds(new Set())
                  selectedIdsRef.current = new Set()
                  lastClickedIndexRef.current = null
                  return
                }
                segmentsRef.current = next
                setSegments(next)
                setCompositionState(next)
                setJustMovedIds(new Set(movingItems.map((m) => m.id)))
                ctx.timeout(() => setJustMovedIds(new Set()), 800)
              } else {
                if (to === from || to === from + 1) {
                  setSelectedIds(new Set())
                  selectedIdsRef.current = new Set()
                  lastClickedIndexRef.current = null
                  return
                }
                const next = current.slice()
                const item = next.splice(from, 1)[0]
                next.splice(to > from ? to - 1 : to, 0, item)
                segmentsRef.current = next
                setSegments(next)
                setCompositionState(next)
                setJustMovedIds(new Set([item.id]))
                ctx.timeout(() => setJustMovedIds(new Set()), 800)
              }
              // 拖拽落位后直接结束选取状态
              setSelectedIds(new Set())
              selectedIdsRef.current = new Set()
              lastClickedIndexRef.current = null
            }
            const computeDropIndex = (e) => {
              const els = rowRefs.current
              for (let i = 0; i < els.length; i++) {
                const el = els[i]
                if (el === null || el === undefined) continue
                const r = el.getBoundingClientRect()
                if (e.clientY < r.top + r.height / 2) return i
              }
              return els.length
            }
            const finalize = () => {
              setDragFrom(null)
              dragFromRef.current = null
              dropIndexRef.current = null
              setDropIndex(null)
              setIndicatorTop(null)
              // 拖拽结束后立即清空选取
              setSelectedIds(new Set())
              selectedIdsRef.current = new Set()
              lastClickedIndexRef.current = null
              if (Array.isArray(segmentsRef.current)) saveOptions(optionsRef.current)
            }
            const onRowClick = (index, segId, e) => {
              const current = segmentsRef.current || []
              if (e.shiftKey && lastClickedIndexRef.current !== null && lastClickedIndexRef.current !== index) {
                const start = Math.min(lastClickedIndexRef.current, index)
                const end = Math.max(lastClickedIndexRef.current, index)
                const next = new Set(selectedIdsRef.current)
                for (let i = start; i <= end; i++) {
                  if (current[i]) next.add(current[i].id)
                }
                selectedIdsRef.current = next
                setSelectedIds(next)
                lastClickedIndexRef.current = index
              } else if (e.ctrlKey || e.metaKey) {
                const next = new Set(selectedIdsRef.current)
                if (next.has(segId)) next.delete(segId)
                else next.add(segId)
                selectedIdsRef.current = next
                setSelectedIds(next)
                lastClickedIndexRef.current = index
              } else {
                // 普通点按：绝不触发多选；若当前有多选状态则直接清空
                if (selectedIdsRef.current.size > 0) {
                  selectedIdsRef.current = new Set()
                  setSelectedIds(new Set())
                }
                lastClickedIndexRef.current = index
              }
            }
            const onRowDragStart = (index, segId, e) => {
              let cur = selectedIdsRef.current
              if (e.ctrlKey || e.metaKey) {
                cur = new Set(cur)
                cur.add(segId)
                selectedIdsRef.current = cur
                setSelectedIds(cur)
              } else if (!cur.has(segId)) {
                // 未按住 Ctrl 拖拽未选中的行时，清空多选，只拖拽当前行
                cur = new Set()
                selectedIdsRef.current = cur
                setSelectedIds(cur)
              }
              lastClickedIndexRef.current = index
              setDragFrom(index)
              dragFromRef.current = index
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.dropEffect = 'move'
            }
            const move = (index, delta) => {
              if (!Array.isArray(segments)) return
              const j = index + delta
              if (j < 0 || j >= segments.length) return
              flipTops.current = rowRefs.current.map((el) => el === null || el === undefined ? 0 : el.getBoundingClientRect().top)
              const next = segments.slice()
              const tmp = next[index]; next[index] = next[j]; next[j] = tmp
              setJustMovedIds(new Set([tmp.id]))
              ctx.timeout(() => setJustMovedIds(new Set()), 800)
              apply(next)
            }
            const setEnabled = (index, enabled) => {
              if (!Array.isArray(segments)) return
              const next = segments.slice()
              next[index] = { id: next[index].id, enabled }
              apply(next)
            }
            const toggleMode = () => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, mode: mode === 'separate' ? 'combined' : 'separate' }) }
            const toggleTooltip = () => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, tooltip: tooltipAlways ? 'auto' : 'always' }) }
            const togglePrecision = () => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, precision: precision === 'full' ? 'compact' : 'full' }) }
            const reset = () => {
              if (!Array.isArray(segments)) return
              host.call('reset-composition').then((result) => {
                if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
              }).catch(() => {})
            }
            const updatePrice = (model, patch) => {
              if (!Array.isArray(prices)) return
              const cur = prices.find((p) => p.model === model)
              const next = { model, currency: cur ? cur.currency : 'USD', in: cur ? cur.in : 0, cacheRead: cur ? cur.cacheRead : undefined, cacheWrite: cur ? cur.cacheWrite : undefined, out: cur ? cur.out : 0, builtin: cur ? cur.builtin : false, ...patch }
              setPrices(prices.map((p) => p.model === model ? next : p))
              host.call('set-price', { model, price: { currency: next.currency, in: next.in, cacheRead: next.cacheRead === undefined ? null : next.cacheRead, cacheWrite: next.cacheWrite === undefined ? null : next.cacheWrite, out: next.out } })
                .then((result) => { if (result.prices) setPrices(result.prices) })
                .catch((err) => console.error('dsh-bottom-bar: setPrice failed', err))
            }
            const removePrice = (model) => {
              host.call('remove-price', { model }).then((result) => { if (result.prices) setPrices(result.prices) }).catch((err) => console.error('dsh-bottom-bar: removePrice failed', err))
            }
            const VENDOR_TEMPLATES = [
              { id: 'auto', name: '⚡ 智能自动识别（按模型名匹配厂商公式）' },
              { id: 'deepseek-v4', name: '🐳 DeepSeek V4 (1 : 2 : 0.02 : 0.02) · CNY', currency: 'CNY', out: 2, read: 0.02, write: 0.02 },
              { id: 'deepseek-v3', name: '🐳 DeepSeek V3/R1 (1 : 4 : 0.25 : 1.0) · CNY', currency: 'CNY', out: 4, read: 0.25, write: 1.0 },
              { id: 'claude', name: '⚡ Anthropic Claude (1 : 5 : 0.1 : 1.25) · USD', currency: 'USD', out: 5, read: 0.1, write: 1.25 },
              { id: 'openai', name: '🧠 OpenAI GPT/o-series (1 : 4 : 0.5 : 1.25) · USD', currency: 'USD', out: 4, read: 0.5, write: 1.25 },
              { id: 'gemini', name: '🌐 Google Gemini (1 : 4 : 0.25 : 1.0) · USD', currency: 'USD', out: 4, read: 0.25, write: 1.0 },
              { id: 'kimi', name: '🌙 Kimi / 月之暗面 (1 : 4 : 0.2 : 1.0) · CNY', currency: 'CNY', out: 4, read: 0.2, write: 1.0 },
              { id: 'qwen', name: '🇨🇳 通义千问 / GLM / MiniMax (1 : 3.5 : 0.25 : 1.0) · CNY', currency: 'CNY', out: 3.5, read: 0.25, write: 1.0 },
              { id: 'custom', name: '⚙️ 手动填写每个价格桶' },
            ]

            const computePreviewPrice = () => {
              const inVal = Number(newIn)
              const inPrice = Number.isFinite(inVal) && inVal >= 0 ? inVal : 0
              if (vendorTpl === 'custom') {
                return {
                  currency: customCurrency,
                  in: inPrice,
                  cacheRead: customRead === '' ? undefined : Number(customRead),
                  cacheWrite: customWrite === '' ? undefined : Number(customWrite),
                  out: customOut === '' ? inPrice * 2 : Number(customOut),
                  tplName: '自定义单价',
                }
              }
              let tpl = VENDOR_TEMPLATES.find((t) => t.id === vendorTpl)
              if (!tpl || tpl.id === 'auto') {
                const m = newModel.toLowerCase()
                if (m.includes('claude') || m.includes('anthropic')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'claude')
                else if (m.includes('gpt') || m.includes('openai') || m.includes('o1') || m.includes('o3') || m.includes('o4')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'openai')
                else if (m.includes('gemini') || m.includes('google')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'gemini')
                else if (m.includes('kimi') || m.includes('moonshot')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'kimi')
                else if (m.includes('deepseek')) {
                  const isV4 = m.includes('v4') || m.includes('flash')
                  tpl = isV4 ? VENDOR_TEMPLATES.find((t) => t.id === 'deepseek-v4') : VENDOR_TEMPLATES.find((t) => t.id === 'deepseek-v3')
                } else if (m.includes('qwen') || m.includes('glm') || m.includes('minimax') || m.includes('doubao')) {
                  tpl = VENDOR_TEMPLATES.find((t) => t.id === 'qwen')
                } else {
                  tpl = VENDOR_TEMPLATES.find((t) => t.id === 'deepseek-v4')
                }
              }
              const curr = tpl.currency || 'CNY'
              return {
                currency: curr,
                in: inPrice,
                cacheRead: Math.round(inPrice * tpl.read * 1000) / 1000,
                cacheWrite: Math.round(inPrice * tpl.write * 1000) / 1000,
                out: Math.round(inPrice * tpl.out * 1000) / 1000,
                tplName: tpl.name,
              }
            }

            const addPrice = () => {
              const id = newModel.trim()
              if (id === '') return
              const computed = computePreviewPrice()
              setNewModel('')
              setNewIn('')
              setCustomOut('')
              setCustomRead('')
              setCustomWrite('')
              host.call('set-price', {
                model: id,
                price: {
                  currency: computed.currency,
                  in: computed.in,
                  cacheRead: computed.cacheRead === undefined ? null : computed.cacheRead,
                  cacheWrite: computed.cacheWrite === undefined ? null : computed.cacheWrite,
                  out: computed.out,
                },
              })
                .then((result) => { if (result.prices) setPrices(result.prices) })
                .catch((err) => console.error('dsh-bottom-bar: addPrice failed', err))
            }
            const resetPrices = () => {
              host.call('reset-prices').then((result) => { if (result.prices) setPrices(result.prices) }).catch((err) => console.error('dsh-bottom-bar: resetPrices failed', err))
            }
            const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
            const numOrUndef = (v) => {
              if (v === '' || v === undefined || v === null) return undefined
              const n = Number(v)
              return Number.isFinite(n) ? n : undefined
            }
            const fullCell = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, whiteSpace: 'nowrap', lineHeight: '18px' }
            const fullGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px' }
            const fullDivider = { borderTop: '1px solid var(--dsw-alias-border-l2)', margin: '3px 0' }
            const fullValue = { fontWeight: 500, color: 'var(--dsw-alias-label-primary)' }
            const fullTok = { fontSize: 10, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary)' }
            const fallbackSegments = loaded ? DEFAULT_COMPOSITION : null
            const effectiveSegments = Array.isArray(segments) ? segments : fallbackSegments
            if (effectiveSegments === null) {
              return React.createElement('div', { className: 'dsh-comp-page' },
                React.createElement('div', { className: 'dsh-comp-loading' },
                  React.createElement('div', { className: 'dsh-comp-loading-bar' }),
                  React.createElement('div', { className: 'dsh-comp-loading-bar' }),
                  React.createElement('div', { className: 'dsh-comp-loading-bar' }),
                ),
                React.createElement('div', { className: 'dsh-comp-desc' }, '正在加载底栏配置…'),
              )
            }
            const offline = !Array.isArray(segments)
            const previewSegs = []
            for (const seg of effectiveSegments) {
              const isEnabled = seg.enabled === true
              const isGhost = !isEnabled && (hovered === seg.id)
              if (!isEnabled && !isGhost) continue
              const sampleDef = PREVIEW_TEXTS[seg.id]
              if (sampleDef === undefined) continue
              const sample = typeof sampleDef === 'string' ? sampleDef : sampleDef[mode]
              previewSegs.push({ id: seg.id, text: sample, isGhost: isGhost })
            }
            const makeLineChildren = () => {
              const children = []
              previewSegs.forEach((item, i) => {
                if (i > 0) {
                  children.push(React.createElement('span', { className: 'dsh-stats-sep', 'aria-hidden': true, key: 'ps_sep_' + item.id }, '|'))
                }
                children.push(React.createElement('span', {
                  className: 'dsh-preview-seg' + (hovered === item.id ? ' dsh-preview-hl' : '') + (item.isGhost ? ' dsh-preview-ghost' : ''),
                  key: 'ps_seg_' + item.id,
                  ref: (el) => { if (el) previewSegRefs.current[item.id] = el },
                  title: (SEGMENT_LABELS[item.id] || item.id) + (item.isGhost ? '（未启用 · 悬停动态插入预览效果）' : ' · 悬停联动下方条目'),
                  onMouseEnter: () => setHovered(item.id),
                  onMouseLeave: () => setHovered(null),
                }, item.text + (item.isGhost ? ' ✦' : '')))
              })
              return children
            }
            const priceRows = Array.isArray(prices) ? prices.map((p) => React.createElement('div', { className: 'dsh-price-row', key: p.model },
              React.createElement('span', { className: 'dsh-price-model', title: p.model }, p.model),
              React.createElement('select', { className: 'dsh-comp-select', value: p.currency, onChange: (e) => updatePrice(p.model, { currency: e.target.value }) }, ['USD', 'CNY'].map((c) => React.createElement('option', { value: c, key: c }, c))),
              React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.in, title: '输入', onChange: (e) => updatePrice(p.model, { in: num(e.target.value) }) }),
              React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: (p.cacheRead === undefined || p.cacheRead === null) ? '' : p.cacheRead, title: '缓存读（留空=无此桶）', onChange: (e) => updatePrice(p.model, { cacheRead: numOrUndef(e.target.value) }) }),
              React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: (p.cacheWrite === undefined || p.cacheWrite === null) ? '' : p.cacheWrite, title: '缓存写（留空=无此桶）', onChange: (e) => updatePrice(p.model, { cacheWrite: numOrUndef(e.target.value) }) }),
              React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.out, title: '输出', onChange: (e) => updatePrice(p.model, { out: num(e.target.value) }) }),
              React.createElement('button', { className: 'dsh-comp-btn', title: p.builtin ? '恢复默认' : '删除该模型', onClick: () => removePrice(p.model) }, p.builtin ? '↺' : '×'),
            )) : []
            const rows = effectiveSegments.map((seg, index) => {
              const sampleDef = PREVIEW_TEXTS[seg.id]
              const sampleText = sampleDef !== undefined
                ? (typeof sampleDef === 'string' ? sampleDef : sampleDef[mode])
                : ''
              const isSelected = selectedIds.has(seg.id)
              const isDraggingThis = dragFrom === index || (dragFrom !== null && isSelected && selectedIds.has(effectiveSegments[dragFrom]?.id))
              const isJustMoved = justMovedIds.has(seg.id)
              const isHovered = hovered === seg.id
              let selectGrip = React.createElement('span', {
                className: 'dsh-comp-grip',
                title: '拖拽排序 · 按住 Ctrl 点击可多选',
              }, '⠿')
              if (isSelected) {
                selectGrip = React.createElement('span', {
                  className: 'dsh-comp-selected-badge',
                  title: '已多选 · 拖拽批量排序',
                }, '✓')
              }
              return React.createElement(
                'div',
                {
                  className: 'dsh-comp-row' + (seg.enabled === true ? ' dsh-on' : ' dsh-off') + (isSelected ? ' dsh-selected' : '') + (isDraggingThis ? ' dsh-dragging' : '') + (isJustMoved ? ' dsh-just-moved' : '') + (isHovered ? ' dsh-row-hovered' : ''),
                  key: seg.id,
                  ref: (el) => { rowRefs.current[index] = el },
                  draggable: true,
                  onClick: (e) => onRowClick(index, seg.id, e),
                  onMouseEnter: () => setHovered(seg.id),
                  onMouseLeave: () => setHovered(null),
                  onDragStart: (e) => onRowDragStart(index, seg.id, e),
                },
                selectGrip,
                React.createElement('div', { className: 'dsh-comp-label-wrap' },
                  React.createElement('span', { className: 'dsh-comp-label' }, SEGMENT_LABELS[seg.id] || seg.id),
                  sampleText ? React.createElement('span', { className: 'dsh-comp-sample' }, '示例: ' + sampleText) : null,
                ),
                React.createElement('label', { className: 'dsh-switch', onClick: (e) => e.stopPropagation() },
                  React.createElement('input', { type: 'checkbox', checked: seg.enabled === true, disabled: offline, onChange: () => setEnabled(index, !(seg.enabled === true)) }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
                React.createElement('button', { className: 'dsh-comp-btn', onClick: (e) => { e.stopPropagation(); move(index, -1) }, disabled: offline || index === 0 }, '↑'),
                React.createElement('button', { className: 'dsh-comp-btn', onClick: (e) => { e.stopPropagation(); move(index, 1) }, disabled: offline || index === effectiveSegments.length - 1 }, '↓'),
              )
            })
            return React.createElement('div', { className: 'dsh-comp-page', onDragOver: (e) => e.preventDefault() },
              offline && React.createElement('div', { className: 'dsh-comp-warn' }, '配置服务未响应——当前为离线预览（默认配置），改动暂不可用；服务恢复后自动同步。'),
              React.createElement('p', { className: 'dsh-comp-desc' }, '配置输入框下方的底栏统计行。按住 Ctrl 点击可多选批量拖拽排序；开关组：显示/隐藏、输入缓存口径、黑条行为、费用精度；价格表在页面底部（折叠）。'),
              React.createElement('div', { className: 'dsh-comp-row dsh-on' },
                React.createElement('span', { className: 'dsh-comp-label' }, '输入/缓存分离'),
                React.createElement('label', { className: 'dsh-switch' },
                  React.createElement('input', { type: 'checkbox', checked: mode === 'separate', disabled: offline, onChange: toggleMode }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
              ),
              React.createElement('div', { className: 'dsh-comp-row' + (tooltipAlways ? ' dsh-on' : ' dsh-off') },
                React.createElement('span', { className: 'dsh-comp-label' }, '悬停黑条始终显示完整行'),
                React.createElement('label', { className: 'dsh-switch' },
                  React.createElement('input', { type: 'checkbox', checked: tooltipAlways, disabled: offline, onChange: toggleTooltip }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
              ),
              React.createElement('div', { className: 'dsh-comp-row' + (precision === 'full' ? ' dsh-on' : ' dsh-off') },
                React.createElement('span', { className: 'dsh-comp-label' }, '费用完整精度（4 位小数）'),
                React.createElement('label', { className: 'dsh-switch' },
                  React.createElement('input', { type: 'checkbox', checked: precision === 'full', disabled: offline, onChange: togglePrecision }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
              ),
              React.createElement('div', { className: 'dsh-preview' },
                React.createElement('div', { className: 'dsh-preview-header' },
                  React.createElement('span', { className: 'dsh-preview-label' }, '底栏效果预览'),
                  React.createElement('span', { className: 'dsh-preview-hint' }, '可横向滑动 · 支持多选批量拖拽'),
                ),
                previewSegs.length === 0
                  ? React.createElement('span', { className: 'dsh-preview-empty' }, '（所有分段均已隐藏）')
                  : React.createElement('div', { className: 'dsh-preview-dock', ref: previewDockRef, title: previewSegs.map((s) => s.text).join(' | ') },
                      React.createElement('div', { className: 'dsh-preview-line' }, makeLineChildren()),
                    ),
              ),
              selectedIds.size > 1 && React.createElement('div', { className: 'dsh-multi-bar' },
                React.createElement('span', null, '✨ 已选 ' + selectedIds.size + ' 项 · 拖拽移动到新位置 · 释放后自动完成'),
                React.createElement('div', { style: { display: 'flex', gap: 6 } },
                  React.createElement('button', { className: 'dsh-multi-bar-action', onClick: () => { const all = new Set(effectiveSegments.map((s) => s.id)); setSelectedIds(all); selectedIdsRef.current = all } }, '全选'),
                  React.createElement('button', { className: 'dsh-multi-bar-action', onClick: () => { const inv = new Set(effectiveSegments.filter((s) => !selectedIds.has(s.id)).map((s) => s.id)); setSelectedIds(inv); selectedIdsRef.current = inv } }, '反选'),
                  React.createElement('button', { className: 'dsh-multi-bar-action', onClick: () => { setSelectedIds(new Set()); selectedIdsRef.current = new Set(); lastClickedIndexRef.current = null } }, '取消选择'),
                ),
              ),
              React.createElement('div', { className: 'dsh-comp-list', ref: listRef,
                onDragOver: (e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dragFromRef.current === null) return
                  const index = computeDropIndex(e)
                  if (index !== dropIndexRef.current) { dropIndexRef.current = index; setDropIndex(index) }
                  const container = listRef.current
                  if (container === null) return
                  const els = rowRefs.current
                  const cr = container.getBoundingClientRect()
                  let top
                  if (index === 0) {
                    const first = els[0]
                    top = first !== null && first !== undefined ? first.getBoundingClientRect().top - cr.top - 1 : 0
                  } else if (index >= els.length) {
                    const last = els[els.length - 1]
                    top = last !== null && last !== undefined ? last.getBoundingClientRect().bottom - cr.top - 1 : 0
                  } else {
                    const prev = els[index - 1]
                    const next = els[index]
                    top = prev !== null && prev !== undefined && next !== null && next !== undefined
                      ? (prev.getBoundingClientRect().bottom + next.getBoundingClientRect().top) / 2 - cr.top - 1
                      : 0
                  }
                  setIndicatorTop(Math.round(top))
                },
                onDrop: (e) => { e.preventDefault(); e.stopPropagation(); dropAt(computeDropIndex(e)); finalize() },
                onDragEnd: () => finalize(),
                onDragLeave: (e) => {
                  if (e.currentTarget.contains(e.relatedTarget)) return
                  dropIndexRef.current = null
                  setDropIndex(null)
                },
              },
                rows,
                dropIndex !== null && React.createElement('div', { className: 'dsh-drop-ind', style: { top: indicatorTop } }),
              ),
              React.createElement('button', { className: 'dsh-comp-btn dsh-comp-reset', onClick: reset, disabled: offline }, '恢复默认（段/模式/黑条/精度）'),
              React.createElement('button', { className: 'dsh-comp-btn dsh-comp-reset', onClick: () => setPricesOpen(!pricesOpen) }, pricesOpen ? '▲ 收起价格表' : '▼ 展开价格表'),
              pricesOpen && React.createElement('div', { className: 'dsh-prices' },
                React.createElement('span', { className: 'dsh-price-label' }, '价格表（每 1M tokens）：内置 DeepSeek / Claude / GPT / Gemini / Qwen 官方标准价格。不同渠道（如 opencode-go / 免费镜像）若未单独配置价格，将自动按模型名模糊继承默认价格；您亦可在此新增或覆盖自定义价格。'),
                React.createElement('div', { className: 'dsh-price-head' },
                  React.createElement('span', { className: 'dsh-price-model' }, '模型'),
                  React.createElement('span', { style: { width: 58 } }, '币种'),
                  React.createElement('span', { style: { width: 60 } }, '输入'),
                  React.createElement('span', { style: { width: 60 } }, '缓存读'),
                  React.createElement('span', { style: { width: 60 } }, '缓存写'),
                  React.createElement('span', { style: { width: 60 } }, '输出'),
                  React.createElement('span', { style: { width: 24 } }, ''),
                ),
                priceRows,
                (() => {
                  const preview = computePreviewPrice()
                  const sym = preview.currency === 'USD' ? '$' : '¥'
                  return React.createElement('div', { className: 'dsh-price-template-card' },
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                      React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', whiteSpace: 'nowrap' } }, '厂商比例模板:'),
                      React.createElement('select', {
                        className: 'dsh-comp-select',
                        style: { flex: 1 },
                        value: vendorTpl,
                        onChange: (e) => setVendorTpl(e.target.value),
                      }, VENDOR_TEMPLATES.map((t) => React.createElement('option', { value: t.id, key: t.id }, t.name))),
                    ),
                    React.createElement('div', { className: 'dsh-price-add' },
                      React.createElement('input', { type: 'text', style: { flex: 1.5 }, placeholder: '模型 id，如 opencode/deepseek-v4-flash', value: newModel, onChange: (e) => setNewModel(e.target.value) }),
                      React.createElement('input', { type: 'number', step: '0.01', style: { flex: 1 }, placeholder: '输入单价 (' + preview.currency + ')', value: newIn, onChange: (e) => setNewIn(e.target.value) }),
                      React.createElement('button', { className: 'dsh-comp-btn', onClick: addPrice }, '添加/更新价格'),
                      React.createElement('button', { className: 'dsh-comp-btn', onClick: resetPrices }, '恢复默认价格'),
                    ),
                    vendorTpl === 'custom' && React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                      React.createElement('select', { className: 'dsh-comp-select', value: customCurrency, onChange: (e) => setCustomCurrency(e.target.value) }, ['CNY', 'USD'].map((c) => React.createElement('option', { value: c, key: c }, c))),
                      React.createElement('input', { className: 'dsh-price-input', placeholder: '缓存读单价', value: customRead, onChange: (e) => setCustomRead(e.target.value) }),
                      React.createElement('input', { className: 'dsh-price-input', placeholder: '缓存写单价', value: customWrite, onChange: (e) => setCustomWrite(e.target.value) }),
                      React.createElement('input', { className: 'dsh-price-input', placeholder: '输出单价', value: customOut, onChange: (e) => setCustomOut(e.target.value) }),
                    ),
                    React.createElement('div', { className: 'dsh-price-preview-badge' },
                      React.createElement('span', null, '💡 自动推导: ' + preview.tplName),
                      React.createElement('span', null, '币种: ' + preview.currency),
                      React.createElement('span', null, '输出: ' + sym + preview.out),
                      React.createElement('span', null, '读缓存: ' + sym + (preview.cacheRead !== undefined ? preview.cacheRead : '—')),
                      React.createElement('span', null, '写缓存: ' + sym + (preview.cacheWrite !== undefined ? preview.cacheWrite : '—')),
                    ),
                  )
                })(),
              ),
              // 修订 38：客户端全量面板按用户参考稿重排——标题行（小号大写样式
              // 标题 + 右侧绿色「命中率」徽章）、模型名、token 2×2 网格（值 +
              // 灰色 tok 小后缀）、费用 2×2 网格、虚线顶边总计栏（品牌色加粗）
              React.createElement('div', { className: 'dsh-fullusage', style: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-interactive-bg-hover)', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)', fontVariantNumeric: 'tabular-nums' } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                  React.createElement('span', { style: { fontSize: 10, lineHeight: '16px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--dsw-alias-label-tertiary)' } }, '客户端全量 · 权威源'),
                  React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, lineHeight: '16px', fontWeight: 600, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap' } },
                    '命中率 ' + (fullUsage === null ? '—' : (() => { const d = fullUsage.uncachedInput + fullUsage.cacheRead + fullUsage.cacheWrite; return d === 0 ? '—' : Math.round(fullUsage.cacheRead / d * 100) + '%' })()),
                  ),
                ),
                fullUsage === null
                  ? React.createElement('span', { style: { fontSize: 11, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary)' } }, '等待底栏轮询…')
                  : React.createElement(React.Fragment, null,
                    React.createElement('span', { style: { fontWeight: 600, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-primary)' } }, fullUsage.model),
                    React.createElement('div', { style: fullDivider }),
                    React.createElement('div', { style: fullGrid },
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '未缓存输入'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullUsage.uncachedInput), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '缓存读'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullUsage.cacheRead), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '缓存写'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullUsage.cacheWrite), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '输出'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullUsage.output), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                    ),
                    fullUsage.total !== null && fullUsage.total !== undefined && React.createElement(React.Fragment, null,
                      React.createElement('div', { style: fullDivider }),
                      React.createElement('div', { style: fullGrid },
                        React.createElement('div', { style: fullCell },
                          React.createElement('span', null, '输入费用'),
                          React.createElement('span', null, compactMoney(fullUsage.inCost, fullUsage.currency, 'full')),
                        ),
                        React.createElement('div', { style: fullCell },
                          React.createElement('span', null, '缓存读费用'),
                          React.createElement('span', null, compactMoney(fullUsage.cacheReadCost, fullUsage.currency, 'full')),
                        ),
                        React.createElement('div', { style: fullCell },
                          React.createElement('span', null, '缓存写费用'),
                          React.createElement('span', null, compactMoney(fullUsage.cacheWriteCost, fullUsage.currency, 'full')),
                        ),
                        React.createElement('div', { style: fullCell },
                          React.createElement('span', null, '输出费用'),
                          React.createElement('span', null, compactMoney(fullUsage.outCost, fullUsage.currency, 'full')),
                        ),
                      ),
                      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginTop: 2, borderTop: '1px dashed var(--dsw-alias-border-l2)' } },
                        React.createElement('span', { style: { fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, '总计费用'),
                        React.createElement('span', { style: { fontSize: 14, lineHeight: '20px', fontWeight: 700, color: 'var(--dsw-alias-brand-primary)' } }, compactMoney(fullUsage.total, fullUsage.currency, 'full')),
                      ),
                    ),
                  ),
              ),
              React.createElement('div', { className: 'dsh-comp-desc', style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: 8 } },
                '诊断: ' + (diag === null ? '（加载中…）' : JSON.stringify(diag)),
              ),
            )
          },
        ))

    }

  }
