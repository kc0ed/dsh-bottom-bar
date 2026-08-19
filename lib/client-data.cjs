// ═══ 1.1.1 拆出:静态数据与纯函数(与主@952e6dd 逐字节一致;动态镜像由生成器内联) ═══
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

            // 修订 100：厂商比例模板只按 2026 年模型采样（旧系列不进下拉,
            // auto 识别时内联兼容比例,见 computePreviewPrice）。
            // 修订 143：比例四格 = 乘数(读/写/出 × 输入);修订 146：乘数按 A 读数
            // (输出:读:写)还原——用户原始贴表,与 models.dev 官方数据对表一致;
            // match=自动识别示例(2026 真实型号,来自 scripts/match-vendor-models.cjs)
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
            // 修订 144/146：比例四格编排顺序(可配置;默认 A = 输入:输出:缓存读:缓存写,
            // 与用户数据/models.dev 官方一致;备选 B = 输入:缓存读:缓存写:输出)
            const RATIO_ORDERS = [
              { id: 'in-out-read-write', label: '输入:输出:缓存读:缓存写', head: '比例（输入:输出:缓存读:缓存写）' },
              { id: 'in-read-write-out', label: '输入:缓存读:缓存写:输出', head: '比例（输入:缓存读:缓存写:输出）' },
            ]
            const ratioOrderObj = (o) => RATIO_ORDERS.find((r) => r.id === o) || RATIO_ORDERS[0]
            // 按编排顺序产出四格 [标签, 值, 是否灰显];乘数换算与顺序无关
            const ratioCellsOf = (o, t) => o === 'in-out-read-write'
              ? [['输入', 1, false], ['输出', t.out, t.out === 0], ['缓存读', t.read, t.read === 0], ['缓存写', t.write, t.write === 0]]
              : [['输入', 1, false], ['缓存读', t.read, t.read === 0], ['缓存写', t.write, t.write === 0], ['输出', t.out, t.out === 0]]
            // 旧系列兼容比例（2025 及更早,不进下拉;auto 命中时内联使用,不写错价）
            const LEGACY_TPLS = {
              openaiClassic: { currency: 'USD', out: 4, read: 0.5, write: 1.0 },
              deepseekV3: { currency: 'CNY', out: 4, read: 0.25, write: 1.0 },
              qwenClassic: { currency: 'CNY', out: 3, read: 0.25, write: 1.0 },
              generic: { currency: 'USD', out: 4, read: 0.25, write: 1.0 },
            }

module.exports = { SEGMENT_IDS, SEGMENT_LABELS, PREVIEW_TEXTS, DEFAULT_COMPOSITION, VENDOR_TEMPLATES, LEGACY_TPLS, RATIO_ORDERS, ratioOrderObj, ratioCellsOf }
