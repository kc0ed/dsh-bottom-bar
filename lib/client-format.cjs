// ═══ 1.1.1 拆出:纯函数(与主@952e6dd 逐字节一致;动态镜像由生成器内联) ═══
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
        // 修订 142：上下文量压缩显示——1200000→1.2M、250000→250k、1536→1.5k
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

            // 修订 167：单桶比例标注——每个输入框正下方小字显示该桶 ÷ 输入价
            // (输入框下 1x,缓存读框下 0.02x …),改输入即同步
            const cellRatio = (inV, v) => {
              const inN = Number(inV)
              if (!Number.isFinite(inN) || inN <= 0) return null
              if (v === undefined || v === null || !Number.isFinite(Number(v))) return null
              return (Math.round((Number(v) / inN) * 10000) / 10000) + 'x'
            }

module.exports = { formatTokens, formatDuration, formatTokensPerSecond, formatCtx, billedInputTokens, cacheHitPercent, compactMoney, balInfosOf, cellRatio, r4x }
