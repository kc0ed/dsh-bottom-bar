// ═══ 1.1.1 拆出:DeepSeek 余额(方法 mixin + curl 优先拉取) ═══
import { request as httpsReq } from 'node:https'
import { execFile } from 'node:child_process'
import { homedir } from 'node:os'
import { readFile } from 'node:fs/promises'

// 修订 169：本机实测 node 内置 TLS(OpenSSL) 到 api.deepseek.com 握手被网络
// 环境卡死,而 curl(schannel) 正常——余额优先走 curl(Windows 自带),失败回退
const runCmd = (cmd, args, timeoutMs) => new Promise((resolve, reject) => {
  execFile(cmd, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout) => {
    if (err) reject(err)
    else resolve(stdout)
  })
})

// 挂到 BottomBarService.prototype 的方法集合(字段在构造器里初始化)
export const balanceMixin = {
  // 自动读取 DSH 官方 key(~/.dsh/.credentials.yaml 的 DEEPSEEK_API_KEY)兜底;
  // 手动 dskKey 优先。文件只读一次。
  async readDskKeyAuto() {
    if (this.dskCredLoaded === true) return
    this.dskCredLoaded = true
    this.dskKeyAuto = ''
    try {
      const raw = await readFile(homedir() + '/.dsh/.credentials.yaml', 'utf8')
      const m = raw.match(/^DEEPSEEK_API_KEY:\s*(.+?)\s*$/m)
      if (m !== null) this.dskKeyAuto = m[1].trim().replace(/^['"]|['"]$/g, '')
    } catch (e) {
      this.dskKeyAuto = ''
    }
  },
  dskKeyEffective() {
    const manual = typeof this.dskKey === 'string' && this.dskKey !== '' ? this.dskKey : ''
    return manual !== '' ? manual : (typeof this.dskKeyAuto === 'string' ? this.dskKeyAuto : '')
  },
  balanceSnapshot() {
    if (this.dskKeyEffective() === '') return { status: 'nokey' }
    const now = Date.now()
    if (this.balanceCache.data !== null && now - this.balanceCache.t < 5 * 60 * 1000) return this.balanceCache.data
    if (!this.balanceBusy) this.pullBalance().catch(() => {})
    return this.balanceCache.data !== null ? this.balanceCache.data : { status: 'loading' }
  },
  async pullBalance() {
    if (this.balanceBusy) return this.balanceCache.data !== null ? this.balanceCache.data : { status: 'loading' }
    this.balanceBusy = true
    try {
      const data = await this.fetchDskBalance()
      this.balanceCache = { t: Date.now(), data }
      return data
    } catch (e) {
      const data = { status: 'error', error: String(e !== null && e !== undefined && e.message !== undefined ? e.message : e) }
      this.balanceCache = { t: Date.now(), data }
      return data
    } finally {
      this.balanceBusy = false
    }
  },
  // 修订 169：优先 curl(schannel),失败回退 node https;解析统一走 parseDskBalance
  async fetchDskBalance() {
    let body = null
    let lastErr = null
    try {
      body = await runCmd('curl', ['-s', '--max-time', '12', '-H', 'Authorization: Bearer ' + this.dskKeyEffective(), '-H', 'Accept: application/json', 'https://api.deepseek.com/user/balance'], 15000)
    } catch (e) { lastErr = e }
    if (body === null || body === undefined || String(body).trim() === '') {
      try { body = await this.fetchDskBalanceNode() } catch (e) { throw (lastErr !== null ? lastErr : e) }
    }
    return this.parseDskBalance(String(body))
  },
  fetchDskBalanceNode() {
    return new Promise((resolve, reject) => {
      const req = httpsReq('https://api.deepseek.com/user/balance', {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + this.dskKeyEffective(), Accept: 'application/json' },
      }, (res) => {
        let b = ''
        res.on('data', (c) => (b += c))
        res.on('end', () => {
          if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return }
          resolve(b)
        })
      })
      req.on('error', reject)
      req.setTimeout(15000, () => req.destroy(new Error('余额接口超时')))
    })
  },
  parseDskBalance(body) {
    const j = JSON.parse(body)
    const infos = Array.isArray(j.balance_infos)
      ? j.balance_infos.map((i) => ({ currency: i.currency, total: Number(i.total_balance) || 0, granted: Number(i.granted_balance) || 0, toppedUp: Number(i.topped_up_balance) || 0 }))
      : []
    return { status: 'ok', isAvailable: j.is_available === true, infos, at: Date.now() }
  },
  async getBalance(args) {
    await this.loadConfig()
    const force = args !== null && args !== undefined && args.force === true
    return force ? this.pullBalance() : this.balanceSnapshot()
  },
}