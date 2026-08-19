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

                
/* [inlined lib/client-css.cjs] */
const CLIENT_CSS = `
/* ══════════════════════════════════════════════════════════════════
   dsh-bottom-bar · 经典 Claude 暖纸与黑曜石精雕美学 UI
   ══════════════════════════════════════════════════════════════════ */
.dsh-stats-root {
  text-align: center;
  max-width: var(--dsh-chat-content-width);
  box-sizing: border-box;
  width: 100%;
  padding: 6px calc(var(--dsh-composer-side-clearance) + 16px) 2px;
  color: var(--dsw-alias-label-tertiary);
  white-space: normal;
  margin: 0 auto;
  font-family: var(--dsw-font-family);
  font-size: 12px;
  line-height: 22px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  display: block;
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
  white-space: nowrap;
}
.dsh-seg:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dsh-seg:active {
  transform: scale(0.97);
}
/* 修订 82：峰谷时段分段特效——高峰=品牌色胶囊+柔和脉冲光晕,空闲=次级色（降噪） */
.dsh-seg-peak {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 600;
  animation: dsh-peak-pulse 2.4s ease-in-out infinite;
}
.dsh-seg-offpeak {
  color: var(--dsw-alias-label-secondary);
  opacity: 0.9;
}
/* 修订 84：仅参考（非官方渠道/未计价）→ 低调次级色;价格单独标色——高峰时深色加粗（贵） */
.dsh-seg-ref {
  color: var(--dsw-alias-label-secondary);
}
.dsh-seg-price {
  font-weight: 600;
}
.dsh-seg-price-hot {
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 700;
}
@keyframes dsh-peak-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, transparent); }
  50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent); }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-seg-peak { animation: none; }
}
/* 修订 84：峰谷明细价格对比表格——当前时段列高亮（品牌色加粗） */
.dsh-peak-table {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 2px 12px;
  margin: 4px 0;
  align-items: center;
}
.dsh-peak-cell {
  white-space: nowrap;
}
/* 修订 95：价格列(第 2/3 列)文字居中,桶标签列保持左对齐 */
.dsh-peak-table .dsh-peak-cell:nth-child(3n+2),
.dsh-peak-table .dsh-peak-cell:nth-child(3n+3) {
  text-align: center;
}
.dsh-peak-cell-head {
  opacity: 0.65;
  font-size: 11px;
  line-height: 16px;
}
.dsh-peak-cell-hot {
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 700;
}
/* 修订 88：峰谷明细按模型分组——模型名小标题 */
.dsh-peak-model {
  font-weight: 600;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-secondary);
  margin-top: 6px;
}
.dsh-peak-model + .dsh-peak-table {
  margin-top: 2px;
}
/* 修订 89/90：峰谷明细模型切换——分段式滑槽（轨道+滑动指示条）,替代 ◀ ▶ 按钮 */
.dsh-peak-slider {
  position: relative;
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  margin: 4px 0 2px;
  width: 100%;
  box-sizing: border-box;
}
.dsh-peak-slider-thumb {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 0;
  width: 0;
  border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);
  box-sizing: border-box;
  transition: left 0.22s cubic-bezier(0.2, 0.9, 0.3, 1), width 0.22s cubic-bezier(0.2, 0.9, 0.3, 1);
  pointer-events: none;
}
.dsh-peak-slider-seg {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.18s ease;
}
.dsh-peak-slider-seg:hover {
  color: var(--dsw-alias-label-primary);
}
.dsh-peak-slider-seg.dsh-on {
  color: var(--dsw-alias-brand-primary);
  font-weight: 600;
}
/* 修订 92：高峰时段窗口 chips——当前所在窗口高亮 */
.dsh-peak-ranges {
  display: inline-flex;
  gap: 4px;
}
.dsh-peak-range {
  padding: 0 5px;
  border-radius: 4px;
  border: 1px solid transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}
.dsh-peak-range-hot {
  color: var(--dsw-alias-brand-primary);
  font-weight: 600;
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
  border-color: var(--dsw-alias-border-l2);
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 40px;
  min-height: 40px;
  max-height: 40px;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: #FFFFFF;
  scrollbar-width: none;
  -ms-overflow-style: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  cursor: default;
}
body[data-ds-dark-theme] .dsh-preview-dock {
  background: #252420;
  border-color: var(--dsw-alias-border-l2);
}
.dsh-preview-dock::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.dsh-preview-line {
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 22px;
  height: 24px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: max-content;
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
}
.dsh-preview-empty {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 22px;
  text-align: center;
  padding: 4px 0;
}
.dsh-preview-seg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 0 6px;
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  cursor: pointer;
  overflow: hidden;
  max-width: 280px;
  opacity: 1;
  transition: max-width 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.18s ease,
              padding 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              background 0.16s ease,
              color 0.16s ease,
              border-color 0.16s ease,
              box-shadow 0.16s ease;
}
.dsh-preview-seg.dsh-seg-collapsed {
  max-width: 0 !important;
  opacity: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  margin: 0 !important;
  border-width: 0 !important;
  border-color: transparent !important;
  pointer-events: none !important;
}
.dsh-preview-seg.dsh-seg-visible {
  max-width: 280px;
  opacity: 1;
  padding: 0 6px;
}
/* 修订 71：修订 70 按用户决定回退——「跟着主题色走还是比较好」，
   预览区强调色恢复跟随 var(--dsw-alias-brand-primary) + color-mix 派生 */
.dsh-preview-seg:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  color: var(--dsw-alias-brand-primary);
  border-color: transparent;
}
body[data-ds-dark-theme] .dsh-preview-seg:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
  color: var(--dsw-alias-brand-primary);
  border-color: transparent;
}
/* 修订 73/74：高亮风格 CSS 开关——默认「全部实心 + bg-base 文字」（用户：实心
   才好认,tint 高亮和没高亮没差别;夜间不要发光,白天保留原版光晕）。主题/用户想
   改,在 .dsh-comp-page 上覆盖下面四个变量即可：
     全部 tint → --dsh-hl-fill: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
                 --dsh-hl-text: var(--dsw-alias-brand-primary);
                 --dsh-hl-glow: none;
                 --dsh-switch-fill: color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);
     夜间也要光 → body[data-ds-dark-theme] .dsh-comp-page { --dsh-hl-glow: 0 0 12px color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent), 0 2px 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent); } */
.dsh-comp-page {
  --dsh-hl-fill: var(--dsw-alias-brand-primary);
  --dsh-hl-text: var(--dsw-alias-bg-base);
  --dsh-hl-glow: 0 0 12px color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent), 0 2px 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);
  --dsh-switch-fill: var(--dsw-alias-brand-primary);
}
body[data-ds-dark-theme] .dsh-comp-page {
  --dsh-hl-fill: var(--dsw-alias-brand-primary);
  --dsh-hl-text: var(--dsw-alias-bg-base);
  --dsh-hl-glow: none;
  --dsh-switch-fill: color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);
}
.dsh-preview-hl {
  background: var(--dsh-hl-fill) !important;
  color: var(--dsh-hl-text) !important;
  border-color: var(--dsw-alias-brand-primary) !important;
  font-weight: 500 !important;
  box-shadow: var(--dsh-hl-glow) !important;
}
.dsh-preview-ghost {
  border: 1px dashed var(--dsw-alias-brand-primary) !important;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent) !important;
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 500 !important;
  box-shadow: 0 0 10px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent), inset 0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent) !important;
}
body[data-ds-dark-theme] .dsh-preview-ghost {
  border-color: var(--dsw-alias-brand-primary) !important;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 20%, transparent) !important;
  color: var(--dsw-alias-brand-primary) !important;
  box-shadow: 0 0 12px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent), inset 0 0 8px color-mix(in srgb, var(--dsw-alias-brand-primary) 20%, transparent) !important;
}

/* 预览区内置分隔符平滑过渡 */
.dsh-preview-dock .dsh-stats-sep {
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.65;
  font-weight: 300;
  user-select: none;
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  vertical-align: middle;
  max-width: 24px;
  margin: 0 10px;
  transition: max-width 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.18s ease,
              margin 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.dsh-preview-dock .dsh-stats-sep.dsh-sep-collapsed {
  max-width: 0 !important;
  opacity: 0 !important;
  margin: 0 !important;
  pointer-events: none !important;
}
.dsh-preview-dock .dsh-stats-sep.dsh-sep-visible {
  max-width: 24px;
  opacity: 0.65;
  margin: 0 10px;
}
.dsh-comp-row.dsh-row-hovered {
  border-color: var(--dsw-alias-brand-primary) !important;
  background: var(--dsw-alias-button-floating-hover) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent), 0 0 16px color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent), 0 4px 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent) !important;
  transform: none !important;
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-row-hovered {
  border-color: var(--dsw-alias-brand-primary) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent), 0 0 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, transparent), 0 4px 22px color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent) !important;
  transform: none !important;
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
  box-shadow: 0 0 10px var(--dsw-alias-brand-primary), 0 0 20px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);
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
  border-color: var(--dsw-alias-border-l2);
}
.dsh-comp-row.dsh-off {
  opacity: 0.52;
  background: var(--dsw-alias-bg-module-platform);
}
.dsh-comp-row.dsh-selected {
  border-color: var(--dsw-alias-brand-primary) !important;
  background: linear-gradient(90deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent) 0%, color-mix(in srgb, var(--dsw-alias-brand-primary) 6%, transparent) 100%) !important;
  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 4px 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent) !important;
  transform: translateY(-1.5px) scale(1.01);
  animation: dsh-select-pulse 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dsh-select-pulse {
  0% {
    transform: scale(0.985);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);
  }
  60% {
    transform: translateY(-2px) scale(1.015);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent), 0 6px 20px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);
  }
  100% {
    transform: translateY(-1.5px) scale(1.01);
    box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 4px 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);
  }
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-selected {
  background: linear-gradient(90deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 24%, transparent) 0%, color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, transparent) 100%) !important;
  border-color: var(--dsw-alias-brand-primary) !important;
  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 4px 22px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent) !important;
  transform: translateY(-1.5px) scale(1.01);
  animation: dsh-select-pulse-dark 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dsh-select-pulse-dark {
  0% {
    transform: scale(0.985);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent);
  }
  60% {
    transform: translateY(-2px) scale(1.015);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent), 0 6px 24px color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent);
  }
  100% {
    transform: translateY(-1.5px) scale(1.01);
    box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 4px 22px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);
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
  background: var(--dsh-hl-fill);
  color: var(--dsh-hl-text) !important;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);
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
  box-shadow: 0 16px 36px color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent), 0 0 0 2px var(--dsw-alias-brand-primary) !important;
  z-index: 10;
  cursor: grabbing !important;
  filter: brightness(1.04);
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-dragging {
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65), 0 0 0 2px var(--dsw-alias-brand-primary), 0 0 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent) !important;
  filter: brightness(1.08);
}
.dsh-comp-row.dsh-just-moved {
  animation: dsh-settle-glow 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes dsh-settle-glow {
  0% {
    border-color: var(--dsw-alias-brand-primary);
    box-shadow: 0 0 0 2.5px var(--dsw-alias-brand-primary), 0 6px 22px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);
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
    border-color: var(--dsw-alias-brand-primary);
    box-shadow: 0 0 0 2.5px var(--dsw-alias-brand-primary), 0 6px 26px color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);
    transform: scale(1.015);
    filter: brightness(1.12);
  }
  100% {
    border-color: var(--dsw-alias-border-l2);
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
  background: rgba(44, 39, 32, 0.95);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);
  color: #FFFFFF;
  font-size: 12.5px;
  font-weight: 500;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(255, 255, 255, 0.08);
  /* 修订 123：去掉毛玻璃模糊——底衬文字被糊住;背景已 95% 实底,blur 无必要 */
  animation: dsh-pill-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
}
body[data-ds-dark-theme] .dsh-multi-bar {
  background: rgba(26, 25, 22, 0.97);
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);
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
  background: var(--dsh-hl-fill);
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsh-hl-text);
}
.dsh-price-template-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-module-platform);
  border: 1px solid var(--dsw-alias-border-l1);
  box-shadow: 0 2px 12px color-mix(in srgb, #000 5%, transparent);
  margin-top: 6px;
}
/* 修订 141：新增价格预览面板——结构化卡片内预览 */
.dsh-price-preview-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 7%, transparent);
  border: 1px dashed var(--dsw-alias-border-l2);
}
.dsh-price-preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
  flex-wrap: wrap;
}
.dsh-price-preview-head span:last-child {
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dsh-price-preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 14px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.dsh-price-preview-grid > span:nth-child(odd) {
  color: var(--dsw-alias-label-tertiary);
}
.dsh-price-preview-hint {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-price-preview-extra {
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  border-top: 1px dashed var(--dsw-alias-border-l2);
  padding-top: 6px;
  margin-top: 2px;
}
.dsh-price-preview-badge {
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
  padding: 4px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
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
  background: var(--dsh-switch-fill);
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
  appearance: none;
  -webkit-appearance: none;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 26px 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background-color: var(--dsw-alias-bg-module-platform);
  background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' fill='none' stroke='%238a8a8a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 12px 12px;
  color: var(--dsw-alias-label-primary);
  transition: all 0.15s ease;
  outline: none;
  cursor: pointer;
}
.dsh-comp-select:hover {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, var(--dsw-alias-border-l2));
}
.dsh-comp-select:focus-visible {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
}
body[data-ds-dark-theme] .dsh-comp-select {
  background-color: #181816;
}
/* 修订 158：编排顺序 = 单按钮双状态(显示当前顺序,⇄ 点击切换) */
.dsh-ordpill {
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  line-height: 18px;
  padding: 3px 12px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  font-family: "SF Mono", Consolas, monospace;
  font-variant-numeric: tabular-nums;
  transition: all 0.15s ease;
}
.dsh-ordpill:hover {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, var(--dsw-alias-border-l2));
  color: var(--dsw-alias-brand-primary);
}
/* 修订 118：峰谷适用渠道输入框——此前无任何样式(浏览器默认方框),补全套 */
.dsh-comp-input {
  box-sizing: border-box;
  font-size: 12px;
  line-height: 18px;
  font-family: var(--dsw-font-family);
  padding: 3px 10px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: #FFFFFF;
  color: var(--dsw-alias-label-primary);
  transition: all 0.15s ease;
  outline: none;
}
body[data-ds-dark-theme] .dsh-comp-input {
  background: #181816;
}
.dsh-comp-input::placeholder {
  color: var(--dsw-alias-label-tertiary);
}
.dsh-comp-input:focus-visible,
.dsh-comp-input:focus {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
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
  padding: 3px 0;
}
.dsh-price-model {
  flex: 1;
  min-width: 60px;
  white-space: normal;
  word-break: break-all;
  line-height: 18px;
  font-weight: 500;
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
}
.dsh-price-input {
  box-sizing: border-box;
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
  border-color: var(--dsw-alias-border-l2);
}
.dsh-price-input:focus-visible,
.dsh-price-input:focus {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
}
.dsh-price-add {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--dsw-alias-border-l1);
}
.dsh-price-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
/* 修订 143：厂商比例模板结构化列表——官方 logo + 比例 chips + 币种徽章 */
.dsh-vend-head,
.dsh-vend-row {
  display: grid;
  grid-template-columns: minmax(130px, 1fr) minmax(0, 1.6fr);
  gap: 8px;
  align-items: center;
}
.dsh-vend-head {
  font-size: 11px;
  font-weight: 600;
  color: var(--dsw-alias-label-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsh-vend-row {
  padding: 6px 6px;
  margin: 0 -6px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
}
.dsh-vend-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-vend-row.dsh-on {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);
  border-color: var(--dsw-alias-border-l2);
}
.dsh-vend-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsh-vend-logo {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  object-fit: contain;
  flex: none;
}
.dsh-vend-logo-badge {
  background: #9c9c9a;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}
.dsh-vend-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.dsh-vchip {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 10.5px;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--dsw-alias-interactive-bg-hover);
  font-family: "SF Mono", Consolas, monospace;
  font-variant-numeric: tabular-nums;
}
.dsh-vchip i {
  font-style: normal;
  font-size: 9.5px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-vchip b {
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.dsh-vchip.zero b {
  color: var(--dsw-alias-label-tertiary);
}
.dsh-vcur {
  font-size: 10.5px;
  font-weight: 700;
  text-align: center;
  padding: 2px 0;
  border-radius: 6px;
}
.dsh-vcur.usd {
  color: #4a90d9;
  background: rgba(74, 144, 217, 0.12);
}
.dsh-vcur.cny {
  color: #d9534f;
  background: rgba(217, 83, 79, 0.12);
}
.dsh-vend-match {
  grid-column: 1 / -1;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-secondary);
  font-family: "SF Mono", Consolas, monospace;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-vend-match b {
  font-family: inherit;
  font-weight: 600;
  color: var(--dsw-alias-brand-primary);
}
/* 修订 150：新增价格——提供商快捷 chips + 币种滑槽 + 覆盖提醒 */
.dsh-provchips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.dsh-provchip {
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  line-height: 18px;
  padding: 2px 10px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.dsh-provchip:hover {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, var(--dsw-alias-border-l2));
}
.dsh-provchip.on {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent);
  color: var(--dsw-alias-brand-primary);
  font-weight: 600;
}
.dsh-provgrouplb {
  font-size: 11px;
  line-height: 22px;
  color: var(--dsw-alias-label-tertiary);
  margin-right: 2px;
}
/* 修订 153：模型 id 输入法式联想下拉 */
.dsh-sugg {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  background: var(--dsw-alias-bg-module-platform);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  overflow: hidden;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}
.dsh-sugg-row {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-family: "SF Mono", Consolas, monospace;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.dsh-sugg-row:hover,
.dsh-sugg-row:focus {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-curseg {
  display: inline-flex;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  overflow: hidden;
  background: var(--dsw-alias-bg-module-platform);
  flex: none;
}
.dsh-curseg .dsh-curseg-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  padding: 4px 9px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dsh-curseg .dsh-curseg-btn.on {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  color: var(--dsw-alias-brand-primary);
}
/* 修订 161：峰谷提示语折叠行——药丸显示当前 高/低语,展开区垫底 */
.dsh-peak-lbl-pill {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 11.5px;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  white-space: nowrap;
}
/* 修订 163：手风琴展开动画——grid 0fr→1fr 高度 + 淡入 + 内容落位 */
.dsh-peak-lbl-wrap {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.22s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.18s ease;
}
.dsh-peak-lbl-wrap.open {
  grid-template-rows: 1fr;
  opacity: 1;
}
.dsh-peak-lbl-inner {
  overflow: hidden;
  min-height: 0;
  transform: translateY(-4px);
  transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.dsh-peak-lbl-wrap.open .dsh-peak-lbl-inner {
  transform: translateY(0);
}
.dsh-peak-lbl-chev {
  display: inline-block;
  font-size: 10px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  transition: transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.dsh-peak-lbl-chev.open {
  transform: rotate(90deg);
}
.dsh-peak-lbl-open {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  margin-top: 2px;
  border-radius: 10px;
  background: var(--dsw-alias-interactive-bg-hover);
}
/* 修订 164：价格区大 tab——下划线高亮 + 底边线承接 */
.dsh-bigtabs {
  display: flex;
  gap: 2px;
  padding: 4px 6px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.dsh-bigtabs .dsh-bigtab {
  position: relative;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  padding: 7px 16px;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: color 0.15s ease;
}
.dsh-bigtabs .dsh-bigtab:hover {
  color: var(--dsw-alias-label-secondary);
}
.dsh-bigtabs .dsh-bigtab.on {
  color: var(--dsw-alias-brand-primary);
}
.dsh-bigtabs .dsh-bigtab.on::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-brand-primary);
}
/* 修订 164：厂商 tab 层级——标题+徽章 / 说明 / 工具栏 / 列表 / 脚注 */
.dsh-vend-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.dsh-vend-title-t {
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
  color: var(--dsw-alias-label-primary);
}
.dsh-vend-title-badge {
  font-size: 10.5px;
  font-weight: 600;
  line-height: 16px;
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);
  border-radius: 999px;
  padding: 0 8px;
}
.dsh-vend-desc {
  font-size: 11.5px;
  line-height: 17px;
  color: var(--dsw-alias-label-tertiary);
  margin: 6px 0 10px;
}
.dsh-vend-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--dsw-alias-interactive-bg-hover);
  margin-bottom: 10px;
}
.dsh-dsk-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-dsk-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* 修订 189：余额状态效果——负值/不可用红色 + 徽章 + 柔和脉冲;可用绿色 */
.dsh-dsk-balance {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary);
}
.dsh-dsk-balance.dsk-bad {
  color: #d9534f;
}
.dsh-dsk-balance.dsk-ok {
  color: #10b981;
}
.dsh-dsk-status {
  flex: none;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.dsh-dsk-status.dsk-bad {
  color: #d9534f;
  background: rgba(217, 83, 79, 0.12);
  animation: dsh-dsk-pulse 2s ease-in-out infinite;
}
.dsh-dsk-status.dsk-ok {
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
}
@keyframes dsh-dsk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
/* 修订 157：设置页顶部快捷导航(点一下平滑滚到对应区块) */
.dsh-secnav {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.dsh-secnav-btn {
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  line-height: 18px;
  padding: 2px 10px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.dsh-secnav-btn:hover {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, var(--dsw-alias-border-l2));
}
[id^="dsh-sec-"] {
  scroll-margin-top: 12px;
}
.dsh-price-preview-warn {
  margin-top: 8px;
  font-size: 11.5px;
  line-height: 16px;
  color: #d9534f;
  background: rgba(217, 83, 79, 0.1);
  border-radius: 8px;
  padding: 6px 10px;
}
/* 修订 139：待确认流光——主题色沿卡片边缘流动(贪吃蛇);@property 不支持时退化为静态主题色边框 */
@property --dsh-ang {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.dsh-confirm-pending {
  position: relative;
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent) !important;
}
.dsh-confirm-pending::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(from var(--dsh-ang, 0deg), transparent 0%, var(--dsw-alias-brand-primary) 14%, transparent 30%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  animation: dsh-border-flow 1.8s linear infinite;
  pointer-events: none;
}
@keyframes dsh-border-flow {
  to { --dsh-ang: 360deg; }
}
.dsh-price-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 1px dashed var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
  font-family: var(--dsw-font-family);
  transition: all 0.15s ease;
}
.dsh-price-toggle:hover {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-price-empty {
  padding: 10px 4px;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-price-row-peak {
  padding-left: 8px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, transparent);
  border-radius: 8px;
}
/* 修订 167：单桶比例标注——输入框正下方小字显示该桶 ÷ 输入价 */
.dsh-price-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  width: 54px;
  flex: none;
}
.dsh-price-cell .dsh-price-input {
  width: 100%;
}
.dsh-price-cell-ratio {
  font-size: 9px;
  line-height: 11px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.8;
  font-family: "SF Mono", Consolas, monospace;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dsh-price-cell-ratio.base {
  color: var(--dsw-alias-brand-primary);
  opacity: 0.9;
}
/* 修订 178：行内价格/倍率改居中,与表头数字列逐列对齐 */
.dsh-price-cell-ro .dsh-price-cell-txt {
  width: 100%;
  text-align: center;
  font-size: 12.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary);
  padding: 4px 2px;
  box-sizing: border-box;
}
.dsh-price-cell-ro .dsh-price-cell-ratio {
  width: 100%;
  text-align: center;
  box-sizing: border-box;
}
.dsh-price-curtext {
  width: 56px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-price-locktag {
  margin-left: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--dsw-alias-brand-primary);
}
.dsh-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
}
.dsh-modal {
  width: 540px;
  max-width: calc(100vw - 32px);
  max-height: 86vh;
  overflow: auto;
  box-sizing: border-box;
  border-radius: 16px;
  padding: 18px 20px;
  background: var(--dsw-alias-bg-module-platform);
  border: 1px solid var(--dsw-alias-border-l2);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  color: var(--dsw-alias-label-primary);
}
/* 修订 183：弹层费率卡——logo + 名称 + 主价/峰谷 × 主币种/双币 表格 */
.dsh-modal-card {
  margin-top: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-modal-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dsh-modal-card-logo {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  object-fit: contain;
  flex: none;
}
.dsh-modal-card-id {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.dsh-modal-card-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsh-modal-card-model {
  font-size: 10.5px;
  font-family: "SF Mono", Consolas, monospace;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsh-modal-card-tbl {
  display: grid;
  gap: 3px 10px;
  margin-top: 10px;
  align-items: center;
}
.dsh-modal-card-tbl-h {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--dsw-alias-label-tertiary);
  text-transform: uppercase;
  white-space: nowrap;
  text-align: center;
}
.dsh-modal-card-tbl-lb {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-modal-card-tbl-v {
  font-size: 11px;
  font-family: "SF Mono", Consolas, monospace;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary);
  text-align: center;
}
.dsh-modal-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh-modal-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "SF Mono", Consolas, monospace;
}
.dsh-modal-badge {
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
  padding: 1px 8px;
  color: #4a90d9;
  background: rgba(74, 144, 217, 0.12);
}
.dsh-modal-badge-global {
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
}
.dsh-modal-sec {
  margin-top: 14px;
}
.dsh-modal-sec-t {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--dsw-alias-label-tertiary);
  text-transform: uppercase;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.dsh-mgrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.dsh-mcell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
}
.dsh-mcell-lb {
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-mcell-in {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  padding: 6px 8px;
  border-radius: 9px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: #FFFFFF;
  color: var(--dsw-alias-label-primary);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  text-align: right;
  transition: all 0.15s ease;
}
body[data-ds-dark-theme] .dsh-mcell-in {
  background: #181816;
}
.dsh-mcell-in:focus {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
}
.dsh-mcell-rc {
  font-size: 9.5px;
  color: var(--dsw-alias-label-tertiary);
  font-family: "SF Mono", Consolas, monospace;
  text-align: right;
  height: 12px;
}
.dsh-mcell-rc.base {
  color: var(--dsw-alias-brand-primary);
}
.dsh-mratiotool {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-mratio-cur {
  font-size: 12px;
  font-family: "SF Mono", Consolas, monospace;
  color: var(--dsw-alias-label-secondary);
  flex: 1;
  min-width: 150px;
  font-variant-numeric: tabular-nums;
}
.dsh-mratio-hints {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
  font-size: 10.5px;
  line-height: 15px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-lockswitch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  flex: none;
}
.dsh-lockswitch-track {
  width: 30px;
  height: 17px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l2);
  position: relative;
  transition: background 0.15s ease;
  flex: none;
}
.dsh-lockswitch-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: left 0.15s ease;
}
.dsh-lockswitch.on .dsh-lockswitch-track {
  background: var(--dsw-alias-brand-primary);
}
.dsh-lockswitch.on .dsh-lockswitch-track::after {
  left: 15px;
}
.dsh-lockswitch-txt {
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-modal-peaktoggle {
  cursor: pointer;
  color: var(--dsw-alias-brand-primary);
  font-weight: 700;
  flex: none;
}
/* 修订 182：峰谷标题整行可点展开 */
.dsh-modal-peakhead {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  user-select: none;
}
.dsh-modal-peakhead:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-modal-peakhead.open {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 6%, transparent);
}
.dsh-modal-peakhint {
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  white-space: nowrap;
}
.dsh-modal-peakbody {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.22s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.18s ease;
}
.dsh-modal-peakbody.open {
  grid-template-rows: 1fr;
  opacity: 1;
}
.dsh-modal-peakbody > div {
  overflow: hidden;
  min-height: 0;
}
.dsh-modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.dsh-modal-foot-l,
.dsh-modal-foot-r {
  display: flex;
  gap: 8px;
}
.dsh-peak-on {
  border-color: var(--dsw-alias-brand-primary) !important;
  color: var(--dsw-alias-brand-primary) !important;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent) !important;
}
.dsh-free-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 4px 0 2px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
}
.dsh-price-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 0 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-price-group + .dsh-price-row {
  margin-top: 2px;
}
.dsh-detail-src {
  display: inline-flex;
  align-items: center;
  margin: 0 0 4px;
  padding: 1px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
}
.dsh-detail-src-official {
  color: var(--dsw-alias-label-tertiary);
  background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 10%, transparent);
}
.dsh-detail-src-global {
  color: var(--dsw-alias-label-secondary);
  background: color-mix(in srgb, var(--dsw-alias-label-secondary) 10%, transparent);
}
.dsh-detail-src-channel {
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
}
.dsh-detail-fix {
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  color: var(--dsw-alias-brand-primary);
  border-radius: 8px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  margin: 2px 0 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dsh-detail-fix:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
}
.dsh-tpl-gear {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 8px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dsh-tpl-gear:hover {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary);
}
.dsh-cur-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 6px;
  padding: 2px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 10%, transparent);
}
.dsh-cur-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dsh-cur-btn:hover {
  color: var(--dsw-alias-label-primary);
}
.dsh-cur-btn.dsh-on {
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base);
}
`

    
/* [inlined lib/client-data.cjs] */
const SEGMENT_IDS = ['counts', 'llm', 'toolCall', 'ttft', 'throughput', 'cacheHit', 'tokens', 'cost', 'peak', 'balance']
        const SEGMENT_LABELS = {
          counts: '轮/步', llm: 'LLM 时长', toolCall: '工具调用时长', ttft: '首 token 平均',
          throughput: '吞吐 tok/s', cacheHit: '缓存命中', tokens: '输入/输出 token', cost: '预估费用', peak: '峰谷时段', balance: 'DeepSeek 余额',
        }
        const PREVIEW_TEXTS = {
          counts: '12 轮 · 45 步', llm: 'LLM 2m10s', toolCall: '工具调用时长 45s', ttft: '首 token 平均 1.8s', throughput: '34.2 tok/s',
          cacheHit: { separate: '缓存命中 5.93M tok', combined: '缓存命中 97%' },
          tokens: { separate: '输入 96.3K tok · 输出 72.8K tok', combined: '输入 6.0M tok · 输出 72.8K tok' },
          cost: '预估 ¥0.36', peak: '⏱ 高峰 输入 ¥3.0/1M', balance: 'DeepSeek 余额 ¥18.20',
        }
        const DEFAULT_COMPOSITION = SEGMENT_IDS.map((id) => ({ id, enabled: true }))

            const VENDOR_TEMPLATES = [
              { id: 'auto', name: '⚡ 自动识别（默认）' },
              { id: 'deepseek-v4', name: '🐳 DeepSeek V4', nick: 'DeepSeek V4', logo: 'deepseek', prefix: 'deepseek-', versions: ['v3.1', 'v3.2', 'v4-flash', 'v4-pro'], currency: 'USD', out: 3, read: 0.0318, write: 0, match: 'deepseek-v4-flash · deepseek-v4-pro' },
              { id: 'claude', name: '⚡ Claude', nick: 'Claude', logo: 'anthropic', prefix: 'claude-', versions: ['sonnet-5', 'opus-5'], currency: 'USD', out: 5, read: 0.1, write: 1.25, match: 'claude-sonnet-5 · claude-opus-5' },
              { id: 'openai-gpt5', name: '🧠 GPT-5.x', nick: 'GPT-5.x', logo: 'openai', prefix: 'gpt-', versions: ['5.5', '5.6-sol', '5.6-luna'], currency: 'USD', out: 6, read: 0.1, write: 1.25, match: 'gpt-5.6-sol · gpt-5.6-luna' },
              { id: 'gemini', name: '🌐 Gemini 3', nick: 'Gemini 3', logo: 'google', prefix: 'gemini-', versions: ['3.7-flash'], currency: 'USD', out: 4, read: 0.25, write: 1, match: 'gemini-3.7-flash' },
              { id: 'kimi', name: '🌙 Kimi K3', nick: 'Kimi K3', logo: 'moonshot', prefix: 'kimi-', versions: ['k3', 'k3-fast'], currency: 'CNY', out: 4, read: 0.2, write: 1, match: 'kimi-k3 · kimi-k3-fast' },
              { id: 'qwen35', name: '🇨🇳 Qwen 3.5', nick: 'Qwen 3.5', logo: 'alibaba', prefix: 'qwen-', versions: ['3.5-plus', '3.5-omni-plus'], currency: 'CNY', out: 5, read: 0.1667, write: 1, match: 'qwen3.5-plus · qwen3.5-omni-plus' },
              { id: 'glm', name: '📘 GLM 5', nick: 'GLM 5', logo: 'zhipu', prefix: 'glm-', versions: ['5.2', '5.3'], currency: 'CNY', out: 3.5, read: 0.2, write: 1, match: 'glm-5.2 · glm-5.3' },
              { id: 'minimax', name: '🤖 MiniMax M3', nick: 'MiniMax M3', logo: 'minimax', prefix: 'minimax-', versions: ['m3', 'm3-preview'], currency: 'CNY', out: 4, read: 0.1, write: 1, match: 'minimax-m3 · minimax-m3-preview' },
              { id: 'doubao', name: '⚡ 豆包 Seed 2', nick: '豆包 Seed 2', logo: 'volcengine', prefix: 'doubao-', versions: ['seed-2-1-turbo', 'seed-2.1-pro'], currency: 'CNY', out: 4, read: 0.1, write: 1, match: 'seed-2-1-turbo · doubao-seed-2.1-pro' },
              { id: 'grok', name: '🪐 Grok 4', nick: 'Grok 4', logo: 'xai', prefix: 'grok-', versions: ['4.6'], currency: 'USD', out: 5, read: 0.1, write: 1, match: 'grok-4.6' },
              { id: 'custom', name: '⚙️ 手动填写' },
            ]

            const RATIO_ORDERS = [
              { id: 'in-out-read-write', label: '输入:输出:缓存读:缓存写', head: '比例（输入:输出:缓存读:缓存写）' },
              { id: 'in-read-write-out', label: '输入:缓存读:缓存写:输出', head: '比例（输入:缓存读:缓存写:输出）' },
            ]
            const ratioOrderObj = (o) => RATIO_ORDERS.find((r) => r.id === o) || RATIO_ORDERS[0]

            const ratioCellsOf = (o, t) => o === 'in-out-read-write'
              ? [['输入', 1, false], ['输出', t.out, t.out === 0], ['缓存读', t.read, t.read === 0], ['缓存写', t.write, t.write === 0]]
              : [['输入', 1, false], ['缓存读', t.read, t.read === 0], ['缓存写', t.write, t.write === 0], ['输出', t.out, t.out === 0]]

            const LEGACY_TPLS = {
              openaiClassic: { currency: 'USD', out: 4, read: 0.5, write: 1.0 },
              deepseekV3: { currency: 'CNY', out: 4, read: 0.25, write: 1.0 },
              qwenClassic: { currency: 'CNY', out: 3, read: 0.25, write: 1.0 },
              generic: { currency: 'USD', out: 4, read: 0.25, write: 1.0 },
            }

    
/* [inlined lib/client-format.cjs] */
const balInfosOf = (b) => (b !== null && b !== undefined && Array.isArray(b.infos) ? b.infos : []).filter((i) => i.currency === 'CNY' || Number(i.toppedUp) !== 0)

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

        const formatCtx = (n) => {
          if (!Number.isFinite(n)) return String(n)
          if (n >= 1e6) return (Math.round(n / 1e6 * 10) / 10) + 'M'
          if (n >= 1e3) {
            const k = n / 1e3
            return (k >= 100 ? String(Math.round(k)) : String(Math.round(k * 10) / 10)) + 'k'
          }
          return String(n)
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

            const r4x = (x) => Math.round(x * 1000) / 1000

            const cellRatio = (inV, v) => {
              const inN = Number(inV)
              if (!Number.isFinite(inN) || inN <= 0) return null
              if (v === undefined || v === null || !Number.isFinite(Number(v))) return null
              return (Math.round((Number(v) / inN) * 10000) / 10000) + 'x'
            }


    
    const LS_CFG_KEY = 'dsh-bottom-bar:config'
    const getLocalConfig = () => {
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_CFG_KEY) : null
        if (raw) return JSON.parse(raw)
      } catch (e) {}
      return null
    }
    const setLocalConfig = (cfg) => {
      try {
        if (typeof localStorage !== 'undefined' && cfg && typeof cfg === 'object') {
          localStorage.setItem(LS_CFG_KEY, JSON.stringify(cfg))
        }
      } catch (e) {}
    }
    // 修订 160：峰谷提示语取值顺序——估算自带标签 → 本地配置兜底 → 默认
    const pkLabelFor = (p, which) => {
      const v = p ? (which === 'on' ? p.labelOn : p.labelOff) : undefined
      if (typeof v === 'string' && v !== '') return v
      const lc = getLocalConfig()
      const k = which === 'on' ? 'peakLabel' : 'peakIdleLabel'
      if (lc && typeof lc[k] === 'string' && lc[k] !== '') return lc[k]
      return which === 'on' ? '高峰' : '低谷'
    }

    
    async apply(ctx) {
      // 修订 36（静态包）：Remote contribution——host 侧 SRC 发现按方法名路由，
      // 客户端在 apply 里运行时 $mount 本 contribution（预构建的 dsh-api-remotes
      // 不包含我们，必须自挂载），之后 ctx.get('remote.bottomBar') 才可用。
      // ⚠️ 常量必须声明在 apply 内：生成器把 factory 顶层的语句放进动态插件的
      // return 对象字面量中间（const 声明在对象里 = 语法错误）。
      const TYPERT_JSON = { _zod: {}, parse: (v) => v }
      const TYPERT_REMOTE = {
        package: '@kc0ed/dsh-bottom-bar',
        descriptors: [
          { id: 'dsh-bottom-bar#bottomBar/estimateCost', service: 'bottomBar', namespace: 'bottomBar', method: 'estimateCost', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/getClientUsage', service: 'bottomBar', namespace: 'bottomBar', method: 'getClientUsage', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/getBalance', service: 'bottomBar', namespace: 'bottomBar', method: 'getBalance', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
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
        styles.insert(CLIENT_CSS)
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
        // 修订 125：最近 N 次请求的吞吐/时延统计——扫 settledNodes 的 assistant
        // step(带解码耗时的),取最后 N 条快速算平均;「偷懒」版,零 host 改动
        const requestStatsOf = (nodes, lastN) => {
          const list = Array.isArray(nodes) ? nodes : []
          const all = []
          for (const node of list) {
            if (node.kind !== 'assistant') continue
            const r = assistantStepReading(node)
            if (r.decodeMs === null || r.decodeMs <= 0 || r.outputTokens === null) continue
            const u = node.usage
            all.push(Object.assign({}, r, {
              // 修订 133：字段兜底(uncachedInputTokens 缺失时回退 inputTokens)
              inTokens: (u !== undefined && u !== null) ? (((u.uncachedInputTokens !== undefined ? u.uncachedInputTokens : (u.inputTokens !== undefined ? u.inputTokens : 0))) + (u.cacheReadTokens !== undefined ? u.cacheReadTokens : 0) + (u.cacheWriteTokens !== undefined ? u.cacheWriteTokens : 0)) : 0,
              readTokens: (u !== undefined && u !== null && u.cacheReadTokens !== undefined) ? u.cacheReadTokens : 0,
              writeTokens: (u !== undefined && u !== null && u.cacheWriteTokens !== undefined) ? u.cacheWriteTokens : 0,
            }))
          }
          const sel = lastN > 0 && all.length > lastN ? all.slice(all.length - lastN) : all
          let decodeMs = 0, outputTokens = 0, inTokens = 0, readTokens = 0, writeTokens = 0, ttftMs = 0, ttftN = 0
          for (const r of sel) {
            decodeMs += r.decodeMs
            outputTokens += r.outputTokens
            inTokens += r.inTokens
            readTokens += r.readTokens
            writeTokens += r.writeTokens
            if (r.ttftMs !== null) { ttftMs += r.ttftMs; ttftN += 1 }
          }
          return { count: sel.length, decodeMs, outputTokens, inTokens, readTokens, writeTokens, ttftMs: ttftN > 0 ? ttftMs / ttftN : null }
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
          // 修订 75/79：峰谷计价开启且实际套用高峰价时,费用段标注当前时段
          if (estimate.peak !== undefined && estimate.peak.priced) text += estimate.peak.window === 'peak' ? ' · 高峰' : ' · 空闲'
          return text
        }
// 1.1.1 拆出:SEGMENT_IDS/SEGMENT_LABELS/PREVIEW_TEXTS/DEFAULT_COMPOSITION → lib/client-data.cjs
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
        // 修订 90：峰谷模型切换滑槽——分段式滑动指示条（轨道 + 平滑滑动滑块）
        const PeakModelSlider = (props) => {
          const segRefs = React.useRef([])
          const thumbRef = React.useRef(null)
          const rootRef = React.useRef(null)
          const { models, curIdx, onPick, label } = props
          const measure = React.useCallback(() => {
            const thumb = thumbRef.current
            const seg = segRefs.current[curIdx]
            if (thumb === null || seg === null || seg === undefined) return
            thumb.style.left = seg.offsetLeft + 'px'
            thumb.style.width = seg.offsetWidth + 'px'
          }, [curIdx])
          React.useLayoutEffect(() => {
            measure()
          }, [measure, models])
          // 修订 113：币种切换/弹层宽度变化时滑槽 seg 位置会变,
          // ResizeObserver 监听容器,宽度一变立即重量 thumb,消除滞后
          React.useEffect(() => {
            if (typeof ResizeObserver === 'undefined') return
            const root = rootRef.current
            if (root === null) return
            const ro = new ResizeObserver(() => { measure() })
            ro.observe(root)
            return () => ro.disconnect()
          }, [measure])
          return React.createElement('div', { className: 'dsh-peak-slider', ref: rootRef },
            React.createElement('span', { className: 'dsh-peak-slider-thumb', ref: thumbRef }),
            models.map((m, i) => {
              // 修订 127：兼容字符串项(吞吐滑槽传 ['全部','最近 100']),
              // 峰谷场景传对象(有 .model);统一取 key 与 label
              const key = typeof m === 'string' ? m : m.model
              return React.createElement('button', {
                key,
                className: 'dsh-peak-slider-seg' + (i === curIdx ? ' dsh-on' : ''),
                ref: (el) => { segRefs.current[i] = el },
                onClick: () => onPick(i),
              }, typeof m === 'string' ? label(m) : label(m.model))
            }),
          )
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
            const initDockCfg = getLocalConfig()
            // 修订 26/62：首帧秒级从 LocalStorage + compositionValue 双重水合，刷新网页 0ms 完美保持所有定制配置
            const [composition, setComposition] = React.useState(Array.isArray(compositionValue) ? compositionValue : (initDockCfg && Array.isArray(initDockCfg.segments) ? initDockCfg.segments : DEFAULT_COMPOSITION))
            const [mode, setMode] = React.useState(initDockCfg && (initDockCfg.mode === 'separate' || initDockCfg.mode === 'combined') ? initDockCfg.mode : 'separate')
            const [tooltipAlways, setTooltipAlways] = React.useState(initDockCfg ? initDockCfg.tooltip === 'always' : false)
            const [precision, setPrecision] = React.useState(initDockCfg && initDockCfg.precision === 'full' ? 'full' : 'compact')
            const [detailSeg, setDetailSeg] = React.useState(null)
            // 修订 89：峰谷明细弹层的模型切换索引（◀ 模型名 ▶）
            const [peakModelIdx, setPeakModelIdx] = React.useState(0)
            const [peakCur, setPeakCur] = React.useState('both')
            // 修订 126：吞吐明细统计窗口滑槽(0=全部,1=最近100)
            // 修订 135：统计窗口选择持久化——localStorage 存 tputWin,页面刷新/重挂载后恢复
            const [tputWin, setTputWin] = React.useState(() => {
              try {
                return (typeof localStorage !== 'undefined' && localStorage.getItem('dsh-bottom-bar:tputWin') === '1') ? 1 : 0
              } catch (e) { return 0 }
            })
            // 修订 162：设置保存即时刷新——监听 dsh-config-saved 事件重绘,
            // 提示语等本地兜底配置一帧生效,不等 1.5s 轮询
            const [, setCfgTick] = React.useState(0)
            React.useEffect(() => {
              const onCfg = () => setCfgTick((t) => t + 1)
              if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('dsh-config-saved', onCfg)
                return () => { window.removeEventListener('dsh-config-saved', onCfg) }
              }
            }, [])
            const chooseTputWin = (i) => {
              setTputWin(i)
              try { if (typeof localStorage !== 'undefined') localStorage.setItem('dsh-bottom-bar:tputWin', i === 1 ? '1' : '0') } catch (e) { /* ignore */ }
            }
            // 修订 124：底栏货币——点 USD/CNY 时跟随;点「两类」保持当前显示不跳动
            const [barCur, setBarCur] = React.useState('usd')
            const chooseCur = (v) => {
              setPeakCur(v)
              if (v === 'usd') setBarCur('usd')
              else if (v === 'cny') setBarCur('cny')
            }
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
                    if (result && typeof result === 'object') setLocalConfig(result)
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
            // 修订 128/129/130：最近 100 请求统计提升为组件级——host 增量优先
            // (est.recent),回退客户端扫描;底栏吞吐/token 段与详情滑槽联动共用
            let r100 = { count: 0, decodeMs: 0, outputTokens: 0, inTokens: 0, readTokens: 0, writeTokens: 0, ttftMs: null }
            if (estimate !== null && estimate !== undefined && estimate.recent !== null && estimate.recent !== undefined && estimate.recent.count > 0) {
              r100 = {
                count: estimate.recent.count,
                decodeMs: estimate.recent.decodeMs,
                outputTokens: estimate.recent.outputTokens,
                inTokens: estimate.recent.inTokens !== undefined ? estimate.recent.inTokens : 0,
                readTokens: estimate.recent.readTokens !== undefined ? estimate.recent.readTokens : 0,
                writeTokens: estimate.recent.writeTokens !== undefined ? estimate.recent.writeTokens : 0,
                ttftMs: estimate.recent.ttftMs,
              }
            } else {
              r100 = requestStatsOf(settledNodes, 100)
            }
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
              throughput: () => {
                // 修订 130：底栏吞吐跟随详情滑槽——「最近 100」窗口显示近100平均
                if (tputWin === 1 && r100.count > 0 && r100.decodeMs > 0) {
                  return t('stats.tokensPerSecond', { throughput: formatTokensPerSecond(r100.outputTokens / (r100.decodeMs / 1e3)) })
                }
                return stats.decodeMs > 0 ? t('stats.tokensPerSecond', { throughput: formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1e3)) }) : null
              },
              cacheHit: () => usageActive && (separate ? (usage.cacheReadTokens || 0) > 0 : cacheHitPct !== null)
                ? (separate ? tb('cacheHit', { tokens: formatTokens(usage.cacheReadTokens) }) : t('stats.cacheHit', { percent: cacheHitPct }))
                : null,
              tokens: () => {
                if (!usageActive) return null
                // 修订 130：底栏 token 跟随详情滑槽——「最近 100」窗口显示近100各桶
                if (tputWin === 1 && r100.count > 0) {
                  return tb('input', {
                    input: formatTokens(separate ? r100.inTokens - r100.readTokens : r100.inTokens),
                    output: formatTokens(r100.outputTokens),
                  })
                }
                return tb('input', {
                  input: formatTokens(separate ? (usage.uncachedInputTokens || 0) + (usage.cacheWriteTokens || 0) : billedInputTokens(usage)),
                  output: formatTokens(usage.outputTokens || 0),
                })
              },
              cost: () => {
                if (estimate === null) return usageActive ? '计算中…' : null
                return costGroup(estimate, precision, null)
              },
              // 修订 78/79/85/91：峰谷提醒分段——价格跟随明细滑槽所选模型(多模型
              // 时带短模型名),标注桶类型(输入)与参考/实际身份
              peak: () => {
                if (estimate === null || estimate.peak === undefined || !estimate.peak.enabled) return null
                const p = estimate.peak
                const models = Array.isArray(p.models) && p.models.length > 0 ? p.models : null
                const idx = models !== null ? Math.min(peakModelIdx, models.length - 1) : 0
                const cur = models !== null ? models[idx] : p
                // 修订 122/124：底栏币种——栏内 barCur 决定(点 USD/CNY 跟随,
                // 「两类」保持当前显示不跳动);模型无 alt(CNY)时回落主币种
                const hasCny = cur.baseAltIn !== null && cur.baseAltIn !== undefined
                const useCny = barCur === 'cny' && hasCny
                const inPrice = p.window === 'peak'
                  ? (useCny ? cur.peakAltIn : cur.peakIn)
                  : (useCny ? cur.baseAltIn : cur.baseIn)
                const inCurrency = useCny ? 'CNY' : (cur.currency || 'USD')
                const priceText = inPrice !== null && inPrice !== undefined ? compactMoney(inPrice, inCurrency, 'compact') + '/1M' : ''
                const when = (p.window === 'peak' ? '⏱ ' + pkLabelFor(p, 'on') : '⏱ ' + pkLabelFor(p, 'off'))
                const ref = p.priced ? '' : ' 参考'
                const modelTag = models !== null && models.length > 1
                  ? ({ 'deepseek-v4-flash': ' Flash', 'deepseek-v4-pro': ' Pro' }[cur.model] || ' ' + cur.model)
                  : ''
                return when + ref + modelTag + ' 输入 ' + priceText
              },
              // 修订 168/173：DeepSeek 余额分段——文字即「DeepSeek 余额 ¥xx.xx」
              // (不用 💳 emoji,避免基线不对齐;未配置 Key/加载中不显示,失败占位)
              balance: () => {
                const b = estimate !== null && estimate !== undefined ? estimate.balance : undefined
                if (b === undefined || b === null || b.status === 'nokey' || b.status === 'loading') return null
                if (b.status === 'error') return 'DeepSeek 余额 查询失败'
                const infos = Array.isArray(b.infos) ? b.infos : []
                if (infos.length === 0) return null
                const pri = infos.find((i) => i.currency === 'CNY') || infos[0]
                const sym = pri.currency === 'CNY' ? '¥' : (pri.currency === 'USD' ? '$' : pri.currency + ' ')
                return 'DeepSeek 余额 ' + sym + (Math.round(pri.total * 100) / 100).toFixed(2)
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
              // 修订 134：点击时立即取消悬停黑条定时器(否则 260ms 后黑条与弹层
              // 打架,造成「点开响应变慢/乱」的感觉),确认延迟 160→100ms
              if (timerRef.current !== null) { timerRef.current(); timerRef.current = null }
              setPos(null)
              segClickTimerRef.current = ctx.timeout(() => {
                segClickTimerRef.current = null
                toggleDetail(segId, el)
              }, 100)
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
              // 修订 82/84/87：峰谷分段状态类——胶囊背景条件=「计费开关开 ∧ 高峰
              // 时段」(用户拍板:谷期不用管);非官方/未计价保持低调参考样式
              let segClass = 'dsh-seg'
              let peakPriceText = ''
              if (group.id === 'peak' && estimate !== null && estimate.peak !== undefined && estimate.peak.enabled) {
                const pk = estimate.peak
                if (pk.billing === true && pk.window === 'peak') {
                  segClass += ' dsh-seg-peak'
                } else if (pk.priced !== true) {
                  segClass += ' dsh-seg-ref'
                }
                const sp = group.text.lastIndexOf(' ')
                if (sp !== -1) {
                  peakPriceText = group.text.slice(sp + 1)
                  group.text = group.text.slice(0, sp)
                }
              }
              const isPeakWindow = group.id === 'peak' && estimate !== null && estimate.peak !== undefined && estimate.peak.window === 'peak'
              children.push(React.createElement('span', {
                className: segClass, key: group.id, title: '点击查看明细',
                onClick: (e) => onSegClick(group.id, e.currentTarget),
                onDoubleClick: cancelSegClick,
              },
                group.text,
                peakPriceText !== ''
                  ? React.createElement('span', { className: 'dsh-seg-price' + (isPeakWindow ? ' dsh-seg-price-hot' : '') }, ' ' + peakPriceText)
                  : null,
              ))
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
                case 'throughput': {
                  // 修订 126：统计窗口滑槽——「全部 / 最近 100」切换,数据跟随
                  const isRecent = tputWin === 1
                  const win = isRecent
                    ? { decodeMs: r100.decodeMs, decodeTokens: r100.outputTokens, ttftMs: r100.ttftMs, ttftN: r100.count }
                    : { decodeMs: stats.decodeMs, decodeTokens: stats.decodeTokens, ttftMs: stats.ttftSteps > 0 ? stats.ttftMs / stats.ttftSteps : null, ttftN: isRecent ? 0 : stats.steps }
                  const rows = [{
                    slider: true,
                    models: ['全部', '最近 100'],
                    curIdx: tputWin,
                    onPick: chooseTputWin,
                  }]
                  rows.push(['平均吞吐', formatTokensPerSecond(win.decodeMs > 0 ? win.decodeTokens / (win.decodeMs / 1e3) : 0) + ' tok/s'])
                  rows.push(['输出 token', formatTokens(win.decodeTokens) + ' tok'])
                  rows.push(['解码时长', formatDuration(win.decodeMs)])
                  rows.push([isRecent ? '请求数' : '步数', String(win.ttftN)])
                  if (win.ttftMs !== null) rows.push(['平均首 token', formatDuration(win.ttftMs)])
                  return rows
                }
                case 'cacheHit': return usageActive
                  ? [['缓存命中', formatTokens(usage.cacheReadTokens || 0) + ' tok'], ['输入总量', formatTokens(billedInputTokens(usage)) + ' tok'], ['命中率', cacheHitPct === null ? '—' : cacheHitPct + '%']]
                  : null
                // 修订 170：余额明细精简——只留 可用 + 各币种余额 + 更新时间(赠额/充值删)
                case 'balance': {
                  const b = estimate !== null && estimate !== undefined ? estimate.balance : undefined
                  if (b === undefined || b === null || b.status === 'nokey') return [['DeepSeek 余额', '未配置 API Key']]
                  if (b.status === 'loading') return [['DeepSeek 余额', '查询中…']]
                  if (b.status === 'error') return [['DeepSeek 余额', '查询失败'], ['原因', b.error || '—']]
                  const rows = [['可用', b.isAvailable === true ? '是' : '否']]
                  for (const i of balInfosOf(b)) {
                    rows.push([i.currency + ' 余额', compactMoney(i.total, i.currency, 'full')])
                  }
                  rows.push(['更新于', new Date(b.at).toLocaleTimeString()])
                  return rows
                }
                case 'tokens': {
                  // 修订 129：token 明细联动统计窗口滑槽——「全部 / 最近 100」
                  const rows = [{
                    slider: true,
                    models: ['全部', '最近 100'],
                    curIdx: tputWin,
                    onPick: chooseTputWin,
                  }]
                  if (tputWin === 1) {
                    // 修订 132：按真实桶拆分——「未缓存输入」= 总输入−缓存读−缓存写,
                    // 与底栏 separate 口径一致(之前误显示总输入,标签名不副实)
                    rows.push(['未缓存输入', formatTokens(r100.inTokens - r100.readTokens - r100.writeTokens) + ' tok'])
                    rows.push(['缓存读', formatTokens(r100.readTokens) + ' tok'])
                    rows.push(['缓存写', formatTokens(r100.writeTokens) + ' tok'])
                    rows.push(['输出', formatTokens(r100.outputTokens) + ' tok'])
                  } else if (usageActive) {
                    rows.push(['未缓存输入', formatTokens(usage.uncachedInputTokens || 0) + ' tok'])
                    rows.push(['缓存读', formatTokens(usage.cacheReadTokens || 0) + ' tok'])
                    rows.push(['缓存写', formatTokens(usage.cacheWriteTokens || 0) + ' tok'])
                    rows.push(['输出', formatTokens(usage.outputTokens || 0) + ' tok'])
                  }
                  return rows
                }
                default: return null
              }
            }
            // 修订 84：峰谷明细 = 高峰/空闲价格对比表格（当前时段列高亮）+ 规则行
            const peakDetail = () => {
              if (estimate === null || estimate.peak === undefined || !estimate.peak.enabled) return null
              const p = estimate.peak
              const nodes = []
              const money = (v, altV) => {
                const usd = v !== null && v !== undefined ? compactMoney(v, 'USD', 'compact') + '/1M' : null
                const cny = altV !== null && altV !== undefined ? compactMoney(altV, 'CNY', 'compact') + '/1M' : null
                if (peakCur === 'usd') return usd !== null ? usd : '—'
                if (peakCur === 'cny') return cny !== null ? cny : '—'
                return [usd, cny].filter((x) => x !== null).join(' / ') || '—'
              }
              const hot = p.window === 'peak' ? 'peak' : 'base'
              const cell = (text, head, colHot, keyNum) => React.createElement('span', {
                className: 'dsh-peak-cell' + (head ? ' dsh-peak-cell-head' : '') + (colHot ? ' dsh-peak-cell-hot' : ''),
                key: 'pc' + keyNum,
              }, text)
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'cur' },
                React.createElement('span', null, '当前时段'),
                React.createElement('span', null, p.window === 'peak' ? pkLabelFor(p, 'on') : pkLabelFor(p, 'off')),
              ))
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'bill' },
                React.createElement('span', null, '实际计费'),
                React.createElement('span', null, p.priced ? '按当前时段价' : '本渠道不计峰谷 · 按基价(空闲价)'),
              ))
              // 修订 88/89：官方峰谷价按模型展示——多模型时给「占一行左右切换」
              const modelLabel = (m) => ({ 'deepseek-v4-flash': 'DeepSeek V4 Flash', 'deepseek-v4-pro': 'DeepSeek V4 Pro' }[m] || m)
              const modelList = Array.isArray(p.models) && p.models.length > 0 ? p.models : null
              const curIdx = modelList !== null ? Math.min(peakModelIdx, modelList.length - 1) : 0
              const curModel = modelList !== null ? modelList[curIdx] : p
              const tableFor = (mm, tblKey) => React.createElement('div', { className: 'dsh-peak-table', key: tblKey },
                cell('单价(1M)', true, false, 0),
                cell('高峰', true, hot === 'peak', 1),
                cell('空闲', true, hot === 'base', 2),
                cell('输入', false, false, 3),
                cell(money(mm.peakIn, mm.peakAltIn), false, hot === 'peak', 4),
                cell(money(mm.baseIn, mm.baseAltIn), false, hot === 'base', 5),
                cell('缓存读', false, false, 6),
                cell(money(mm.peakRead, mm.peakAltRead), false, hot === 'peak', 7),
                cell(money(mm.baseRead, mm.baseAltRead), false, hot === 'base', 8),
                cell('输出', false, false, 9),
                cell(money(mm.peakOut, mm.peakAltOut), false, hot === 'peak', 10),
                cell(money(mm.baseOut, mm.baseAltOut), false, hot === 'base', 11),
              )
              if (modelList !== null && modelList.length > 1) {
                nodes.push(React.createElement(PeakModelSlider, { key: 'sl', models: modelList, curIdx, onPick: setPeakModelIdx, label: modelLabel }))
              } else if (modelList !== null) {
                nodes.push(React.createElement('div', { className: 'dsh-peak-model', key: 'mh' }, modelLabel(curModel.model)))
              }
              // 修订 111：币种切换——USD(国际)/ CNY(中国区) / 两类,默认两类
              nodes.push(React.createElement('div', { className: 'dsh-cur-toggle', key: 'curt' },
                React.createElement('button', { className: 'dsh-cur-btn' + (peakCur === 'usd' ? ' dsh-on' : ''), onClick: () => chooseCur('usd') }, 'USD'),
                React.createElement('button', { className: 'dsh-cur-btn' + (peakCur === 'cny' ? ' dsh-on' : ''), onClick: () => chooseCur('cny') }, 'CNY'),
                React.createElement('button', { className: 'dsh-cur-btn' + (peakCur === 'both' ? ' dsh-on' : ''), onClick: () => chooseCur('both') }, '两类'),
              ))
              nodes.push(tableFor(curModel, 'tbl'))
              // 修订 92/120：高峰时段 chips——优先用该模型自己的窗口(通用峰谷),
              // 缺省回退 DeepSeek 默认窗口
              const rangeLabels = Array.isArray(p.ranges) && p.ranges.length > 0 ? p.ranges : ['9:00-12:00', '14:00-18:00']
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'win' },
                React.createElement('span', null, '高峰时段'),
                React.createElement('span', { className: 'dsh-peak-ranges' },
                  rangeLabels.map((r) => React.createElement('span', { className: 'dsh-peak-range' + (p.activeRange === r ? ' dsh-peak-range-hot' : ''), key: r }, r + (p.activeRange === r ? ' · 当前' : ''))),
                ),
              ))
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'off' },
                React.createElement('span', null, '空闲时段'),
                React.createElement('span', null, '其余时间（高峰一半）' + (p.window === 'offpeak' ? ' · 当前' : '')),
              ))
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'tz' },
                React.createElement('span', null, '时区'),
                React.createElement('span', null, p.tz === undefined || p.tz === 'system' ? '跟随系统' : p.tz),
              ))
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'ch' },
                React.createElement('span', null, '适用渠道'),
                React.createElement('span', null, Array.isArray(p.providers) && p.providers.length > 0 ? p.providers.join(', ') : '未配置'),
              ))
              return nodes
            }
            const costDetail = () => {
              if (typeof estimate !== 'object' || estimate === null || !estimate.hasUsage) return null
              const nodes = []
              // 修订 75/79：峰谷计价实际套用时,明细面板首行标注当前时段
              if (estimate.peak !== undefined && estimate.peak.priced) {
                nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'peak' },
                  React.createElement('span', null, '当前时段'),
                  React.createElement('span', null, estimate.peak.window === 'peak' ? pkLabelFor(estimate.peak, 'on') + ' · 9:00-12:00/14:00-18:00' : pkLabelFor(estimate.peak, 'off') + '时段'),
                ))
              }
              if (Array.isArray(estimate.priced)) {
                for (const p of estimate.priced) {
                  nodes.push(React.createElement('div', { className: 'dsh-detail-model', key: 'm' + p.model }, p.model))
                  // 修订 103：价格来源标注(免费模型已有绿色徽章,不再重复)
                  if (p.free !== true) {
                    const srcMeta = {
                      official: ['按官方价估算', 'dsh-detail-src-official'],
                      global: ['你的全局价', 'dsh-detail-src-global'],
                      channel: ['渠道特选价', 'dsh-detail-src-channel'],
                    }
                    const sm = srcMeta[p.source]
                    if (sm !== undefined) {
                      nodes.push(React.createElement('span', { className: 'dsh-detail-src ' + sm[1], key: 'src' + p.model }, sm[0]))
                    }
                  }
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
                  if (p.free === true && p.refCost !== null && p.refCost !== undefined && p.refCost > 0) {
                    nodes.push(React.createElement('div', { className: 'dsh-free-badge', key: 'f' + p.model },
                      React.createElement('span', null, '🎉 免费渠道'),
                      React.createElement('span', null, '按官方价本应 ' + compactMoney(p.refCost, p.refCurrency, 'full') + ' · 已省 ' + compactMoney(p.refCost, p.refCurrency, 'full')),
                    ))
                  }
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
                  // 修订 104：未配置价格的模型给「一键按官方价配置」入口(最短路径闭环)
                  nodes.push(React.createElement('div', { className: 'dsh-detail-empty', key: 'ue' + u.model }, '未配置价格 · ' + formatTokens(toks) + ' tok'))
                  nodes.push(React.createElement('button', { className: 'dsh-detail-fix', key: 'uf' + u.model, onClick: () => { host.call('set-price', { model: u.model, price: {} }).catch((err) => console.error('dsh-bottom-bar: fix price failed', err)) } }, '按官方价一键配置'))
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
              : detailSeg === 'peak'
                ? peakDetail()
                : (() => {
                const rows = segDetailRows(detailSeg)
                if (rows === null) return null
                return rows.map((row, i) => (row !== null && row !== undefined && row.slider === true)
                  ? React.createElement(PeakModelSlider, { key: 'sl-' + i, models: row.models, curIdx: row.curIdx, onPick: row.onPick, label: (m) => m })
                  : React.createElement('div', { className: 'dsh-detail-row', key: i },
                    React.createElement('span', null, row[0]),
                    React.createElement('span', null, row[1]),
                  ),
                )
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
            const initPageCfg = getLocalConfig()
            const [segments, setSegments] = React.useState(Array.isArray(compositionValue) ? compositionValue : (initPageCfg && Array.isArray(initPageCfg.segments) ? initPageCfg.segments : null))
            const [loaded, setLoaded] = React.useState(Array.isArray(compositionValue) || !!(initPageCfg && Array.isArray(initPageCfg.segments)))
            const [mode, setMode] = React.useState(initPageCfg && (initPageCfg.mode === 'separate' || initPageCfg.mode === 'combined') ? initPageCfg.mode : 'separate')
            const [tooltipAlways, setTooltipAlways] = React.useState(initPageCfg ? initPageCfg.tooltip === 'always' : false)
            const [precision, setPrecision] = React.useState(initPageCfg && initPageCfg.precision === 'full' ? 'full' : 'compact')
            // 修订 75：峰谷定价开关 + 当前时段指示（DeepSeek 2026-08-17 起）
            const [peakEnabled, setPeakEnabled] = React.useState(initPageCfg ? initPageCfg.peakEnabled === true : false)
            const [peakRemind, setPeakRemind] = React.useState(initPageCfg ? initPageCfg.peakRemind === true : true)
            const [peakNow, setPeakNow] = React.useState(initPageCfg && (initPageCfg.peakNow === 'peak' || initPageCfg.peakNow === 'offpeak') ? initPageCfg.peakNow : null)
            // 修订 77：峰谷时区——'system'=跟随系统,或 'UTC±N' 固定偏移
            const [peakTz, setPeakTz] = React.useState(initPageCfg && typeof initPageCfg.peakTimezone === 'string' ? initPageCfg.peakTimezone : 'system')
            // 修订 108：峰谷适用渠道白名单(逗号分隔文本,默认官方 deepseek + opencode 系)
            const [peakProvidersText, setPeakProvidersText] = React.useState(initPageCfg && Array.isArray(initPageCfg.peakProviders) ? initPageCfg.peakProviders.join(', ') : 'deepseek, opencode, opencode-go')
            // 修订 159：峰谷提示语可自定义(默认 高峰/低谷,预设 梁文峰/梁文谷)
            const [peakLabel, setPeakLabel] = React.useState(initPageCfg && typeof initPageCfg.peakLabel === 'string' && initPageCfg.peakLabel !== '' ? initPageCfg.peakLabel : '高峰')
            const [peakIdleLabel, setPeakIdleLabel] = React.useState(initPageCfg && typeof initPageCfg.peakIdleLabel === 'string' && initPageCfg.peakIdleLabel !== '' ? initPageCfg.peakIdleLabel : '低谷')
            // 修订 160：提示语保存反馈(「保存」→「✓ 已保存」闪 1.2s)
            const [peakSavedFlash, setPeakSavedFlash] = React.useState(false)
            // 修订 161：提示语编辑区展开/收起
            const [peakLblOpen, setPeakLblOpen] = React.useState(false)
            // 修订 168：DeepSeek Platform Key(仅本地)+ 余额状态
            const [dskKey, setDskKey] = React.useState(initPageCfg && typeof initPageCfg.dskKey === 'string' ? initPageCfg.dskKey : '')
            const [dskBalance, setDskBalance] = React.useState(null)
            // 修订 187：自动读取 DSH 官方 key(credentials.yaml)兜底 + 手动开关
            const [dskKeyAuto, setDskKeyAuto] = React.useState(initPageCfg !== null && initPageCfg !== undefined && initPageCfg.dskKeyAuto === true)
            const [dskManualOpen, setDskManualOpen] = React.useState(false)
            // 修订 144/146：比例四格编排顺序(默认 A = 输入:输出:缓存读:缓存写)
            const [ratioOrder, setRatioOrder] = React.useState(initPageCfg && (initPageCfg.ratioOrder === 'in-read-write-out' || initPageCfg.ratioOrder === 'in-out-read-write') ? initPageCfg.ratioOrder : 'in-out-read-write')
            const [prices, setPrices] = React.useState(null)
            const [pricesOpen, setPricesOpen] = React.useState(false)
            // 修订 139：价格区三 tab(价格表/新增价格/厂商)——替代弹出/折叠
            const [priceTab, setPriceTab] = React.useState('table')
            const [addPending, setAddPending] = React.useState(false)
            const [builtinOpen, setBuiltinOpen] = React.useState(false)
            const [growPeak, setGrowPeak] = React.useState(new Set())
            const toggleGrowPeak = (model) => { setGrowPeak((s) => { const n = new Set(s); if (n.has(model)) n.delete(model); else n.add(model); return n }) }
            const [tplOpen, setTplOpen] = React.useState(false)
            const [usedModels, setUsedModels] = React.useState([])
            const [vendorTpl, setVendorTpl] = React.useState('auto')
            // 修订 143：厂商 tab 选中行(展开匹配示例) + logo 加载失败回退字母徽章
            const [vendSel, setVendSel] = React.useState(null)
            const [vendLogoFail, setVendLogoFail] = React.useState({})
            const [newModel, setNewModel] = React.useState('')
            const [newIn, setNewIn] = React.useState('')
            const [newInPeak, setNewInPeak] = React.useState('')
            const [newCtxLimit, setNewCtxLimit] = React.useState('')
            const [newCtxIn, setNewCtxIn] = React.useState('')
            const [customCurrency, setCustomCurrency] = React.useState('CNY')
            // 修订 150：币种滑槽(空=跟模板);修订 153/155：联想下拉
            // (suggFor: ''=关, 'chan'=渠道联想, 'model'=模型联想)
            const [newCurr, setNewCurr] = React.useState('')
            const [suggFor, setSuggFor] = React.useState('')
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
            const optionsRef = React.useRef({ mode: 'separate', tooltip: 'auto', precision: 'compact', peakEnabled: false, peakRemind: true, peakTimezone: 'system', peakProviders: ['deepseek', 'opencode', 'opencode-go'] })
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
            const [fullAll, setFullAll] = React.useState(null)
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
            const hoverTimerRef = React.useRef(null)
            const handleHover = (id) => {
              if (hoverTimerRef.current !== null) {
                clearTimeout(hoverTimerRef.current)
                hoverTimerRef.current = null
              }
              setHovered(id)
            }
            const handleUnhover = () => {
              if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current)
              hoverTimerRef.current = setTimeout(() => {
                setHovered(null)
                hoverTimerRef.current = null
              }, 120)
            }
            // 鼠标悬停条目时：平滑将高光分段滑动对齐，两端自然吸附边框（不留虚空大空白，最多到边缘）；移开时不强行回弹
            React.useEffect(() => {
              const dock = previewDockRef.current
              if (dock === null || dock === undefined) return
              if (hovered !== null && previewSegRefs.current[hovered]) {
                const el = previewSegRefs.current[hovered]
                const elLeft = el.offsetLeft
                const elWidth = el.offsetWidth
                const dockWidth = dock.clientWidth
                const maxScroll = Math.max(0, dock.scrollWidth - dockWidth)
                if (maxScroll > 0) {
                  const idealScroll = elLeft - (dockWidth - elWidth) / 2
                  const targetScroll = Math.min(maxScroll, Math.max(0, idealScroll))
                  dock.scrollTo({ left: targetScroll, behavior: 'smooth' })
                }
              }
            }, [hovered])
            React.useEffect(() => {
              let cancelled = false
              host.call('get-composition')
                .then((result) => {
                  if (cancelled) return
                  if (result && typeof result === 'object') setLocalConfig(result)
                  if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                  if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                  if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                  if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
                  if (typeof result.peakEnabled === 'boolean') { setPeakEnabled(result.peakEnabled); optionsRef.current.peakEnabled = result.peakEnabled }
                  if (typeof result.peakRemind === 'boolean') { setPeakRemind(result.peakRemind); optionsRef.current.peakRemind = result.peakRemind }
                  if (typeof result.peakTimezone === 'string') { setPeakTz(result.peakTimezone); optionsRef.current.peakTimezone = result.peakTimezone }
                  if (Array.isArray(result.peakProviders)) { setPeakProvidersText(result.peakProviders.join(', ')); optionsRef.current.peakProviders = result.peakProviders }
                  if (result.ratioOrder === 'in-read-write-out' || result.ratioOrder === 'in-out-read-write') { setRatioOrder(result.ratioOrder); optionsRef.current.ratioOrder = result.ratioOrder }
                  if (typeof result.peakLabel === 'string' && result.peakLabel !== '') { setPeakLabel(result.peakLabel); optionsRef.current.peakLabel = result.peakLabel }
                  if (typeof result.peakIdleLabel === 'string' && result.peakIdleLabel !== '') { setPeakIdleLabel(result.peakIdleLabel); optionsRef.current.peakIdleLabel = result.peakIdleLabel }
                  if (typeof result.dskKey === 'string') { setDskKey(result.dskKey); optionsRef.current.dskKey = result.dskKey }
                  if (typeof result.dskKeyAuto === 'boolean') setDskKeyAuto(result.dskKeyAuto)
                  if (result.peakNow === 'peak' || result.peakNow === 'offpeak') setPeakNow(result.peakNow)
                  setLoaded(true)
                })
                .catch(() => {})
              host.call('get-prices').then((result) => { if (!cancelled && result.prices) setPrices(result.prices); if (!cancelled && Array.isArray(result.usedModels)) setUsedModels(result.usedModels) }).catch(() => {})
              host.call('diagnostics').then((result) => { if (!cancelled) setDiag(result) }).catch(() => {})
              host.call('get-client-usage').then((result) => { if (!cancelled && result.usage) setFullUsage(result.usage); if (!cancelled && result.all) setFullAll(result.all); if (!cancelled && result.balance) setDskBalance(result.balance) }).catch(() => {})
              return () => { cancelled = true }
            }, [])
            // 修订 34/42：客户端全量面板每 1s 刷新（host 侧缓存底栏捎带的用量——
            // 3s 轮询 + 底栏 1s 心跳最坏要等 4s；修订 42 降为 1s 与心跳同频，≤1s 出数）
            React.useEffect(() => {
              let alive = true
              const timer = ctx.interval(() => {
                host.call('get-client-usage').then((result) => {
                  if (!alive || !result.usage) return
                  setFullUsage(result.usage)
                  if (result.all) setFullAll(result.all)
                  if (result.balance) setDskBalance(result.balance)
                  if (result.usage.peak !== undefined && (result.usage.peak.window === 'peak' || result.usage.peak.window === 'offpeak')) setPeakNow(result.usage.peak.window)
                }).catch(() => {})
              }, 1000)
              return () => { alive = false; timer() }
            }, [])
            React.useEffect(() => {
              if (loaded) return
              const timer = ctx.timeout(() => setLoaded(true), 3000)
              return () => timer()
            }, [loaded])
            segmentsRef.current = segments
            optionsRef.current = { mode, tooltip: tooltipAlways ? 'always' : 'auto', precision, peakEnabled, peakRemind, peakTimezone: peakTz, peakProviders: peakProvidersText.split(',').map((s) => s.trim()).filter(Boolean), ratioOrder, peakLabel, peakIdleLabel, dskKey }
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
              const payload = { segments: segs ?? segmentsRef.current, ...nextOptions }
              setLocalConfig(payload)
              // 修订 162：广播配置已保存——底栏监听后立即重绘(本地兜底即刻生效)
              try { if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('dsh-config-saved')) } catch (e) { /* ignore */ }
              host.call('set-composition', payload)
                .then((result) => {
                  if (result && typeof result === 'object') setLocalConfig(result)
                  if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                  if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                  if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                  if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
                  // 修订 80：峰谷三状态在 saveOptions 返回后回写（漏了→开关点了没反应）
                  if (typeof result.peakEnabled === 'boolean') { setPeakEnabled(result.peakEnabled); optionsRef.current.peakEnabled = result.peakEnabled }
                  if (typeof result.peakRemind === 'boolean') { setPeakRemind(result.peakRemind); optionsRef.current.peakRemind = result.peakRemind }
                  if (typeof result.peakTimezone === 'string') { setPeakTz(result.peakTimezone); optionsRef.current.peakTimezone = result.peakTimezone }
                  if (Array.isArray(result.peakProviders)) { setPeakProvidersText(result.peakProviders.join(', ')); optionsRef.current.peakProviders = result.peakProviders }
                  if (result.ratioOrder === 'in-read-write-out' || result.ratioOrder === 'in-out-read-write') { setRatioOrder(result.ratioOrder); optionsRef.current.ratioOrder = result.ratioOrder }
                  if (typeof result.peakLabel === 'string' && result.peakLabel !== '') { setPeakLabel(result.peakLabel); optionsRef.current.peakLabel = result.peakLabel }
                  if (typeof result.peakIdleLabel === 'string' && result.peakIdleLabel !== '') { setPeakIdleLabel(result.peakIdleLabel); optionsRef.current.peakIdleLabel = result.peakIdleLabel }
                  if (typeof result.dskKey === 'string') { setDskKey(result.dskKey); optionsRef.current.dskKey = result.dskKey }
                  if (typeof result.dskKeyAuto === 'boolean') setDskKeyAuto(result.dskKeyAuto)
                  if (result.peakNow === 'peak' || result.peakNow === 'offpeak') setPeakNow(result.peakNow)
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
            // 修订 75：峰谷计价开关
            const togglePeak = () => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, peakEnabled: !peakEnabled }) }
            // 修订 79：峰谷提醒开关（仅显示时段,不改价格）
            const togglePeakRemind = () => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, peakRemind: !peakRemind }) }
            // 修订 77：峰谷时区切换
            const togglePeakTz = (v) => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, peakTimezone: v }) }
            // 修订 108：峰谷适用渠道保存(逗号分隔 → 数组)
            const savePeakProviders = () => {
              if (!Array.isArray(segments)) return
              const list = peakProvidersText.split(',').map((s) => s.trim()).filter(Boolean)
              if (list.length === 0) return
              setPeakProvidersText(list.join(', '))
              saveOptions({ ...optionsRef.current, peakProviders: list })
            }
            // 修订 168：DeepSeek 余额展示文案 + 强制刷新
            const dskArmed = dskKey.trim() !== '' || dskKeyAuto === true
            const refreshBalance = () => { host.call('get-balance', { force: true }).then((r) => { if (r && typeof r === 'object') setDskBalance(r) }).catch(() => {}) }
            const dskBalanceText = (() => {
              if (dskBalance === null || dskBalance === undefined) return '—'
              if (dskBalance.status === 'nokey') return '未配置 Key(底栏余额分段不显示)'
              if (dskBalance.status === 'loading') return '查询中…'
              if (dskBalance.status === 'error') return '查询失败'
              const infos = balInfosOf(dskBalance)
              if (infos.length === 0) return '无余额信息'
              return infos.map((i) => (i.currency === 'CNY' ? '¥' : i.currency === 'USD' ? '$' : i.currency + ' ') + (Math.round(i.total * 100) / 100).toFixed(2)).join(' · ')
            })()
            // 修订 189：余额状态徽章——可用=绿,欠费/不可用=红+脉冲,查询失败=红
            const dskStatus = (() => {
              if (dskBalance === null || dskBalance === undefined) return { cls: '', label: '' }
              if (dskBalance.status === 'ok') {
                const infos = balInfosOf(dskBalance)
                const total = infos.reduce((s, i) => s + Number(i.total || 0), 0)
                return dskBalance.isAvailable === true && total > 0
                  ? { cls: 'dsk-ok', label: '可用' }
                  : { cls: 'dsk-bad', label: dskBalance.isAvailable === true ? '余额不足' : '不可用' }
              }
              if (dskBalance.status === 'error') return { cls: 'dsk-bad', label: '查询失败' }
              return { cls: '', label: '' }
            })()
            const flashPeakSave = () => { setPeakSavedFlash(true); ctx.timeout(() => setPeakSavedFlash(false), 1200) }
            const savePeakLabels = () => {
              if (!Array.isArray(segments)) return
              const a = peakLabel.trim() === '' ? '高峰' : peakLabel.trim()
              const b = peakIdleLabel.trim() === '' ? '低谷' : peakIdleLabel.trim()
              setPeakLabel(a); setPeakIdleLabel(b)
              saveOptions({ ...optionsRef.current, peakLabel: a, peakIdleLabel: b })
              flashPeakSave()
            }
            const reset = () => {
              if (!Array.isArray(segments)) return
              host.call('reset-composition').then((result) => {
                if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
                if (typeof result.peakEnabled === 'boolean') { setPeakEnabled(result.peakEnabled); optionsRef.current.peakEnabled = result.peakEnabled }
                if (typeof result.peakRemind === 'boolean') { setPeakRemind(result.peakRemind); optionsRef.current.peakRemind = result.peakRemind }
                if (typeof result.peakTimezone === 'string') { setPeakTz(result.peakTimezone); optionsRef.current.peakTimezone = result.peakTimezone }
                if (Array.isArray(result.peakProviders)) { setPeakProvidersText(result.peakProviders.join(', ')); optionsRef.current.peakProviders = result.peakProviders }
                if (result.ratioOrder === 'in-read-write-out' || result.ratioOrder === 'in-out-read-write') { setRatioOrder(result.ratioOrder); optionsRef.current.ratioOrder = result.ratioOrder }
                if (typeof result.peakLabel === 'string' && result.peakLabel !== '') { setPeakLabel(result.peakLabel); optionsRef.current.peakLabel = result.peakLabel }
                if (typeof result.peakIdleLabel === 'string' && result.peakIdleLabel !== '') { setPeakIdleLabel(result.peakIdleLabel); optionsRef.current.peakIdleLabel = result.peakIdleLabel }
                if (typeof result.dskKey === 'string') { setDskKey(result.dskKey); optionsRef.current.dskKey = result.dskKey }
                if (typeof result.dskKeyAuto === 'boolean') setDskKeyAuto(result.dskKeyAuto)
                if (result.peakNow === 'peak' || result.peakNow === 'offpeak') setPeakNow(result.peakNow)
              }).catch(() => {})
            }
            const updatePrice = (model, patch) => {
              if (!Array.isArray(prices)) return
              const cur = prices.find((p) => p.model === model)
              const next = { model, currency: cur ? cur.currency : 'USD', in: cur ? cur.in : 0, cacheRead: cur ? cur.cacheRead : undefined, cacheWrite: cur ? cur.cacheWrite : undefined, out: cur ? cur.out : 0, builtin: cur ? cur.builtin : false, peak: cur && cur.peak ? cur.peak : undefined, lock: cur ? cur.lock === true : false, ...patch }
              setPrices(prices.map((p) => p.model === model ? next : p))
              host.call('set-price', { model, price: { currency: next.currency, in: next.in, cacheRead: next.cacheRead === undefined ? null : next.cacheRead, cacheWrite: next.cacheWrite === undefined ? null : next.cacheWrite, out: next.out, peak: next.peak === undefined ? undefined : next.peak, lock: next.lock === true } })
                .then((result) => { if (result.prices) setPrices(result.prices) })
                .catch((err) => console.error('dsh-bottom-bar: setPrice failed', err))
            }
            const removePrice = (model) => {
              host.call('remove-price', { model }).then((result) => { if (result.prices) setPrices(result.prices) }).catch((err) => console.error('dsh-bottom-bar: removePrice failed', err))
            }
            // ── 修订 174：详细编辑弹层(价格表行内只读 + [编辑] 进入) ──
            const [editKey, setEditKey] = React.useState(null)
            const [editDraft, setEditDraft] = React.useState(null)
            const [editPrevIn, setEditPrevIn] = React.useState(1)
            const [editLockRatio, setEditLockRatio] = React.useState(null)
            // 修订 182：峰谷自己的比例同步(↻ 按原比例 + 🔒 锁定,随 peak.locked 持久)
            const [editPrevPeakIn, setEditPrevPeakIn] = React.useState(0)
            const [editPeakLockRatio, setEditPeakLockRatio] = React.useState(null)
            // 修订 183：费率卡展示用 alt(官方双币价,只读)
            const [editAlt, setEditAlt] = React.useState(null)
            const [editPeakOpen, setEditPeakOpen] = React.useState(false)
            const openEdit = (model) => {
              const cur = Array.isArray(prices) ? prices.find((p) => p.model === model) : undefined
              if (cur === undefined) return
              setEditKey(model)
              setEditDraft({
                in: cur.in,
                cr: cur.cacheRead === null || cur.cacheRead === undefined ? null : cur.cacheRead,
                cw: cur.cacheWrite === null || cur.cacheWrite === undefined ? null : cur.cacheWrite,
                out: cur.out,
                cur: cur.currency || 'USD',
                lock: cur.lock === true,
                peak: cur.peak !== null && cur.peak !== undefined
                  ? { in: cur.peak.in, cr: cur.peak.cacheRead === null || cur.peak.cacheRead === undefined ? null : cur.peak.cacheRead, cw: cur.peak.cacheWrite === null || cur.peak.cacheWrite === undefined ? null : cur.peak.cacheWrite, out: cur.peak.out, locked: cur.peak.locked === true }
                  : null,
              })
              setEditPrevIn(cur.in)
              setEditLockRatio(cur.in > 0
                ? { cr: (cur.cacheRead || 0) / cur.in, cw: (cur.cacheWrite || 0) / cur.in, out: cur.out / cur.in }
                : null)
              setEditPrevPeakIn(cur.peak !== null && cur.peak !== undefined ? cur.peak.in : 0)
              setEditPeakLockRatio(cur.peak !== null && cur.peak !== undefined && cur.peak.in > 0
                ? { cr: (cur.peak.cacheRead || 0) / cur.peak.in, cw: (cur.peak.cacheWrite || 0) / cur.peak.in, out: cur.peak.out / cur.peak.in }
                : null)
              setEditAlt(cur.alt !== null && cur.alt !== undefined ? cur.alt : null)
              setEditPeakOpen(false)
            }
            const closeEdit = () => { setEditKey(null); setEditDraft(null) }
            const editSet = (k, v) => {
              if (editDraft === null) return
              if (k === 'cur') { setEditDraft({ ...editDraft, cur: v }); return }
              const blank = (k === 'cr' || k === 'cw' || (k.indexOf('pk.') === 0 && (k === 'pk.cr' || k === 'pk.cw'))) && (v === '' || v === undefined || v === null)
              if (blank) {
                if (k.indexOf('pk.') === 0) setEditDraft({ ...editDraft, peak: { ...(editDraft.peak || { in: 0, cr: null, cw: null, out: 0 }), [k.slice(3)]: null } })
                else setEditDraft({ ...editDraft, [k]: null })
                return
              }
              const n = Number(v)
              const val = Number.isFinite(n) ? n : editDraft[k]
              if (k === 'in') {
                let next = { ...editDraft, in: val }
                // 🔒 固定比例:输入一变,其余桶按锁定比例自动派生
                if (editDraft.lock && editLockRatio !== null) {
                  next.cr = editLockRatio.cr === null ? null : r4x(editLockRatio.cr * val)
                  next.cw = editLockRatio.cw === null ? null : r4x(editLockRatio.cw * val)
                  next.out = r4x(editLockRatio.out * val)
                }
                setEditDraft(next)
              } else if (k === 'cr' || k === 'cw' || k === 'out') {
                const next = { ...editDraft, [k]: val }
                if (editDraft.lock && editLockRatio !== null && editDraft.in > 0) setEditLockRatio({ ...editLockRatio, [k]: val / editDraft.in })
                setEditDraft(next)
              } else if (k.indexOf('pk.') === 0) {
                const f = k.slice(3)
                const pkBase = editDraft.peak !== null ? editDraft.peak : { in: 0, cr: null, cw: null, out: 0, locked: false }
                if (f === 'lock') {
                  const locked = !(pkBase.locked === true)
                  setEditDraft({ ...editDraft, peak: { ...pkBase, locked } })
                  if (locked && pkBase.in > 0) setEditPeakLockRatio({ cr: (pkBase.cr || 0) / pkBase.in, cw: (pkBase.cw || 0) / pkBase.in, out: pkBase.out / pkBase.in })
                  return
                }
                const nextPk = { ...pkBase, [f]: val }
                // 峰谷锁定:高峰输入一变,其余高峰桶按锁定比例自动派生
                if (f === 'in' && nextPk.locked === true && editPeakLockRatio !== null) {
                  nextPk.cr = editPeakLockRatio.cr === null ? null : r4x(editPeakLockRatio.cr * val)
                  nextPk.cw = editPeakLockRatio.cw === null ? null : r4x(editPeakLockRatio.cw * val)
                  nextPk.out = r4x(editPeakLockRatio.out * val)
                } else if ((f === 'cr' || f === 'cw' || f === 'out') && nextPk.locked === true && editPeakLockRatio !== null && pkBase.in > 0) {
                  setEditPeakLockRatio({ ...editPeakLockRatio, [f]: val / pkBase.in })
                }
                setEditDraft({ ...editDraft, peak: nextPk })
              }
            }
            const editScale = () => {
              if (editDraft === null || editPrevIn === 0) return
              const kk = editDraft.in / editPrevIn
              setEditDraft({
                ...editDraft,
                cr: editDraft.cr === null ? null : r4x(editDraft.cr * kk),
                cw: editDraft.cw === null ? null : r4x(editDraft.cw * kk),
                out: r4x(editDraft.out * kk),
              })
              setEditPrevIn(editDraft.in)
            }
            const editToggleLock = () => {
              if (editDraft === null) return
              const lock = !editDraft.lock
              setEditDraft({ ...editDraft, lock })
              if (lock && editDraft.in > 0) setEditLockRatio({ cr: (editDraft.cr || 0) / editDraft.in, cw: (editDraft.cw || 0) / editDraft.in, out: editDraft.out / editDraft.in })
            }
            const editPeakClear = () => setEditDraft({ ...editDraft, peak: null })
            // 修订 182：峰谷 ↻ 按原比例同步(按弹层打开时的峰值比例缩放)
            const editPeakScale = () => {
              if (editDraft === null || editDraft.peak === null || editPrevPeakIn === 0) return
              const pk = editDraft.peak
              const kk = pk.in / editPrevPeakIn
              setEditDraft({ ...editDraft, peak: { ...pk, cr: pk.cr === null ? null : r4x(pk.cr * kk), cw: pk.cw === null ? null : r4x(pk.cw * kk), out: r4x(pk.out * kk) } })
              setEditPrevPeakIn(pk.in)
            }
            const editPeakLockToggle = () => editSet('pk.lock', true)
            const saveEdit = () => {
              if (editKey === null || editDraft === null) return
              updatePrice(editKey, {
                currency: editDraft.cur,
                in: editDraft.in,
                cacheRead: editDraft.cr,
                cacheWrite: editDraft.cw,
                out: editDraft.out,
                lock: editDraft.lock === true,
                peak: editDraft.peak === null
                  ? null
                  : { currency: editDraft.cur, in: editDraft.peak.in, cacheRead: editDraft.peak.cr, cacheWrite: editDraft.peak.cw, out: editDraft.peak.out, locked: editDraft.peak.locked === true },
              })
              closeEdit()
            }
            const editRemove = () => { if (editKey !== null) { removePrice(editKey); closeEdit() } }
            // 峰谷时区选项:跟随系统 + UTC 固定偏移
            const TZ_OPTIONS = ['system', 'UTC']
            for (let tzi = 1; tzi <= 12; tzi++) TZ_OPTIONS.push('UTC+' + tzi)
            for (let tzi = 1; tzi <= 12; tzi++) TZ_OPTIONS.push('UTC-' + tzi)
// 1.1.1 拆出:VENDOR_TEMPLATES/RATIO_ORDERS/ratioOrderObj/ratioCellsOf/LEGACY_TPLS → lib/client-data.cjs

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
              let tplName = ''
              if (!tpl || tpl.id === 'auto') {
                const m = newModel.toLowerCase()
                if (m.includes('claude') || m.includes('anthropic')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'claude')
                else if (m.includes('grok')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'grok')
                else if (m.includes('gpt') || m.includes('openai') || m.includes('o1') || m.includes('o3') || m.includes('o4')) {
                  // GPT-5.x 用 2026 模板;4o/o 系列旧模型用兼容比例
                  tpl = m.includes('gpt-5') ? VENDOR_TEMPLATES.find((t) => t.id === 'openai-gpt5') : LEGACY_TPLS.openaiClassic
                } else if (m.includes('gemini') || m.includes('google')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'gemini')
                else if (m.includes('kimi') || m.includes('moonshot')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'kimi')
                else if (m.includes('deepseek')) {
                  tpl = (m.includes('v4') || m.includes('flash')) ? VENDOR_TEMPLATES.find((t) => t.id === 'deepseek-v4') : LEGACY_TPLS.deepseekV3
                } else if (m.includes('glm')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'glm')
                else if (m.includes('minimax')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'minimax')
                else if (m.includes('doubao') || m.includes('seed')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'doubao')
                else if (m.includes('qwen')) {
                  tpl = (m.includes('qwen3-5') || m.includes('qwen3.5')) ? VENDOR_TEMPLATES.find((t) => t.id === 'qwen35') : LEGACY_TPLS.qwenClassic
                } else {
                  tpl = LEGACY_TPLS.generic
                  tplName = '通用比例（未识别厂商）'
                }
              }
              const curr = (newCurr === 'CNY' || newCurr === 'USD') ? newCurr : (tpl.currency || 'CNY')
              return {
                currency: curr,
                in: inPrice,
                cacheRead: Math.round(inPrice * tpl.read * 1000) / 1000,
                cacheWrite: Math.round(inPrice * tpl.write * 1000) / 1000,
                out: Math.round(inPrice * tpl.out * 1000) / 1000,
                // 修订 142：LEGACY_TPLS 无 name → 显示兼容比例标签(原来 undefined)
                tplName: tplName !== '' ? tplName : (tpl.name !== undefined ? tpl.name : '兼容比例(旧系列)'),
              }
            }

            const addPrice = () => {
              const id = newModel.trim()
              if (id === '') return
              const computed = computePreviewPrice()
              // 修订 119：高峰输入价(可选)——填了就给该价配峰谷双价,其余桶按比例派生
              const peakInVal = Number(newInPeak)
              const hasPeak = newInPeak.trim() !== '' && Number.isFinite(peakInVal) && peakInVal >= 0
              const tplRatio = computed.out !== 0 && computed.in !== 0 ? computed.out / computed.in : 3
              const peak = hasPeak
                ? {
                    currency: computed.currency,
                    in: peakInVal,
                    cacheRead: computed.cacheRead !== undefined ? Math.round(peakInVal * (computed.cacheRead / computed.in) * 1000) / 1000 : null,
                    cacheWrite: computed.cacheWrite !== undefined ? Math.round(peakInVal * (computed.cacheWrite / computed.in) * 1000) / 1000 : null,
                    out: Math.round(peakInVal * tplRatio * 1000) / 1000,
                  }
                : undefined
              // 修订 140：上下文长度分档(可选)——临界 + 超档输入价(缺省=主价×2),
              // 其余桶按主价比例派生;超档未给 peak 时自动继承主峰谷(计价时峰谷叠档)
              const ctxLimitVal = Number(newCtxLimit)
              const hasCtx = newCtxLimit.trim() !== '' && Number.isFinite(ctxLimitVal) && ctxLimitVal > 0
              const ctxInVal = newCtxIn.trim() !== '' && Number.isFinite(Number(newCtxIn)) && Number(newCtxIn) >= 0 ? Number(newCtxIn) : Math.round(computed.in * 2 * 1000) / 1000
              const ctxScales = hasCtx
                ? [{
                    limit: ctxLimitVal,
                    price: {
                      currency: computed.currency,
                      in: ctxInVal,
                      cacheRead: computed.cacheRead !== undefined ? Math.round(ctxInVal * (computed.cacheRead / computed.in) * 1000) / 1000 : null,
                      cacheWrite: computed.cacheWrite !== undefined ? Math.round(ctxInVal * (computed.cacheWrite / computed.in) * 1000) / 1000 : null,
                      out: Math.round(ctxInVal * tplRatio * 1000) / 1000,
                    },
                  }]
                : undefined
              setNewModel('')
              setNewIn('')
              setNewInPeak('')
              setNewCtxLimit('')
              setNewCtxIn('')
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
                  peak,
                  ctxScales,
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
            // 修订 106：导出费用统计为 PNG(canvas 手绘分享卡)
            const exportSummaryImage = () => {
              const all = fullAll
              if (!all || all.hasUsage !== true) return
              const isDark = document.body !== null && document.body.getAttribute('data-ds-dark-theme') !== null
              // 主题色(canvas 直接读 CSS 变量,跟随主题)
              const cssVar = (name, fb) => {
                try {
                  const v = window.getComputedStyle(document.body).getPropertyValue(name).trim()
                  return v !== '' ? v : fb
                } catch (e) { return fb }
              }
              const brand = cssVar('--dsw-alias-brand-primary', isDark ? '#f2b18c' : '#c15f3c')
              const textMain = isDark ? '#eaeae8' : '#22221f'
              const textSub = isDark ? '#9c9c9a' : '#7a7a77'
              const lineC = isDark ? '#343437' : '#e4e4e2'
              const cardBg = isDark ? '#242427' : '#f2f2f0'
              const green = '#10b981'
              const blue = '#4a90d9'
              // 圆角矩形
              const rr = (x, y, w, h, r, fill) => {
                ctx.beginPath()
                ctx.moveTo(x + r, y)
                ctx.arcTo(x + w, y, x + w, y + h, r)
                ctx.arcTo(x + w, y + h, x, y + h, r)
                ctx.arcTo(x, y + h, x, y, r)
                ctx.arcTo(x, y, x + w, y, r)
                ctx.closePath()
                ctx.fillStyle = fill
                ctx.fill()
              }
              const alpha = (hex, a) => {
                // 修订 117：兼容主题色为 rgb()/rgba() 形式(默认主题可能返回 rgba)
                const s = String(hex).trim()
                let rgb = null
                if (s.charAt(0) === '#') {
                  const n = parseInt(s.slice(1), 16)
                  if (!Number.isNaN(n)) rgb = [((n >> 16) & 255), ((n >> 8) & 255), (n & 255)]
                } else {
                  const m = /rgba?\(([^)]+)\)/.exec(s)
                  if (m !== null) {
                    const parts = m[1].split(',').map((x) => parseFloat(x))
                    if (parts.length >= 3 && parts.slice(0, 3).every((x) => !Number.isNaN(x))) rgb = parts.slice(0, 3)
                  }
                }
                return rgb === null ? 'rgba(128,128,128,' + a + ')' : 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'
              }
              const mono = '"SF Mono", Consolas, monospace'
              // 自适应字号:放得下就不缩,依次 17/14/12
              const fitFont = (text, maxW, base) => {
                let size = base
                ctx.font = '700 ' + size + 'px ' + mono
                while (size > 11 && ctx.measureText(text).width > maxW) {
                  size -= 1
                  ctx.font = '700 ' + size + 'px ' + mono
                }
                return size
              }
              const pad = 32
              const w = 720
              const bodyW = w - pad * 2
              const rows = all.rows.slice(0, 20)
              const cardH = 84
              const gap = 14
              const rowH = 40
              const listTop = pad + 46 + cardH + gap + 34
              const h = listTop + rows.length * rowH + 44 + 26
              const cv = document.createElement('canvas')
              cv.width = w
              cv.height = h
              const ctx = cv.getContext('2d')
              // 背景(暖灰底) + 主卡(圆角 + 细边框 = 卡片层次感)
              ctx.fillStyle = isDark ? '#131315' : '#efeeec'
              ctx.fillRect(0, 0, w, h)
              ctx.textBaseline = 'alphabetic'
              const cardX = 8
              const cardY = 8
              const cardW = w - 16
              const cardH2 = h - 16
              rr(cardX, cardY, cardW, cardH2, 20, isDark ? '#1b1b1e' : '#fdfdfb')
              ctx.strokeStyle = isDark ? '#2c2c30' : '#e8e6e4'
              ctx.lineWidth = 1
              ctx.beginPath()
              ctx.moveTo(cardX + 20, cardY)
              ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH2, 20)
              ctx.arcTo(cardX + cardW, cardY + cardH2, cardX, cardY + cardH2, 20)
              ctx.arcTo(cardX, cardY + cardH2, cardX, cardY, 20)
              ctx.arcTo(cardX, cardY, cardX + cardW, cardY, 20)
              ctx.closePath()
              ctx.stroke()
              // 品牌 logo 方块(30px,品牌色圆角方块 + 白色 D)
              const logoX = pad
              const logoY = 26
              rr(logoX, logoY, 30, 30, 9, brand)
              ctx.fillStyle = isDark ? '#19191c' : '#ffffff'
              ctx.font = '800 16px sans-serif'
              ctx.textAlign = 'center'
              ctx.fillText('D', logoX + 15, logoY + 21)
              ctx.textAlign = 'left'
              // 标题 + 日期
              ctx.fillStyle = brand
              ctx.font = '700 22px sans-serif'
              ctx.fillText('DSH 费用统计', logoX + 42, logoY + 21)
              ctx.fillStyle = textSub
              ctx.font = 'normal 11px sans-serif'
              ctx.textAlign = 'right'
              ctx.fillText(all.at ? new Date(all.at).toLocaleString() : '', w - pad, logoY + 19)
              ctx.textAlign = 'left'
              // 三个统计块(等宽数字 + 自适应字号)
              const blockW = (bodyW - gap * 2) / 3
              const blocks = [
                { label: '总 Tokens', value: formatTokens(all.totalTokens), fill: alpha(brand, 0.14), val: brand },
                { label: '预估费用', value: Object.keys(all.totals).map((k) => compactMoney(all.totals[k], k, 'full')).join(' + '), fill: alpha(blue, 0.14), val: blue },
                { label: '缓存命中率', value: all.hitRate === null ? '—' : all.hitRate + '%', fill: alpha(green, 0.14), val: green },
              ]
              blocks.forEach((b, i) => {
                const bx = pad + i * (blockW + gap)
                rr(bx, pad + 40, blockW, cardH, 14, b.fill)
                ctx.fillStyle = textSub
                ctx.font = '500 11px sans-serif'
                ctx.fillText(b.label, bx + 14, pad + 40 + 22)
                ctx.fillStyle = b.val
                const size = fitFont(b.value, blockW - 28, 17)
                ctx.fillText(b.value, bx + 14, pad + 40 + 52)
              })
              // 明细区标题
              ctx.fillStyle = textMain
              ctx.font = '600 13px sans-serif'
              ctx.fillText('分渠道明细', pad, listTop - 12)
              ctx.strokeStyle = lineC
              ctx.beginPath()
              ctx.moveTo(pad, listTop - 4)
              ctx.lineTo(w - pad, listTop - 4)
              ctx.stroke()
              // 明细行:来源色点 + 名称 / token / 费用 + 次行各桶消耗小字(修订 115)
              let y = listTop + 6
              for (const r of rows) {
                const dot = r.free ? green : (r.source === 'channel' ? brand : (r.source === 'global' ? blue : textSub))
                // 字母徽章(无 logo 的分享卡用:品牌色底 + 模型首字母)
                const letter = (r.model || r.key).charAt(0).toUpperCase() || '?'
                rr(pad + 1, y - 16, 16, 16, 4, dot)
                ctx.fillStyle = '#ffffff'
                ctx.font = '700 10px sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(letter, pad + 9, y - 5)
                ctx.textAlign = 'left'
                ctx.fillStyle = r.free ? green : textMain
                ctx.font = r.free ? '600 13px sans-serif' : '500 13px sans-serif'
                const name = r.key.length > 30 ? r.key.slice(0, 29) + '…' : r.key
                ctx.fillText(name, pad + 16, y)
                const costText = r.free ? ('免费省 ' + (r.refCost !== null && r.refCost !== undefined ? compactMoney(r.refCost, r.refCurrency, 'compact') : '')) : compactMoney(r.cost, r.currency, 'compact')
                ctx.textAlign = 'right'
                ctx.font = (r.free ? '600 ' : 'normal ') + '12px ' + mono
                ctx.fillStyle = r.free ? green : textMain
                ctx.fillText(costText, w - pad, y)
                ctx.fillStyle = textSub
                ctx.font = 'normal 11px ' + mono
                ctx.fillText(formatTokens(r.tokens) + ' tok', w - pad - 108, y)
                ctx.textAlign = 'left'
                // 次行:各桶消耗明细(仅非零桶)
                const buckets = []
                if (r.uncachedInput > 0) buckets.push('输入 ' + formatTokens(r.uncachedInput))
                if (r.cacheRead > 0) buckets.push('缓存读 ' + formatTokens(r.cacheRead))
                if (r.cacheWrite > 0) buckets.push('缓存写 ' + formatTokens(r.cacheWrite))
                if (r.output > 0) buckets.push('输出 ' + formatTokens(r.output))
                ctx.fillStyle = textSub
                ctx.font = 'normal 11px sans-serif'
                ctx.fillText(buckets.length > 0 ? buckets.join(' · ') : '', pad + 16, y + 15)
                y += rowH
              }
              // 免费横幅
              if (all.freeCount > 0) {
                const savedText = all.savedTotals !== null && all.savedTotals !== undefined && Object.keys(all.savedTotals).length > 0 ? '按官方价已省 ' + Object.keys(all.savedTotals).map((k) => compactMoney(all.savedTotals[k], k, 'full')).join(' ') : '按官方价计费为 0'
                rr(pad, y + 6, bodyW, 34, 12, alpha(green, 0.14))
                ctx.fillStyle = green
                ctx.font = '600 12px sans-serif'
                ctx.fillText('🎉 其中 ' + all.freeCount + ' 个免费渠道 · ' + savedText, pad + 14, y + 27)
                y += 40 + 12
              }
              // 页脚
              ctx.fillStyle = textSub
              ctx.font = 'normal 10px sans-serif'
              ctx.fillText('由 dsh-bottom-bar 生成 · 估算仅供参考,实际以账单为准', pad, h - 8)
              const a = document.createElement('a')
              a.download = 'dsh-cost-summary-' + Date.now() + '.png'
              a.href = cv.toDataURL('image/png')
              a.click()
            }
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
            const makeLineChildren = () => {
              const children = []
              let visibleCount = 0
              effectiveSegments.forEach((seg, i) => {
                const sampleDef = PREVIEW_TEXTS[seg.id]
                const sample = typeof sampleDef === 'string' ? sampleDef : (sampleDef ? sampleDef[mode] : '')
                if (!sample) return

                const isEnabled = seg.enabled === true
                const isGhost = !isEnabled && (hovered === seg.id)
                const isCurrentlyActive = isEnabled || isGhost

                if (i > 0) {
                  const sepActive = isCurrentlyActive && visibleCount > 0
                  children.push(React.createElement('span', {
                    className: 'dsh-stats-sep' + (sepActive ? ' dsh-sep-visible' : ' dsh-sep-collapsed'),
                    'aria-hidden': true,
                    key: 'ps_sep_' + seg.id,
                  }, '|'))
                }

                if (isCurrentlyActive) {
                  visibleCount++
                }

                let segClass = 'dsh-preview-seg'
                if (isEnabled) {
                  segClass += ' dsh-seg-visible' + (hovered === seg.id ? ' dsh-preview-hl' : '')
                } else if (isGhost) {
                  segClass += ' dsh-seg-visible dsh-preview-ghost'
                } else {
                  segClass += ' dsh-seg-collapsed'
                }

                children.push(React.createElement('span', {
                  className: segClass,
                  key: 'ps_seg_' + seg.id,
                  ref: (el) => { if (el) previewSegRefs.current[seg.id] = el },
                  title: (SEGMENT_LABELS[seg.id] || seg.id) + (!isEnabled ? '（未启用 · 悬停动态插入预览效果）' : ' · 悬停联动下方条目'),
                  onMouseEnter: () => handleHover(seg.id),
                  onMouseLeave: handleUnhover,
                }, sample + (!isEnabled ? ' ✦' : '')))
              })
              return children
            }
            // 修订 68：修复设置区块渲染崩溃——新版预览改用 makeLineChildren 后遗漏
            // 的两处 previewSegs 引用（未定义 → ReferenceError → settings.section 槽
            // 错误边界接管整个设置页）。等价推导：已启用分段的预览文本（旧语义）。
            const previewDockTitle = effectiveSegments
              .filter((s) => s.enabled === true)
              .map((s) => { const d = PREVIEW_TEXTS[s.id]; const t = typeof d === 'string' ? d : (d ? d[mode] : ''); return t })
              .filter(Boolean)
              .join(' | ')
            const hasPreviewSegs = previewDockTitle !== ''
            const priceCell = (key, inputEl, ratioText, base) => React.createElement('span', { key, className: 'dsh-price-cell' },
              inputEl,
              React.createElement('span', { className: 'dsh-price-cell-ratio' + (base ? ' base' : '') }, ratioText === null || ratioText === undefined ? '' : ratioText),
            )
            // 修订 174：价格表行 = 只读摘要 + [编辑] 进弹层(行内不再放输入框)
            const priceRowEl = (p) => {
              const txtCell = (key, v, base) => React.createElement('span', { key, className: 'dsh-price-cell dsh-price-cell-ro' },
                React.createElement('span', { className: 'dsh-price-cell-txt' }, v === null || v === undefined ? '—' : String(v)),
                React.createElement('span', { className: 'dsh-price-cell-ratio' + (base ? ' base' : '') }, base ? '1x' : (cellRatio(p.in, v) || '')),
              )
              return React.createElement(React.Fragment, { key: p.model },
                React.createElement('div', { className: 'dsh-price-row' },
                  React.createElement('span', { className: 'dsh-price-model', title: p.model }, p.model,
                    p.hasPeak === true ? React.createElement('span', { style: { marginLeft: 4, fontSize: 11, fontWeight: 700, color: 'var(--dsw-alias-brand-primary)' }, title: '已设峰谷双价' }, '⛰') : null,
                    p.lock === true ? React.createElement('span', { className: 'dsh-price-locktag', title: '已开启固定比例' }, '🔒') : null,
                    p.hasScales === true ? React.createElement('span', { style: { marginLeft: 4, fontSize: 11, fontWeight: 700, color: 'var(--dsw-alias-brand-primary)' }, title: '已设上下文长度分档' }, '档') : null,
                  ),
                  React.createElement('span', { className: 'dsh-price-curtext', title: p.currency }, (p.currency === 'CNY' ? '🇨🇳 ' : p.currency === 'USD' ? '🇺🇸 ' : '') + p.currency),
                  txtCell('t-in', p.in, true),
                  txtCell('t-cr', p.cacheRead, false),
                  txtCell('t-cw', p.cacheWrite, false),
                  txtCell('t-co', p.out, false),
                  React.createElement('button', { className: 'dsh-comp-btn', style: { width: 44, padding: '3px 4px', boxSizing: 'border-box', flex: 'none' }, title: '详细编辑(弹层)', onClick: () => openEdit(p.model) }, '编辑'),
                ),
              )
            }
            // 修订 101：价格表分组——「我的价格」(配置过/自定义)默认展开,「内置默认」默认折叠
            const priceList = Array.isArray(prices) ? prices : []
            const userPriceRows = priceList.filter((p) => p.configured === true || p.builtin !== true).map(priceRowEl)
            const builtinPriceRows = priceList.filter((p) => !(p.configured === true || p.builtin !== true)).map(priceRowEl)
            // 修订 103：渠道分层——渠道特选(键含 '/')与全局默认(纯模型名)分开展示
            const channelRows = priceList.filter((p) => (p.configured === true || p.builtin !== true) && p.model.indexOf('/') !== -1)
                        const globalRows = priceList.filter((p) => (p.configured === true || p.builtin !== true) && p.model.indexOf('/') === -1)
            // 修订 178：分组表头——数字列居中,列宽与行内一致(币种66/四桶68)
            const priceHeadEl = React.createElement('div', { className: 'dsh-price-head' },
              React.createElement('span', { className: 'dsh-price-model' }, '模型'),
              React.createElement('span', { style: { width: 56, textAlign: 'center' } }, '币种'),
              React.createElement('span', { style: { width: 54, textAlign: 'center' } }, '输入'),
              React.createElement('span', { style: { width: 54, textAlign: 'center' } }, '缓存读'),
              React.createElement('span', { style: { width: 54, textAlign: 'center' } }, '缓存写'),
              React.createElement('span', { style: { width: 54, textAlign: 'center' } }, '输出'),
              React.createElement('span', { style: { width: 44 } }, ''),
            )
            // 用过的模型:账本汇总,未配置的一键按官方价配置(渠道特选,用完整 渠道/模型 键)
            const configuredKeys = new Set(priceList.filter((p) => p.configured === true).map((p) => p.model))
            const usedUnconfigured = Array.isArray(usedModels) ? usedModels.filter((u) => !configuredKeys.has(u.key)) : []
            const configureUsed = (key) => {
              host.call('set-price', { model: key, price: {} }).then((result) => { if (result.prices) setPrices(result.prices) }).catch((err) => console.error('dsh-bottom-bar: configure-used failed', err))
            }
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
                  onMouseEnter: () => handleHover(seg.id),
                  onMouseLeave: handleUnhover,
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
            // 修订 157：设置页顶部快捷导航——点一下平滑滚到对应区块
            const jumpTo = (id) => {
              const el = document.getElementById(id)
              if (el && typeof el.scrollIntoView === 'function') {
                try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch (e) { el.scrollIntoView() }
              }
            }
            const SEC_NAV = [['dsh-sec-seglist', '分段'], ['dsh-sec-options', '其他设置'], ['dsh-sec-price', '价格'], ['dsh-sec-stats', '统计'], ['dsh-sec-diag', '诊断']]
            return React.createElement('div', { className: 'dsh-comp-page', onDragOver: (e) => e.preventDefault() },
              offline && React.createElement('div', { className: 'dsh-comp-warn' }, '配置服务未响应——当前为离线预览（默认配置），改动暂不可用；服务恢复后自动同步。'),
              React.createElement('p', { className: 'dsh-comp-desc' }, '配置输入框下方的底栏统计行：先看预览与拖拽排序；下方是其他开关、价格表与统计。按住 Ctrl 点击可多选批量拖拽排序。'),
              React.createElement('div', { className: 'dsh-secnav' },
                SEC_NAV.map((s) => React.createElement('button', { key: s[0], className: 'dsh-secnav-btn', onClick: () => jumpTo(s[0]) }, s[1])),
              ),
              React.createElement('div', { id: 'dsh-sec-seglist', className: 'dsh-preview' },
                React.createElement('div', { className: 'dsh-preview-header' },
                  React.createElement('span', { className: 'dsh-preview-label' }, '底栏效果预览'),
                  React.createElement('span', { className: 'dsh-preview-hint' }, '可横向滑动 · 支持多选批量拖拽'),
                ),
                !hasPreviewSegs
                  ? React.createElement('span', { className: 'dsh-preview-empty' }, '（所有分段均已隐藏）')
                  : React.createElement('div', {
                      className: 'dsh-preview-dock',
                      ref: previewDockRef,
                      title: previewDockTitle,
                      onWheel: (e) => {
                        if (previewDockRef.current && e.deltaY) {
                          previewDockRef.current.scrollLeft += e.deltaY * 0.8
                        }
                      },
                    },
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
              // 修订 138：设置页重排——段列表/预览移到顶部,开关集中到「其他设置」
              React.createElement('div', { id: 'dsh-sec-options', className: 'dsh-price-group', key: 'g-settings' }, '其他设置'),
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
              React.createElement('div', { className: 'dsh-comp-row' + (peakEnabled ? ' dsh-on' : ' dsh-off') },
                React.createElement('span', { className: 'dsh-comp-label' }, '峰谷计价（按高峰价计费）' + (peakNow !== null ? (peakNow === 'peak' ? ' · 当前' + peakLabel : ' · 当前' + peakIdleLabel) : '') + (peakTz === 'system' ? '' : '（' + peakTz + '）')),
                React.createElement('label', { className: 'dsh-switch' },
                  React.createElement('input', { type: 'checkbox', checked: peakEnabled, disabled: offline, onChange: togglePeak }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
                React.createElement('select', { className: 'dsh-comp-select', value: peakTz, disabled: offline, onChange: (e) => togglePeakTz(e.target.value) }, TZ_OPTIONS.map((z) => React.createElement('option', { value: z, key: z }, z === 'system' ? '跟随系统' : z))),
              ),
              React.createElement('div', { className: 'dsh-comp-row' + (peakRemind ? ' dsh-on' : ' dsh-off') },
                React.createElement('span', { className: 'dsh-comp-label' }, '峰谷提醒（仅显示时段，不改价格）'),
                React.createElement('label', { className: 'dsh-switch' },
                  React.createElement('input', { type: 'checkbox', checked: peakRemind, disabled: offline, onChange: togglePeakRemind }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
              ),
              // 修订 161/163：峰谷提示语折叠为一行——药丸显示当前高/低语,chevron ▸
              // 旋转动画,展开区 0fr→1fr 手风琴展开 + 淡入
              React.createElement('div', { className: 'dsh-comp-row', style: { cursor: 'pointer' }, 'aria-expanded': peakLblOpen, onClick: () => setPeakLblOpen(!peakLblOpen) },
                React.createElement('span', { className: 'dsh-comp-label' }, '峰谷提示语'),
                React.createElement('span', { className: 'dsh-peak-lbl-pill' }, peakLabel + ' / ' + peakIdleLabel),
                React.createElement('span', { style: { marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 } },
                  React.createElement('span', { className: 'dsh-peak-lbl-chev' + (peakLblOpen ? ' open' : '') }, '▸'),
                  React.createElement('span', { className: 'dsh-comp-label', style: { fontSize: 11 } }, peakLblOpen ? '收起' : '展开'),
                ),
              ),
              React.createElement('div', { className: 'dsh-peak-lbl-wrap' + (peakLblOpen ? ' open' : '') },
                React.createElement('div', { className: 'dsh-peak-lbl-inner' },
                  React.createElement('div', { className: 'dsh-peak-lbl-open' },
                    // 修订 162：展开区压成一行(可换行)——去掉子标签,控件全并排
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                      React.createElement('input', { type: 'text', className: 'dsh-comp-input', style: { width: 68, boxSizing: 'border-box', flex: 'none' }, maxLength: 6, value: peakLabel, disabled: offline, onChange: (e) => setPeakLabel(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') savePeakLabels() }, placeholder: '高峰' }),
                      React.createElement('input', { type: 'text', className: 'dsh-comp-input', style: { width: 68, boxSizing: 'border-box', flex: 'none' }, maxLength: 6, value: peakIdleLabel, disabled: offline, onChange: (e) => setPeakIdleLabel(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') savePeakLabels() }, placeholder: '低谷' }),
                      React.createElement('button', { className: 'dsh-comp-btn', style: { flex: 'none' }, title: '保存提示语', onClick: savePeakLabels }, peakSavedFlash ? '✓ 已保存' : '保存'),
                      React.createElement('button', { className: 'dsh-secnav-btn', style: { flex: 'none' }, title: 'DeepSeek 创始人梗:峰=高峰,谷=低谷', onClick: () => { setPeakLabel('梁文峰'); setPeakIdleLabel('梁文谷'); saveOptions({ ...optionsRef.current, peakLabel: '梁文峰', peakIdleLabel: '梁文谷' }); flashPeakSave() } }, '🎩 梁文峰/梁文谷'),
                      React.createElement('button', { className: 'dsh-secnav-btn', style: { flex: 'none' }, onClick: () => { setPeakLabel('高峰'); setPeakIdleLabel('低谷'); saveOptions({ ...optionsRef.current, peakLabel: '高峰', peakIdleLabel: '低谷' }); flashPeakSave() } }, '默认 高峰/低谷'),
                    ),
                  ),
                ),
              ),
              // 修订 108：峰谷适用渠道白名单(opencode 2026 也实施峰谷,可自行添加渠道)
              React.createElement('div', { className: 'dsh-comp-row' },
                React.createElement('span', { className: 'dsh-comp-label' }, '峰谷适用渠道（逗号分隔）'),
                React.createElement('input', { type: 'text', className: 'dsh-comp-input', style: { flex: 1, minWidth: 0 }, value: peakProvidersText, disabled: offline, onChange: (e) => setPeakProvidersText(e.target.value), onBlur: savePeakProviders, placeholder: 'deepseek, opencode, opencode-go' }),
              ),
              // 修订 187/188：两行合并进同一「DeepSeek 面板」(无间隔两行:配置 + 余额)
              React.createElement('div', { className: 'dsh-dsk-panel' },
                React.createElement('div', { className: 'dsh-dsk-line' },
                  React.createElement('span', { className: 'dsh-comp-label', style: { minWidth: 92 } }, 'DeepSeek 配置'),
                  dskManualOpen || (dskKey.trim() === '' && dskKeyAuto !== true)
                    ? React.createElement('input', { type: 'password', className: 'dsh-comp-input', style: { flex: 1, minWidth: 0 }, value: dskKey, disabled: offline, onChange: (e) => setDskKey(e.target.value), onBlur: () => saveOptions({ ...optionsRef.current, dskKey: dskKey.trim() }), placeholder: 'sk-…(手动 Key,失焦保存)' })
                    : React.createElement('span', { style: { flex: 1, minWidth: 0, fontSize: 12, color: dskKeyAuto === true && dskKey.trim() === '' ? '#10b981' : 'var(--dsw-alias-label-primary)' } },
                        dskKeyAuto === true && dskKey.trim() === '' ? '✅ 自动读取 DSH 官方 Key(credentials.yaml)' : (dskKey.trim() !== '' ? '手动 Key 已配置(自动优先被覆盖)' : '未配置')),
                  React.createElement('button', { className: 'dsh-comp-btn', style: { flex: 'none' }, title: '手动 Key 优先于自动读取', onClick: () => setDskManualOpen(!dskManualOpen) }, dskManualOpen ? '✅ 自动' : '✏️ 手动 Key'),
                ),
                React.createElement('div', { className: 'dsh-dsk-line' },
                  React.createElement('span', { className: 'dsh-comp-label', style: { minWidth: 92 } }, 'DeepSeek 余额'),
                  React.createElement('span', { className: 'dsh-dsk-balance' + (dskStatus.cls !== '' ? ' ' + dskStatus.cls : ''), title: dskBalance !== null && dskBalance !== undefined && dskBalance.status === 'error' ? (dskBalance.error || '') : '' }, dskBalanceText),
                  dskStatus.label !== '' && React.createElement('span', { className: 'dsh-dsk-status ' + dskStatus.cls }, dskStatus.label),
                  React.createElement('button', { className: 'dsh-comp-btn', style: { flex: 'none' }, disabled: offline || !dskArmed, onClick: refreshBalance }, '刷新'),
                ),
              ),
              React.createElement('p', { className: 'dsh-comp-desc' }, 'DeepSeek 自 2026-08-17 00:00 起实行峰谷定价：高峰时段 9:00-12:00 / 14:00-18:00（按所选时区，默认跟随系统），空闲时段为高峰一半。opencode 官方同样实施该峰谷时段（UTC 01:00-04:00 / 06:00-10:00）。「计价」按高峰价算钱，仅对上方「适用渠道」生效（默认官方 deepseek + opencode 系）；「提醒」只显示 ⏱ 高峰/空闲 与时段标注，不影响价格。'),
              React.createElement('button', { className: 'dsh-comp-btn dsh-comp-reset', onClick: reset, disabled: offline }, '恢复默认（段/模式/黑条/精度）'),
              // 修订 164：价格区三 tab 升级「大 tab」外观——下划线高亮 + 底边线承接,
              // 层级:tab 栏(一级)→ 各 tab 内容(二级)
              React.createElement('div', { id: 'dsh-sec-price', className: 'dsh-bigtabs', key: 'ptab', style: { marginTop: 10 } },
                React.createElement('button', { className: 'dsh-bigtab' + (priceTab === 'table' ? ' on' : ''), onClick: () => { setPriceTab('table'); setAddPending(false) } }, '价格表'),
                React.createElement('button', { className: 'dsh-bigtab' + (priceTab === 'add' ? ' on' : ''), onClick: () => { setPriceTab('add'); setAddPending(false) } }, '新增价格'),
                React.createElement('button', { className: 'dsh-bigtab' + (priceTab === 'vendor' ? ' on' : ''), onClick: () => { setPriceTab('vendor'); setAddPending(false) } }, '厂商'),
              ),
              priceTab === 'table' && React.createElement('div', { className: 'dsh-prices' },
                React.createElement('span', { className: 'dsh-price-label' }, '价格表（每 1M tokens）：这里只列出你配置过的价格；内置默认价格默认收起，需要时展开。没单独配置的渠道/模型会自动按内置价估算。'),
                userPriceRows.length === 0 && builtinPriceRows.length === 0 && React.createElement('div', { className: 'dsh-price-empty' }, '还没有配置任何价格 —— 在下方「添加/更新价格」里录入你的模型'),
                // 修订 178：分组 = 标题 → 表头 → 条目(标题不再卡在表头与条目中间);
                // 表头数字列居中,与行内数字列对齐
                channelRows.length > 0 && React.createElement(React.Fragment, { key: 'g-channel' },
                  React.createElement('div', { className: 'dsh-price-group' }, '渠道特选（只覆盖这个渠道）'),
                  priceHeadEl,
                  channelRows.map(priceRowEl),
                ),
                globalRows.length > 0 && React.createElement(React.Fragment, { key: 'g-global' },
                  React.createElement('div', { className: 'dsh-price-group' }, '全局默认（所有渠道通用）'),
                  priceHeadEl,
                  globalRows.map(priceRowEl),
                ),
                usedUnconfigured.length > 0 && React.createElement('div', { className: 'dsh-price-group', key: 'g-used' }, '用过的模型 · 未配置价格'),
                usedUnconfigured.map((u) => React.createElement('div', { className: 'dsh-price-row', key: 'u' + u.key },
                  React.createElement('span', { className: 'dsh-price-model', title: u.key }, u.key),
                  React.createElement('span', { style: { flex: 'none', fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' } }, formatTokens(u.tokens) + ' tok'),
                  React.createElement('button', { className: 'dsh-comp-btn', style: { flex: 'none' }, title: '按官方价一键配置该渠道价格', onClick: () => configureUsed(u.key) }, '按官方价配置'),
                )),
                builtinPriceRows.length > 0 && React.createElement('button', { className: 'dsh-price-toggle', onClick: () => setBuiltinOpen(!builtinOpen) },
                  React.createElement('span', null, '内置默认价格'),
                  React.createElement('span', null, builtinPriceRows.length + ' 个' + (builtinOpen ? ' ▾' : ' ▸')),
                ),
                builtinOpen && builtinPriceRows,
              ),
              // 修订 139：新增价格 tab——模板卡(自动匹配厂商 + 比例预览 + 主题色流光确认)
              priceTab === 'add' && (() => {
                const preview = computePreviewPrice()
                const sym = preview.currency === 'USD' ? '$' : '¥'
                // 修订 149：渠道标注——有前缀=渠道特选,无=全局默认
                const chanSlash = newModel.indexOf('/')
                const chanLabel = chanSlash > 0 ? '渠道 ' + newModel.slice(0, chanSlash) : '全局默认'
                // 修订 154：渠道 id / 模型 id 拆双输入框(合并存 newModel)
                const chanPart = chanSlash > 0 ? newModel.slice(0, chanSlash) : ''
                const modelPart = chanSlash > 0 ? newModel.slice(chanSlash + 1) : newModel
                // 修订 150：币种滑槽有效值 + 已配置覆盖提醒
                const effCurr = (newCurr === 'CNY' || newCurr === 'USD') ? newCurr : preview.currency
                const existsPrice = newModel.trim() !== '' && Array.isArray(prices) && prices.some((p) => p !== null && p !== undefined && typeof p.model === 'string' && p.model === newModel.trim())
                // 修订 152：usedModelsOf 返回对象数组({key,...})非字符串,indexOf
                // 会炸——统一取 key;prices 行防御取 model(供以下联想池用)
                const chanKeyOf = (v) => typeof v === 'string' ? v : (v !== null && v !== undefined && typeof v.key === 'string' ? v.key : (typeof v.model === 'string' ? v.model : ''))
                // 修订 153/155：输入法式联想——渠道框联想「你见过的渠道」(用过模型键/
                // 已配价格键里的渠道段);模型框联想:渠道已填→只看该渠道下见过的
                // 模型(显示模型段),渠道空→全部渠道/模型键 + 厂商前缀/推荐版本
                const chanSet = new Set()
                const chanPush = (k) => { const i = k.indexOf('/'); if (i > 0) chanSet.add(k.slice(0, i)) }
                if (Array.isArray(usedModels)) for (const u of usedModels) chanPush(chanKeyOf(u))
                if (Array.isArray(prices)) for (const p of prices) chanPush(chanKeyOf(p))
                const chanRows = Array.from(chanSet).sort().filter((c) => c.toLowerCase().includes(chanPart.toLowerCase())).slice(0, 8)
                const mql = modelPart.trim().toLowerCase()
                const sugg = []
                const seenM = new Set()
                const pushM = (s) => { if (!seenM.has(s) && s.toLowerCase().includes(mql)) { seenM.add(s); sugg.push(s) } }
                if (chanPart !== '') {
                  const pre = chanPart + '/'
                  const underChan = (k) => { if (k.startsWith(pre)) { const rest = k.slice(pre.length); if (rest !== '' && rest.toLowerCase().includes(mql)) pushM(rest) } }
                  if (Array.isArray(usedModels)) for (const u of usedModels) underChan(chanKeyOf(u))
                  if (Array.isArray(prices)) for (const p of prices) underChan(chanKeyOf(p))
                } else {
                  if (Array.isArray(usedModels)) for (const u of usedModels) pushM(chanKeyOf(u))
                  if (Array.isArray(prices)) for (const p of prices) pushM(chanKeyOf(p))
                }
                for (const t of VENDOR_TEMPLATES) {
                  if (t.id === 'auto' || t.id === 'custom' || t.prefix === undefined) continue
                  if ((t.nick || t.name).toLowerCase().includes(mql) || t.prefix.toLowerCase().includes(mql)) {
                    pushM(t.prefix)
                    for (const vv of (t.versions || [])) pushM(t.prefix + vv)
                  }
                }
                const suggRows = sugg.slice(0, 9)
                return React.createElement('div', { className: 'dsh-price-template-card' + (addPending ? ' dsh-confirm-pending' : ''), onInput: () => { if (addPending) setAddPending(false) } },
                  React.createElement('p', { className: 'dsh-comp-desc' }, '填模型 id 与输入价 → 自动匹配厂商并按官方比例推算 → 确认后加入价格表。只填模型名即可（如 deepseek-v4-flash）= 全局默认价；带渠道前缀则配该渠道特选价（如 opencode-go/deepseek-v4-flash）。'),
                  // 修订 154/155：渠道 id / 模型 id 拆两个输入框(合并存 newModel);
                  // 两个框都有联想:渠道框出见过的渠道,模型框出该渠道下的模型
                  // (渠道空则全量)+ 厂商前缀/推荐版本,回车或点选上屏。
                  // 修订 156：一行五个控件会把人顶出可视区——重排:渠道+模型+
                  // 币种一行,空闲/高峰输入价一行
                  React.createElement('div', { className: 'dsh-price-add' },
                    React.createElement('div', { style: { position: 'relative', flex: 1, display: 'flex' } },
                      React.createElement('input', {
                        className: 'dsh-comp-input',
                        type: 'text',
                        style: { flex: 1, minWidth: 0 },
                        placeholder: '渠道(可选,如 opencode-go)',
                        title: '留空 = 全局默认价;填写 = 该渠道特选价',
                        value: chanPart,
                        onChange: (e) => { const v = e.target.value; setNewModel((v.trim() !== '' ? v + '/' : '') + modelPart); setSuggFor('chan') },
                        onFocus: () => setSuggFor('chan'),
                        onBlur: () => setSuggFor(''),
                        onKeyDown: (e) => { if (e.key === 'Enter' && suggFor === 'chan' && chanRows.length > 0) { e.preventDefault(); setNewModel(chanRows[0] + '/' + modelPart); setSuggFor('') } },
                      }),
                      suggFor === 'chan' && chanRows.length > 0 && React.createElement('div', { className: 'dsh-sugg' },
                        chanRows.map((c) => React.createElement('button', { key: c, className: 'dsh-sugg-row', onMouseDown: (e) => { e.preventDefault(); setNewModel(c + '/' + modelPart); setSuggFor('') } }, c)),
                      ),
                    ),
                    React.createElement('div', { style: { position: 'relative', flex: 1.6, display: 'flex' } },
                      React.createElement('input', {
                        className: 'dsh-comp-input',
                        type: 'text',
                        style: { flex: 1, minWidth: 0 },
                        placeholder: '模型 id，如 deepseek-v4-flash',
                        value: modelPart,
                        onChange: (e) => { setNewModel((chanPart !== '' ? chanPart + '/' : '') + e.target.value); setSuggFor('model') },
                        onFocus: () => setSuggFor('model'),
                        onBlur: () => setSuggFor(''),
                        onKeyDown: (e) => { if (e.key === 'Enter' && suggFor === 'model' && suggRows.length > 0) { e.preventDefault(); setNewModel(suggRows[0]); setSuggFor('model') } },
                      }),
                      suggFor === 'model' && suggRows.length > 0 && React.createElement('div', { className: 'dsh-sugg' },
                        suggRows.map((s) => React.createElement('button', { key: s, className: 'dsh-sugg-row', onMouseDown: (e) => { e.preventDefault(); setNewModel(s); setSuggFor('model') } }, s)),
                      ),
                    ),
                    // 修订 150：币种滑槽(CNY/USD,空=跟模板)
                    React.createElement('span', { className: 'dsh-curseg', title: '币种（默认跟厂商模板）' },
                      ['CNY', 'USD'].map((c) => React.createElement('button', { key: c, className: 'dsh-curseg-btn' + (effCurr === c ? ' on' : ''), onClick: () => { setNewCurr(c); setAddPending(false) } }, (c === 'CNY' ? '🇨🇳 ' : '🇺🇸 ') + c)),
                    ),
                  ),
                  // 修订 156：空闲/高峰输入价一行(币种滑槽挪上一行后不再拥挤)
                  React.createElement('div', { className: 'dsh-price-add', style: { borderTop: 'none', marginTop: 0, paddingTop: 0 } },
                    React.createElement('input', { className: 'dsh-comp-input', type: 'number', step: '0.01', style: { flex: 1 }, placeholder: '空闲输入价 (' + preview.currency + ')', value: newIn, onChange: (e) => setNewIn(e.target.value) }),
                    React.createElement('input', { className: 'dsh-comp-input', type: 'number', step: '0.01', style: { flex: 1 }, placeholder: '高峰输入价（可选）', value: newInPeak, onChange: (e) => setNewInPeak(e.target.value) }),
                    React.createElement('span', { style: { flex: 1, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' } }, '其余桶按厂商比例自动派生高峰价'),
                  ),
                  React.createElement('div', { className: 'dsh-price-add', style: { borderTop: 'none', marginTop: 0, paddingTop: 0 } },
                    React.createElement('input', { className: 'dsh-comp-input', type: 'number', step: '1', style: { flex: 1 }, placeholder: '临界上下文(可选,如 272000)', value: newCtxLimit, onChange: (e) => setNewCtxLimit(e.target.value) }),
                    React.createElement('input', { className: 'dsh-comp-input', type: 'number', step: '0.01', style: { flex: 1 }, placeholder: '超档输入价(可选,缺省=主价×2)', value: newCtxIn, onChange: (e) => setNewCtxIn(e.target.value) }),
                    React.createElement('span', { style: { flex: 1.4, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' } }, '超过临界上下文用超档价,其余桶按比例派生'),
                  ),
                  React.createElement('div', { className: 'dsh-price-actions' },
                    // 修订 139：确认流——第一次点进入「待确认」(边缘流光),再点提交;[取消]退出
                    addPending
                      ? React.createElement(React.Fragment, null,
                          React.createElement('button', { className: 'dsh-comp-btn', style: { borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' }, onClick: () => { addPrice(); setAddPending(false) } }, '✓ 确认添加到价格表'),
                          React.createElement('button', { className: 'dsh-comp-btn', onClick: () => setAddPending(false) }, '✕ 取消'),
                        )
                      : React.createElement(React.Fragment, null,
                          React.createElement('button', { className: 'dsh-comp-btn', onClick: () => setAddPending(true) }, '添加/更新价格'),
                          React.createElement('button', { className: 'dsh-comp-btn', onClick: resetPrices }, '恢复默认价格'),
                        ),
                  ),
                  // 修订 141：预览面板——识别 + 四桶表格 + 峰谷/分档附加预览,填一步长一步
                  React.createElement('div', { className: 'dsh-price-preview-panel' },
                    React.createElement('div', { className: 'dsh-price-preview-head' },
                      React.createElement('span', null, '💡 ' + (vendorTpl === 'auto' ? '自动识别: ' : '已选: ') + preview.tplName),
                      React.createElement('span', null, '币种 ' + preview.currency + ' · ' + chanLabel),
                    ),
                    // 修订 150：已配置过价格 → 覆盖提醒(增加≠无声覆盖)
                    existsPrice && React.createElement('div', { className: 'dsh-price-preview-warn' }, '⚠ 该模型已配置过价格，确认后将覆盖。'),
                    (() => {
                      const tplRatio = preview.out !== 0 && preview.in !== 0 ? preview.out / preview.in : 3
                      const extras = []
                      if (newInPeak.trim() !== '' && Number.isFinite(Number(newInPeak)) && Number(newInPeak) >= 0) {
                        const pv = Number(newInPeak)
                        const pOut = Math.round(pv * tplRatio * 1000) / 1000
                        extras.push('⛰ 高峰价 · 输入 ' + sym + pv + '/1M · 输出 ' + sym + pOut + '/1M')
                      }
                      if (newCtxLimit.trim() !== '' && Number.isFinite(Number(newCtxLimit)) && Number(newCtxLimit) > 0) {
                        const cv = Number(newCtxLimit)
                        const cin = newCtxIn.trim() !== '' && Number.isFinite(Number(newCtxIn)) && Number(newCtxIn) >= 0 ? Number(newCtxIn) : Math.round(preview.in * 2 * 1000) / 1000
                        const cOut = Math.round(cin * tplRatio * 1000) / 1000
                        extras.push('📏 超过 ' + formatCtx(cv) + ' 上下文 · 输入 ' + sym + cin + '/1M · 输出 ' + sym + cOut + '/1M')
                      }
                      if (newModel.trim() === '') {
                        return React.createElement('div', { className: 'dsh-price-preview-hint' }, '填写模型 id 后自动识别厂商、按官方比例派生价格预览;只填模型名即可（如 deepseek-v4-flash）。需要峰谷/分档可继续填右侧可选行。')
                      }
                      return React.createElement(React.Fragment, null,
                        // 修订 144：四桶表格按编排顺序排列(默认 输入/缓存读/缓存写/输出)
                        React.createElement('div', { className: 'dsh-price-preview-grid' },
                          (ratioOrder === 'in-out-read-write'
                            ? [
                                ['输入', sym + preview.in + '/1M'],
                                ['输出', sym + preview.out + '/1M'],
                                ['缓存读', preview.cacheRead !== undefined ? sym + preview.cacheRead + '/1M' : '—'],
                                ['缓存写', preview.cacheWrite !== undefined ? sym + preview.cacheWrite + '/1M' : '—'],
                              ]
                            : [
                                ['输入', sym + preview.in + '/1M'],
                                ['缓存读', preview.cacheRead !== undefined ? sym + preview.cacheRead + '/1M' : '—'],
                                ['缓存写', preview.cacheWrite !== undefined ? sym + preview.cacheWrite + '/1M' : '—'],
                                ['输出', sym + preview.out + '/1M'],
                              ]
                          ).reduce((acc, r) => { acc.push(React.createElement('span', { key: r[0] }, r[0]), React.createElement('span', { key: r[0] + ':v' }, r[1])); return acc }, []),
                        ),
                        extras.map((t, i) => React.createElement('div', { className: 'dsh-price-preview-extra', key: 'ex' + i }, t)),
                      )
                    })(),
                    React.createElement('button', { className: 'dsh-tpl-gear', style: { alignSelf: 'flex-start' }, onClick: () => setTplOpen(!tplOpen) }, '⚙ 厂商比例' + (tplOpen ? ' ▾' : ' ▸')),
                  ),
                  tplOpen && React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 } },
                    React.createElement('select', {
                      className: 'dsh-comp-select',
                      style: { flex: 1 },
                      value: vendorTpl,
                      onChange: (e) => setVendorTpl(e.target.value),
                    }, VENDOR_TEMPLATES.map((t) => React.createElement('option', { value: t.id, key: t.id }, t.name))),
                  ),
                  tplOpen && vendorTpl === 'custom' && React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                    React.createElement('select', { className: 'dsh-comp-select', value: customCurrency, onChange: (e) => setCustomCurrency(e.target.value) }, ['CNY', 'USD'].map((c) => React.createElement('option', { value: c, key: c }, c))),
                    React.createElement('input', { className: 'dsh-price-input', placeholder: '缓存读单价', value: customRead, onChange: (e) => setCustomRead(e.target.value) }),
                    React.createElement('input', { className: 'dsh-price-input', placeholder: '缓存写单价', value: customWrite, onChange: (e) => setCustomWrite(e.target.value) }),
                    React.createElement('input', { className: 'dsh-price-input', placeholder: '输出单价', value: customOut, onChange: (e) => setCustomOut(e.target.value) }),
                  ),
                )
              })(),
              // 修订 143：厂商 tab——结构化列表(官方 logo + 比例 chips + 币种徽章,点行展开匹配示例)
              priceTab === 'vendor' && React.createElement('div', { className: 'dsh-prices' },
                // 修订 164：层级拉开——标题+徽章 → 说明 → 工具栏 → 列表 → 脚注
                React.createElement('div', { className: 'dsh-vend-title' },
                  React.createElement('span', { className: 'dsh-vend-title-t' }, '厂商比例模板'),
                  React.createElement('span', { className: 'dsh-vend-title-badge' }, VENDOR_TEMPLATES.filter((t) => t.id !== 'auto' && t.id !== 'custom').length + ' 个模板'),
                ),
                React.createElement('p', { className: 'dsh-vend-desc' }, '填输入价 → 缓存读/缓存写/输出 按官方比例自动派生；自动识别按模型名匹配；同一厂商多套价格体系暂手动维护。'),
                React.createElement('div', { className: 'dsh-vend-toolbar' },
                  React.createElement('span', { className: 'dsh-price-label', style: { flex: 1 } }, '四格编排顺序（仅展示排列,不影响换算）:'),
                  // 修订 158：编排顺序两种状态收敛为一个按钮(文字即当前顺序,⇄ 点击切换)
                  React.createElement('button', {
                    className: 'dsh-ordpill',
                    title: '点击切换为: ' + (ratioOrder === 'in-out-read-write' ? '输入:缓存读:缓存写:输出' : '输入:输出:缓存读:缓存写'),
                    onClick: () => { const next = ratioOrder === 'in-out-read-write' ? 'in-read-write-out' : 'in-out-read-write'; setRatioOrder(next); saveOptions({ ...optionsRef.current, ratioOrder: next }) },
                  }, '⇄ ' + ratioOrderObj(ratioOrder).label),
                ),
                React.createElement('div', { className: 'dsh-vend-head' },
                  React.createElement('span', null, '厂商'),
                  React.createElement('span', null, ratioOrderObj(ratioOrder).head),
                ),
                VENDOR_TEMPLATES.filter((t) => t.id !== 'auto' && t.id !== 'custom').map((t) => {
                  const sel = vendSel === t.id
                  const hasLogo = t.logo !== undefined && vendLogoFail[t.id] !== true
                  return React.createElement('div', { className: 'dsh-vend-row' + (sel ? ' dsh-on' : ''), key: t.id, onClick: () => setVendSel(sel ? null : t.id) },
                    React.createElement('span', { className: 'dsh-vend-name' },
                      hasLogo
                        ? React.createElement('img', { className: 'dsh-vend-logo', src: 'https://models.dev/logos/' + t.logo + '.svg', alt: '', onError: () => setVendLogoFail((p) => ({ ...p, [t.id]: true })) })
                        : React.createElement('span', { className: 'dsh-vend-logo dsh-vend-logo-badge' }, (t.nick || t.name).charAt(0)),
                      React.createElement('span', null, t.nick || t.name),
                    ),
                    React.createElement('span', { className: 'dsh-vend-chips' },
                      ratioCellsOf(ratioOrder, t).map((c) => React.createElement('span', { className: 'dsh-vchip' + (c[2] ? ' zero' : ''), key: c[0] },
                        React.createElement('i', null, c[0]),
                        React.createElement('b', null, String(c[1]) + 'x'),
                      )),
                    ),
                    React.createElement('span', { className: 'dsh-vend-match' },
                      React.createElement('b', null, '自动匹配示例 '),
                      t.match,
                    ),
                  )
                }),
                React.createElement('p', { className: 'dsh-comp-desc' }, '「⚖ 参考厂商」配置(中转参考别家比例)与自定义比例维护将随后续版本提供;当前可用「新增价格」里的手动填写与厂商选择。'),
              ),
              // 修订 106：综合全部会话/渠道/模型 —— fullAll 来自 host summaryAll(账本汇总)
              React.createElement('div', { id: 'dsh-sec-stats', className: 'dsh-fullusage', style: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-interactive-bg-hover)', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)', fontVariantNumeric: 'tabular-nums' } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                  React.createElement('span', { style: { fontSize: 10, lineHeight: '16px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--dsw-alias-label-tertiary)' } }, '费用统计 · 综合全部'),
                  React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, lineHeight: '16px', fontWeight: 600, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap' } },
                    '命中率 ' + (fullAll === null || fullAll.hitRate === null ? '—' : fullAll.hitRate + '%'),
                  ),
                ),
                fullAll === null || fullAll.hasUsage !== true
                  ? React.createElement('span', { style: { fontSize: 11, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary)' } }, '暂无用量数据…')
                  : React.createElement(React.Fragment, null,
                    React.createElement('div', { style: fullGrid },
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '未缓存输入'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullAll.tokens.uncachedInput), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '缓存读'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullAll.tokens.cacheRead), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '缓存写'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullAll.tokens.cacheWrite), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '输出'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullAll.tokens.output), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                    ),
                    React.createElement('div', { style: fullDivider }),
                    fullAll.rows.length > 0 && fullAll.rows.map((r) => React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } },
                      React.createElement('span', { style: { fontWeight: 500, color: 'var(--dsw-alias-label-primary)', whiteSpace: 'nowrap' }, title: r.key }, r.key),
                      React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' } },
                        React.createElement('small', { style: fullTok }, formatTokens(r.tokens) + ' tok'),
                        React.createElement('span', { style: r.free ? { color: '#10b981', fontWeight: 600 } : { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' } },
                          r.free ? ('免费 · 省 ' + (r.refCost !== null && r.refCost !== undefined ? compactMoney(r.refCost, r.refCurrency, 'compact') : '')) : compactMoney(r.cost, r.currency, 'compact'),
                        ),
                      ),
                    )),
                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginTop: 2, borderTop: '1px dashed var(--dsw-alias-border-l2)' } },
                      React.createElement('span', { style: { fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, '总计费用'),
                      React.createElement('span', { style: { fontSize: 14, lineHeight: '20px', fontWeight: 700, color: 'var(--dsw-alias-brand-primary)' } }, Object.keys(fullAll.totals).map((k) => compactMoney(fullAll.totals[k], k, 'full')).join('   ')),
                    ),
                    fullAll.freeCount > 0 && React.createElement('div', { style: { fontSize: 11, lineHeight: '16px', fontWeight: 600, color: '#10b981' } },
                      '其中 ' + fullAll.freeCount + ' 个免费渠道' + (typeof fullAll.savedTotals === 'object' && fullAll.savedTotals !== null && Object.keys(fullAll.savedTotals).length > 0 ? ' · 按官方价已省 ' + Object.keys(fullAll.savedTotals).map((k) => compactMoney(fullAll.savedTotals[k], k, 'full')).join(' ') : ''),
                    ),
                    React.createElement('button', { className: 'dsh-comp-btn dsh-comp-reset', onClick: exportSummaryImage, style: { alignSelf: 'flex-start' } }, '📤 导出图片'),
                  ),
              ),
              React.createElement('div', { id: 'dsh-sec-diag', className: 'dsh-comp-desc', style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: 8 } },
                '诊断: ' + (diag === null ? '（加载中…）' : JSON.stringify(diag)),
              ),
              // 修订 174：详细编辑弹层——单价四桶+比例小字 / ↻按原比例更新 /
              // 🔒固定比例(单模型持久) / 峰谷手风琴 / 删除·取消·保存
              (editKey !== null && editDraft !== null) && (() => {
                // 修订 183：按模型名反查厂商(费率卡 logo/名称用;与自动识别同规则)
                const vendorByModel = (m) => {
                  const s = (m || '').toLowerCase()
                  const find = (id) => VENDOR_TEMPLATES.find((t) => t.id === id)
                  if (s.includes('claude') || s.includes('anthropic')) return find('claude')
                  if (s.includes('grok')) return find('grok')
                  if (s.includes('gpt') || s.includes('openai') || s.includes('o1') || s.includes('o3') || s.includes('o4')) return find('openai-gpt5')
                  if (s.includes('gemini') || s.includes('google')) return find('gemini')
                  if (s.includes('kimi') || s.includes('moonshot')) return find('kimi')
                  if (s.includes('deepseek')) return find('deepseek-v4')
                  if (s.includes('glm')) return find('glm')
                  if (s.includes('minimax')) return find('minimax')
                  if (s.includes('doubao') || s.includes('seed')) return find('doubao')
                  if (s.includes('qwen')) return find('qwen35')
                  return undefined
                }
                // 修订 183：弹层费率卡——logo + 厂商名/模型名 + 主价/峰谷 × 主币种/双币 表格
                const modalCardEl = () => {
                  const modelPart = editKey.indexOf('/') >= 0 ? editKey.slice(editKey.indexOf('/') + 1) : editKey
                  const mv = vendorByModel(modelPart)
                  const hasLogo = mv !== undefined && mv.logo !== undefined && vendLogoFail[mv.id] !== true
                  const d = editDraft
                  const pk = d.peak
                  const alt = editAlt
                  const srcBadgeC = editKey.indexOf('/') !== -1 ? ['渠道特选', 'dsh-modal-badge-channel'] : ['全局默认', 'dsh-modal-badge-global']
                  const symOf = (c) => c === 'CNY' ? '¥' : c === 'USD' ? '$' : c + ' '
                  const fmtP = (v, c) => (v === null || v === undefined ? '—' : symOf(c) + (Math.round(v * 100) / 100).toFixed(2))
                  const heads = ['单价', '主价(' + d.cur + ')', '峰谷(' + d.cur + ')']
                  if (alt !== null && alt !== undefined) { heads.push(alt.currency + ' 主价'); heads.push(alt.currency + ' 峰谷') }
                  // 修订 184：轨道数 = 表头数−1(值列数),之前 repeat(表头数) 多出
                  // 幽灵轨道把值列挤窄留空,导致对不齐
                  const vCols = heads.length - 1
                  const cells = heads.map((h, i) => React.createElement('span', { key: 'h' + i, className: 'dsh-modal-card-tbl-h' }, h))
                  const bucketKeys = [['输入', 'in'], ['缓存读', 'cr'], ['缓存写', 'cw'], ['输出', 'out']]
                  bucketKeys.forEach((bk) => {
                    const lb = bk[0]; const k = bk[1]
                    cells.push(React.createElement('span', { key: 'lb' + k, className: 'dsh-modal-card-tbl-lb' }, lb))
                    cells.push(React.createElement('span', { key: 'm' + k, className: 'dsh-modal-card-tbl-v' }, fmtP(d[k], d.cur)))
                    cells.push(React.createElement('span', { key: 'p' + k, className: 'dsh-modal-card-tbl-v' }, fmtP(pk !== null ? pk[k] : null, d.cur)))
                    if (alt !== null && alt !== undefined) {
                      cells.push(React.createElement('span', { key: 'a' + k, className: 'dsh-modal-card-tbl-v' }, fmtP(alt[k], alt.currency)))
                      cells.push(React.createElement('span', { key: 'ap' + k, className: 'dsh-modal-card-tbl-v' }, fmtP(alt.peak !== null && alt.peak !== undefined ? alt.peak[k] : null, alt.currency)))
                    }
                  })
                  return React.createElement('div', { className: 'dsh-modal-card' },
                    React.createElement('div', { className: 'dsh-modal-card-head' },
                      hasLogo
                        ? React.createElement('img', { className: 'dsh-modal-card-logo', src: 'https://models.dev/logos/' + mv.logo + '.svg', alt: '', onError: () => setVendLogoFail((p) => ({ ...p, [mv.id]: true })) })
                        : React.createElement('span', { className: 'dsh-modal-card-logo dsh-vend-logo-badge' }, ((mv ? (mv.nick || mv.name) : modelPart) || '?').charAt(0)),
                      React.createElement('div', { className: 'dsh-modal-card-id' },
                        React.createElement('span', { className: 'dsh-modal-card-name' }, mv ? (mv.nick || mv.name) : modelPart),
                        React.createElement('span', { className: 'dsh-modal-card-model', title: editKey }, editKey),
                      ),
                      React.createElement('span', { className: 'dsh-modal-badge ' + srcBadgeC[1] }, srcBadgeC[0]),
                    ),
                    React.createElement('div', { className: 'dsh-modal-card-tbl', style: { gridTemplateColumns: '64px repeat(' + vCols + ', 1fr)' } }, cells),
                  )
                }
                const d = editDraft
                const srcBadge = editKey.indexOf('/') !== -1 ? ['渠道特选', 'dsh-modal-badge-channel'] : ['全局默认', 'dsh-modal-badge-global']
                const mcell = (lb, k, v, base, ratioIn) => React.createElement('div', { className: 'dsh-mcell', key: k },
                  React.createElement('span', { className: 'dsh-mcell-lb' }, lb),
                  React.createElement('input', { className: 'dsh-mcell-in', type: 'number', step: '0.01', value: v === null || v === undefined ? '' : v, onChange: (e) => editSet(k, e.target.value) }),
                  React.createElement('span', { className: 'dsh-mcell-rc' + (base ? ' base' : '') }, base ? '1x' : (cellRatio(ratioIn, v === null || v === undefined ? null : v) || '')),
                )
                const pk = d.peak
                const ratioText = '读 ' + (cellRatio(d.in, d.cr) || '—') + ' · 写 ' + (cellRatio(d.in, d.cw) || '—') + ' · 出 ' + (cellRatio(d.in, d.out) || '—')
                return React.createElement('div', { className: 'dsh-modal-mask', onMouseDown: (e) => { if (e.target === e.currentTarget) closeEdit() } },
                  React.createElement('div', { className: 'dsh-modal' },
                    // 修订 183：费率卡(logo+名称+主价/峰谷×主币种/双币表格)替代纯文本头
                    modalCardEl(),
                    React.createElement('div', { className: 'dsh-modal-sec' },
                      React.createElement('div', { className: 'dsh-modal-sec-t' }, '币种'),
                      React.createElement('span', { className: 'dsh-curseg' },
                        ['CNY', 'USD'].map((c) => React.createElement('button', { key: c, className: 'dsh-curseg-btn' + (d.cur === c ? ' on' : ''), onClick: () => editSet('cur', c) }, (c === 'CNY' ? '🇨🇳 ' : '🇺🇸 ') + c)),
                      ),
                    ),
                    React.createElement('div', { className: 'dsh-modal-sec' },
                      React.createElement('div', { className: 'dsh-modal-sec-t' }, '单价（每 1M tokens）'),
                      React.createElement('div', { className: 'dsh-mgrid' },
                        mcell('输入', 'in', d.in, true, d.in),
                        mcell('缓存读', 'cr', d.cr, false, d.in),
                        mcell('缓存写', 'cw', d.cw, false, d.in),
                        mcell('输出', 'out', d.out, false, d.in),
                      ),
                    ),
                    React.createElement('div', { className: 'dsh-modal-sec' },
                      React.createElement('div', { className: 'dsh-modal-sec-t' }, '比例同步'),
                      React.createElement('div', { className: 'dsh-mratiotool' },
                        React.createElement('span', { className: 'dsh-mratio-cur' }, ratioText),
                        React.createElement('button', { className: 'dsh-comp-btn', style: { flex: 'none' }, title: '单独改过缓存读/缓存写/输出?点此让它们按弹层打开时的比例、对齐当前输入价', onClick: editScale }, '↻ 按原比例同步'),
                        React.createElement('span', { className: 'dsh-lockswitch' + (d.lock ? ' on' : ''), title: '开启:改输入价时,缓存读/缓存写/输出按锁定比例自动跟随(随该模型保存);关闭:自由编辑', onClick: editToggleLock },
                          React.createElement('span', { className: 'dsh-lockswitch-track' }),
                          React.createElement('span', { className: 'dsh-lockswitch-txt' }, '🔒 锁定比例'),
                        ),
                      ),
                      React.createElement('div', { className: 'dsh-mratio-hints' },
                        React.createElement('span', null, '↻ 单独改过其他桶?点它按原比例重新对齐当前输入价'),
                        React.createElement('span', null, '🔒 开启:输入价改动时其余桶自动跟随;关闭:自由编辑'),
                      ),
                    ),
                    React.createElement('div', { className: 'dsh-modal-sec' },
                      // 修订 182：整行可点展开(不再只点小 ▸)
                      React.createElement('div', { className: 'dsh-modal-peakhead' + (editPeakOpen ? ' open' : ''), onClick: () => setEditPeakOpen(!editPeakOpen) },
                        React.createElement('span', { className: 'dsh-modal-peaktoggle' }, editPeakOpen ? '▾' : '▸'),
                        React.createElement('span', { className: 'dsh-modal-sec-t', style: { marginBottom: 0, flex: 1 } }, '峰谷价'),
                        React.createElement('span', { className: 'dsh-modal-peakhint' }, pk === null ? '未设置 · 点击展开新增' : (editPeakOpen ? '点击收起' : '点击展开')),
                      ),
                      React.createElement('div', { className: 'dsh-modal-peakbody' + (editPeakOpen ? ' open' : '') },
                        React.createElement('div', null,
                          React.createElement('div', { className: 'dsh-mgrid' },
                            mcell('高峰输入', 'pk.in', pk !== null ? pk.in : null, true, pk !== null ? pk.in : 0),
                            mcell('高峰缓存读', 'pk.cr', pk !== null ? pk.cr : null, false, pk !== null ? pk.in : 0),
                            mcell('高峰缓存写', 'pk.cw', pk !== null ? pk.cw : null, false, pk !== null ? pk.in : 0),
                            mcell('高峰输出', 'pk.out', pk !== null ? pk.out : null, false, pk !== null ? pk.in : 0),
                          ),
                          // 修订 182：峰谷自己的比例同步(↻ + 🔒 + 比例行)
                          pk !== null && React.createElement('div', { className: 'dsh-mratiotool', style: { marginTop: 10 } },
                            React.createElement('span', { className: 'dsh-mratio-cur' }, '读 ' + (cellRatio(pk.in, pk.cr) || '—') + ' · 写 ' + (cellRatio(pk.in, pk.cw) || '—') + ' · 出 ' + (cellRatio(pk.in, pk.out) || '—')),
                            React.createElement('button', { className: 'dsh-comp-btn', style: { flex: 'none' }, title: '高峰价单独改过?点它按弹层打开时的比例重新对齐当前高峰输入', onClick: editPeakScale }, '↻ 按原比例同步'),
                            React.createElement('span', { className: 'dsh-lockswitch' + (pk.locked === true ? ' on' : ''), title: '开启:高峰输入改动时其余高峰桶自动跟随(随该模型保存)', onClick: editPeakLockToggle },
                              React.createElement('span', { className: 'dsh-lockswitch-track' }),
                              React.createElement('span', { className: 'dsh-lockswitch-txt' }, '🔒 锁定比例'),
                            ),
                          ),
                          pk !== null && React.createElement('div', { className: 'dsh-mratio-hints' },
                            React.createElement('span', null, '↻ 单独改过高峰桶?点它按原比例重新对齐当前高峰输入'),
                            React.createElement('span', null, '🔒 开启:高峰输入改动时其余高峰桶自动跟随'),
                          ),
                          React.createElement('div', { style: { marginTop: 8, textAlign: 'right' } },
                            React.createElement('button', { className: 'dsh-comp-btn', style: { color: '#d9534f' }, onClick: editPeakClear }, '清除峰谷价'),
                          ),
                        ),
                      ),
                    ),
                    React.createElement('div', { className: 'dsh-modal-foot' },
                      React.createElement('span', { className: 'dsh-modal-foot-l' },
                        React.createElement('button', { className: 'dsh-comp-btn', style: { color: '#d9534f' }, title: '删除该价格(内置=恢复默认)', onClick: editRemove }, '删除'),
                      ),
                      React.createElement('span', { className: 'dsh-modal-foot-r' },
                        React.createElement('button', { className: 'dsh-comp-btn', onClick: closeEdit }, '取消'),
                        React.createElement('button', { className: 'dsh-comp-btn', style: { borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' }, onClick: saveEdit }, '保存'),
                      ),
                    ),
                  ),
                )
              })(),
            )
          },
        ))

    }

  }
