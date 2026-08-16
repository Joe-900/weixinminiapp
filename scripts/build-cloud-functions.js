/**
 * @file 云函数部署包装构建脚本（本地构建 + 部署包校验，不执行任何上传）
 *
 * 背景（阶段 1 结论）：
 * - CloudBase 以「函数目录」为部署单元，每个函数目录需要自己的 package.json；
 * - CloudBase Node 运行时只执行 JS，不直接运行 TypeScript，必须先把 main.ts 编译为 JS；
 * - 默认入口是 index.js（或 package.json 的 main 字段指向的文件），导出的 main 函数被调用；
 * - 本仓库共享代码（interfaces/common/cloud/mock/runtime）位于函数目录之外，
 *   且还跨到 src/types，因此部署时必须把共享代码打进每个函数（官方推荐做法）；
 * - wx-server-sdk 是「函数级依赖」：必须写进每个函数的 package.json，
 *   由云端「安装依赖」时拉取，仓库根目录不需要安装它（本地 Jest/Mock 与其解耦）。
 *
 * 产出：cloud/dist/<函数名>/{index.js, package.json}
 * - index.js：esbuild 单文件打包（仅 wx-server-sdk 保持外部 require），导出 main；
 * - package.json：main 指向 index.js，dependencies 含 wx-server-sdk。
 *
 * 用法：
 *   node scripts/build-cloud-functions.js          # 构建 + 校验
 *   node scripts/build-cloud-functions.js --check  # 仅校验已构建的产物
 */
'use strict'

const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'cloud', 'functions')
const OUT = path.join(ROOT, 'cloud', 'dist')

/** 需要部署到 CloudBase 的函数清单（每个函数目录必须有 main.ts 作为 CloudBase 入口） */
const FUNCTIONS = [
  'ai',
  'book',
  'community',
  'library',
  'note',
  'ranking',
  'reading',
  'reservation',
  'task',
  'user',
]

/** wx-server-sdk 版本：官方模板默认 latest；真实部署前建议按 CloudBase 运行环境锁定具体版本 */
const WX_SERVER_SDK_VERSION = 'latest'

function writeFunctionPackage(fn) {
  const pkg = {
    name: `reading-companion-${fn}`,
    version: '1.0.0',
    private: true,
    main: 'index.js',
    description: '校园阅读伴读小程序云函数（构建产物，请勿手改）',
    dependencies: {
      'wx-server-sdk': WX_SERVER_SDK_VERSION,
    },
  }
  fs.writeFileSync(path.join(OUT, fn, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
}

/** 静态校验：产物必须导出 main，且除 wx-server-sdk / node 内置模块外不得残留未内联依赖 */
function verifyBundle(fn) {
  const outfile = path.join(OUT, fn, 'index.js')
  if (!fs.existsSync(outfile)) {
    console.error(`✗ ${fn}: 缺少 ${outfile}`)
    return false
  }
  const code = fs.readFileSync(outfile, 'utf8')
  const hasMain = /exports\.main\s*=/.test(code) || /main:\s*\(\)\s*=>\s*main/.test(code)
  const requires = [...code.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1])
  const foreign = requires.filter(
    (r) => !r.startsWith('.') && r !== 'wx-server-sdk' && !r.startsWith('node:'),
  )
  const size = `${(fs.statSync(outfile).size / 1024).toFixed(1)} KB`
  if (!hasMain) console.error(`✗ ${fn}: 未导出 main`)
  if (foreign.length > 0) console.error(`✗ ${fn}: 存在未内联依赖: ${foreign.join(', ')}`)
  console.log(`${hasMain && foreign.length === 0 ? '✓' : '✗'} ${fn}  ${size}`)
  return hasMain && foreign.length === 0
}

/** 运行期冒烟测试：用临时 wx-server-sdk stub 真实 require 产物，确认 exports.main 可用（测后清理 stub） */
function smokeTest(fn) {
  const fnDir = path.join(OUT, fn)
  const stubDir = path.join(fnDir, 'node_modules', 'wx-server-sdk')
  fs.mkdirSync(stubDir, { recursive: true })
  fs.writeFileSync(
    path.join(stubDir, 'index.js'),
    [
      'module.exports = {',
      '  DYNAMIC_CURRENT_ENV: undefined,',
      '  init() {},',
      '  database() { return {} },',
      '  getWXContext() { return {} },',
      '  uploadFile() { return { fileID: "" } },',
      '  getTempFileURL() { return { fileList: [] } },',
      '};',
    ].join('\n'),
  )
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const mod = require(path.join(fnDir, 'index.js'))
    const ok = typeof mod.main === 'function'
    console.log(`${ok ? '✓' : '✗'} ${fn}  require() 冒烟测试（exports.main 为函数）`)
    return ok
  } catch (err) {
    console.error(`✗ ${fn}: 冒烟测试失败 -> ${err.message}`)
    return false
  } finally {
    fs.rmSync(path.join(fnDir, 'node_modules'), { recursive: true, force: true })
  }
}

async function buildAll() {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })

  for (const fn of FUNCTIONS) {
    const entry = path.join(SRC, fn, 'main.ts')
    if (!fs.existsSync(entry)) {
      throw new Error(`函数 "${fn}" 缺少 CloudBase 入口: ${entry}`)
    }
    await esbuild.build({
      entryPoints: [entry],
      outfile: path.join(OUT, fn, 'index.js'),
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node16',
      external: ['wx-server-sdk'],
      minify: false,
      sourcemap: false,
      logLevel: 'warning',
    })
    writeFunctionPackage(fn)
  }
}

function verifyAll() {
  let ok = true
  for (const fn of FUNCTIONS) {
    ok = verifyBundle(fn) && ok
  }
  for (const fn of FUNCTIONS) {
    ok = smokeTest(fn) && ok
  }
  return ok
}

async function main() {
  const checkOnly = process.argv.includes('--check')
  if (checkOnly) {
    console.log('仅校验已有部署包: cloud/dist/')
  } else {
    console.log('构建 CloudBase 部署包: cloud/dist/')
    await buildAll()
  }
  const ok = verifyAll()
  if (!ok) {
    console.error('\n校验未通过，请检查上方 ✗ 项。')
    process.exit(1)
  }
  console.log(
    '\nCloudBase 部署包装完成。上传方式（后续真实部署阶段执行，不在本地自动执行）：\n' +
      '1) 微信开发者工具 → 云开发 → 云函数 → 右键对应函数目录 → "上传并部署：云端安装依赖"；\n' +
      '2) 或 CloudBase CLI: tcb fn deploy <函数名> -e <环境ID> --force。',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
