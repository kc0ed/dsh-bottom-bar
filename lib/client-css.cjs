// ═══ 1.1.1 拆出:CSS 常量(原 client.js insertCss 模板,与主@952e6dd 逐字节一致) ═══
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
module.exports = { CLIENT_CSS }
