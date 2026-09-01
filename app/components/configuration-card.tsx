export type LaunchConfiguration = {
  arguments: string[]
  composeFile: string | null
  digest: string | null
  endpoint: string | null
  engine: string
  environment: Record<string, string>
  fidelity: "faithful" | "lossy" | null
  hasContainer: boolean
  image: string | null
  kind: string
  launchable: boolean
  mounts: Array<{ source?: string; target?: string; read_only?: boolean }>
  notes: string[]
  ports: string | null
  servedModelName: string | null
  sourceUrl: string | null
  status: string
  steps: string[][]
  title: string
}

function value(record: Record<string, unknown>, key: string): unknown {
  return record[key]
}

function stringMap(record: unknown): Record<string, string> {
  if (!record || typeof record !== "object" || Array.isArray(record)) return {}
  return Object.fromEntries(
    Object.entries(record as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  )
}

function stringList(record: unknown): string[] {
  return Array.isArray(record) ? record.map(String) : []
}

function argvList(record: unknown): string[][] {
  if (!Array.isArray(record)) return []
  return record.filter((step): step is unknown[] => Array.isArray(step)).map((step) => step.map(String))
}

function observedBlock(recipe: Record<string, unknown>): Record<string, unknown> | null {
  const metadata = (value(recipe, "metadata") as Record<string, unknown> | undefined) ?? {}
  const source = typeof value(recipe, "recipe_source") === "string" ? String(value(recipe, "recipe_source")) : ""
  const key = source === "mlxfast" ? "mlxfast" : source === "localmaxxing" ? "localmaxxing" : null
  if (!key) return null
  const block = metadata[key]
  if (!block || typeof block !== "object" || Array.isArray(block)) return null
  const tokenized = (block as Record<string, unknown>).tokenized
  if (!tokenized || typeof tokenized !== "object" || Array.isArray(tokenized)) return null
  return tokenized as Record<string, unknown>
}

export function flagRows(tokens: string[]): Array<[string, string]> {
  const rows: Array<[string, string]> = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!token.startsWith("-") || token === "-") continue
    const equals = token.indexOf("=")
    if (equals > 0) {
      rows.push([token.slice(0, equals), token.slice(equals + 1)])
      continue
    }
    const next = tokens[index + 1]
    if (next && !next.startsWith("-")) {
      rows.push([token, next])
      index += 1
    }
  }
  return rows
}

export function configurationFromRecipe(recipe: Record<string, unknown>, engineName?: string): LaunchConfiguration {
  const launch = (value(recipe, "launch") as Record<string, unknown> | undefined) ?? {}
  const container = (launch.container as Record<string, unknown> | undefined) ?? {}
  const kind = typeof launch.kind === "string" ? launch.kind : "reference"
  const observed = kind === "reference" ? observedBlock(recipe) : null
  const fields = observed ?? launch
  const hasContainer = kind === "docker" || kind === "docker-compose"
  const hostPort = hasContainer ? launch.host_port ?? launch.container_port : null
  const image = hasContainer
    ? (typeof launch.image === "string" ? launch.image : typeof container.image === "string" ? container.image : null)
    : null
  const source = launch.url ?? launch.source
  const sourceUrl = typeof source === "string" && source.startsWith("http")
    ? source
    : source && typeof source === "object" && typeof (source as { url?: string }).url === "string"
      ? (source as { url: string }).url
      : null
  const titles: Record<string, string> = {
    docker: "Docker 配置",
    "docker-compose": "Compose 配置",
    native: "原生配置",
    script: "脚本配置",
    controller: "控制器配置",
    reference: "参考配置",
  }
  const status = typeof value(recipe, "status") === "string" ? String(value(recipe, "status")) : "candidate"
  const registryMeta = (value(recipe, "registry") as Record<string, unknown> | undefined) ?? {}
  const launchable = registryMeta.launchable === true && status === "validated" && kind !== "reference"
  const mounts = hasContainer && Array.isArray(launch.mounts)
    ? launch.mounts.filter((item): item is LaunchConfiguration["mounts"][number] => !!item && typeof item === "object")
    : []
  const fidelity = observed && (observed.fidelity === "faithful" || observed.fidelity === "lossy")
    ? observed.fidelity
    : null
  return {
    arguments: fidelity === "lossy" ? [] : stringList(fields.arguments),
    composeFile: typeof (launch.compose as { file?: string } | undefined)?.file === "string"
      ? (launch.compose as { file: string }).file
      : typeof container.compose_file === "string" ? container.compose_file : null,
    digest: typeof container.digest === "string" ? container.digest : null,
    endpoint: typeof fields.endpoint === "string" ? fields.endpoint : null,
    engine: engineName || (typeof (value(recipe, "engine") as { name?: string } | undefined)?.name === "string" ? (value(recipe, "engine") as { name: string }).name : "unknown"),
    environment: fidelity === "lossy" ? {} : stringMap(fields.environment),
    fidelity,
    hasContainer,
    image,
    kind,
    launchable,
    mounts,
    notes: fidelity === "lossy" ? [] : stringList(fields.notes),
    ports: hostPort == null ? null : String(hostPort),
    servedModelName: typeof fields.served_model_name === "string" ? fields.served_model_name : null,
    sourceUrl,
    status,
    steps: fidelity === "lossy" ? [] : argvList(fields.steps),
    title: titles[kind] ?? "Configuration",
  }
}

function Argv({ tokens }: { tokens: string[] }) {
  if (tokens.length === 0) return null
  return (
    <ol className="argv">
      {tokens.map((token, index) => (
        <li key={`${index}:${token}`}><code>{token}</code></li>
      ))}
    </ol>
  )
}

function FlagTable({ tokens }: { tokens: string[] }) {
  const rows = flagRows(tokens)
  if (rows.length < 2) return null
  return (
    <table className="flag-table">
      <thead>
        <tr><th>参数</th><th>值</th></tr>
      </thead>
      <tbody>
        {rows.map(([flag, item], index) => (
          <tr key={`${index}:${flag}`}>
            <th scope="row"><code>{flag}</code></th>
            <td><code>{item}</code></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const KIND_ZH: Record<string,string> = { "docker": "Docker", "docker-compose": "Compose", "native": "原生", "script": "脚本", "controller": "控制器", "reference": "参考" }
export function ConfigurationCard({ config }: { config: LaunchConfiguration }) {
  const runtime = config.hasContainer ? "容器" : config.kind === "reference" ? "仅参考" : "无容器"
  const trust = config.launchable ? "已验证的可复现启动配置" : "候选证据——不含可执行启动配置"
  const argv = config.steps.length > 0 ? null : config.arguments
  const showFlags = config.fidelity !== "lossy"
  const empty = !config.image && !config.arguments.length && !config.steps.length && !config.endpoint && !Object.keys(config.environment).length && !config.notes.length && config.fidelity !== "lossy"
  return (
    <section aria-label={config.title} className="config-card">
      <header>
        <p className="eyebrow">{config.title}</p>
        <h3>{config.engine}</h3>
        <p className="config-runtime">
          <span data-runtime={config.hasContainer ? "docker" : config.kind}>{runtime}</span>
          {" · "}
          <span data-status={config.status}>{config.status === "validated" ? "已验证" : config.status === "candidate" ? "候选" : config.status}</span>
          {" · "}
          {KIND_ZH[config.kind] ?? config.kind.replace("-", " ")}
        </p>
        <p className="config-trust">{trust}</p>
      </header>
      <dl>
        {config.image && <div><dt>镜像</dt><dd><code>{config.image}</code></dd></div>}
        {config.digest && <div><dt>摘要</dt><dd><code>{config.digest}</code></dd></div>}
        {config.composeFile && <div><dt>Compose 文件</dt><dd><code>{config.composeFile}</code></dd></div>}
        {config.ports && <div><dt>端口</dt><dd>{config.ports}</dd></div>}
        {config.endpoint && <div><dt>端点</dt><dd><code>{config.endpoint}</code></dd></div>}
        {config.servedModelName && <div><dt>服务模型名</dt><dd><code>{config.servedModelName}</code></dd></div>}
        {config.sourceUrl && <div><dt>来源</dt><dd><a href={config.sourceUrl} rel="noreferrer" target="_blank">{config.sourceUrl}</a></dd></div>}
      </dl>
      {config.fidelity === "lossy" && (
        <p className="config-empty">源命令无法忠实分词，原始字符串保留在 metadata 中，不满足推广条件。</p>
      )}
      {config.steps.length > 0 && (
        <div className="config-block">
          <h4>观察到的源命令</h4>
          <p>对源命令的机械拆分，未经引擎 CLI 验证。模型库不为该部署方案提供运行操作。</p>
          <ol className="config-steps">
            {config.steps.map((step, index) => (
              <li key={index}><Argv tokens={step} /></li>
            ))}
          </ol>
        </div>
      )}
      {argv && argv.length > 0 && (
        <div className="config-block">
          <h4>{config.launchable ? "启动参数" : "观察到的源命令"}</h4>
          {!config.launchable && <p>对源命令的机械拆分，未经引擎 CLI 验证。模型库不为该部署方案提供运行操作。</p>}
          <Argv tokens={argv} />
          {showFlags && <FlagTable tokens={argv} />}
        </div>
      )}
      {showFlags && config.steps.length > 0 && flagRows(config.arguments).length >= 2 && (
        <div className="config-block">
          <FlagTable tokens={config.arguments} />
        </div>
      )}
      {Object.keys(config.environment).length > 0 && (
        <div className="config-block">
          <h4>环境变量</h4>
          <table className="flag-table">
            <thead>
              <tr><th>变量</th><th>值</th></tr>
            </thead>
            <tbody>
              {Object.entries(config.environment).map(([key, item]) => (
                <tr key={key}>
                  <th scope="row"><code>{key}</code></th>
                  <td><code>{item}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {config.mounts.length > 0 && (
        <div className="config-block">
          <h4>挂载</h4>
          <table className="flag-table">
            <thead>
              <tr><th>源路径</th><th>目标路径</th></tr>
            </thead>
            <tbody>
              {config.mounts.map((mount, index) => (
                <tr key={`${mount.source ?? index}`}>
                  <td><code>{mount.source}</code></td>
                  <td><code>{mount.target}</code>{mount.read_only ? "（只读）" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {config.notes.length > 0 && (
        <div className="config-block">
          <h4>来源备注</h4>
          {config.notes.map((note, index) => <p key={index}>{note}</p>)}
        </div>
      )}
      {empty && (
        <p className="config-empty">无分词启动字段。这里只有实测或源码记录的兼容性，不含可执行的 Docker 启动配置。</p>
      )}
    </section>
  )
}
