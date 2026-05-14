import net from "node:net";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

type StartupMode = "dev" | "start";
type PortKind = "web" | "api";

interface PortResolutionOptions {
  isPortAvailable?: (port: number) => Promise<boolean>;
  maxAttempts?: number;
  reservedPorts?: Set<number>;
}

interface StartupPlanOptions extends PortResolutionOptions {
  mode: StartupMode;
  preferredWebPort?: number;
  preferredApiPort?: number;
}

interface CommandSpec {
  command: string;
  args: string[];
}

interface ServicePlan {
  requestedPort: number;
  port: number;
  reassigned: boolean;
  env: Record<string, string>;
  command: CommandSpec;
}

export interface StartupPlan {
  mode: StartupMode;
  web: ServicePlan;
  api: ServicePlan;
  warnings: string[];
}

interface PortAssignment {
  kind: PortKind;
  requestedPort: number;
  port: number;
  reassigned: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), "..");
const DEFAULT_WEB_PORT = 3000;
const DEFAULT_API_PORT = 3001;
const DEFAULT_MAX_ATTEMPTS = 50;

function isValidPort(value: number) {
  return Number.isInteger(value) && value > 0 && value <= 65535;
}

function parsePortValue(raw: string, flagName: string) {
  const port = Number(raw);
  if (!isValidPort(port)) {
    throw new Error(`Invalid value for ${flagName}: ${raw}`);
  }
  return port;
}

export function createPortWarning(kind: PortKind, requestedPort: number, port: number) {
  return `Preferred ${kind} port ${requestedPort} is in use; using ${port} instead.`;
}

function createPortAssignment(kind: PortKind, requestedPort: number, port = requestedPort): PortAssignment {
  return {
    kind,
    requestedPort,
    port,
    reassigned: port !== requestedPort
  };
}

function reservePort(assignment: PortAssignment, reservedPorts: Set<number>) {
  reservedPorts.add(assignment.port);
  return assignment;
}

function reservePreferredPort(
  kind: PortKind,
  requestedPort: number,
  preferredPortAvailable: boolean,
  reservedPorts: Set<number>
) {
  if (!preferredPortAvailable || reservedPorts.has(requestedPort)) {
    return null;
  }
  return reservePort(createPortAssignment(kind, requestedPort), reservedPorts);
}

async function assignOpenPort(
  kind: PortKind,
  requestedPort: number,
  options: PortResolutionOptions = {}
) {
  return reservePort(
    await findOpenPort(kind, requestedPort, options),
    options.reservedPorts ?? new Set<number>()
  );
}

async function getPreferredPortAvailability(
  preferredWebPort: number,
  preferredApiPort: number,
  isAvailable: (port: number) => Promise<boolean>
) {
  const [web, api] = await Promise.all([
    isAvailable(preferredWebPort),
    preferredApiPort === preferredWebPort ? Promise.resolve(false) : isAvailable(preferredApiPort)
  ]);

  return { web, api };
}

async function resolveStartupPorts(
  preferredWebPort: number,
  preferredApiPort: number,
  isAvailable: (port: number) => Promise<boolean>,
  maxAttempts: number
) {
  const reservedPorts = new Set<number>();
  const preferredAvailability = await getPreferredPortAvailability(preferredWebPort, preferredApiPort, isAvailable);

  let webPort = reservePreferredPort("web", preferredWebPort, preferredAvailability.web, reservedPorts);
  let apiPort = reservePreferredPort("api", preferredApiPort, preferredAvailability.api, reservedPorts);

  if (!webPort) {
    webPort = await assignOpenPort("web", preferredWebPort, {
      isPortAvailable: isAvailable,
      maxAttempts,
      reservedPorts
    });
  }

  if (!apiPort) {
    apiPort = await assignOpenPort("api", preferredApiPort, {
      isPortAvailable: isAvailable,
      maxAttempts,
      reservedPorts
    });
  }

  return { webPort, apiPort };
}

export async function isPortAvailable(port: number): Promise<boolean> {
  if (!isValidPort(port)) {
    return false;
  }

  return await new Promise<boolean>((resolve, reject) => {
    const server = net.createServer();
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      callback();
    };

    server.once("error", (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === "EADDRINUSE" || error.code === "EACCES") {
          resolve(false);
          return;
        }
        reject(error);
      });
    });

    server.listen(port, () => {
      server.close((error) => {
        finish(() => {
          if (error) {
            reject(error);
            return;
          }
          resolve(true);
        });
      });
    });
  });
}

export async function findOpenPort(
  kind: PortKind,
  requestedPort: number,
  options: PortResolutionOptions = {}
) {
  const {
    isPortAvailable: availabilityCheck = isPortAvailable,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    reservedPorts = new Set<number>()
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = requestedPort + attempt;
    if (reservedPorts.has(port)) {
      continue;
    }
    if (await availabilityCheck(port)) {
      return createPortAssignment(kind, requestedPort, port);
    }
  }

  throw new Error(`Unable to find an open ${kind} port starting from ${requestedPort}`);
}

export async function createStartupPlan(options: StartupPlanOptions): Promise<StartupPlan> {
  const preferredWebPort = options.preferredWebPort ?? DEFAULT_WEB_PORT;
  const preferredApiPort = options.preferredApiPort ?? DEFAULT_API_PORT;
  const isAvailable = options.isPortAvailable ?? isPortAvailable;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const { webPort, apiPort } = await resolveStartupPorts(
    preferredWebPort,
    preferredApiPort,
    isAvailable,
    maxAttempts
  );

  const apiEnv: Record<string, string> = {
    PORT: String(apiPort.port),
    MINANCE_ALLOWED_ORIGINS: `http://localhost:${webPort.port},http://127.0.0.1:${webPort.port}`
  };

  if (options.mode === "dev") {
    apiEnv.NODE_ENV = "development";
  }

  const webEnv = {
    MINANCE_API_ORIGIN: `http://127.0.0.1:${apiPort.port}`
  };

  const warnings: string[] = [];
  if (webPort.reassigned) {
    warnings.push(createPortWarning("web", webPort.requestedPort, webPort.port));
  }
  if (apiPort.reassigned) {
    warnings.push(createPortWarning("api", apiPort.requestedPort, apiPort.port));
  }

  return {
    mode: options.mode,
    web: {
      requestedPort: webPort.requestedPort,
      port: webPort.port,
      reassigned: webPort.reassigned,
      env: webEnv,
      command: {
        command: "pnpm",
        args: ["--filter", "@minance/web", options.mode, "--port", String(webPort.port)]
      }
    },
    api: {
      requestedPort: apiPort.requestedPort,
      port: apiPort.port,
      reassigned: apiPort.reassigned,
      env: apiEnv,
      command: {
        command: "pnpm",
        args: ["exec", "tsx", "services/api/src/server.ts"]
      }
    },
    warnings
  };
}

function printUsage() {
  console.error(
    "Usage: tsx scripts/run-with-open-ports.ts <dev|start> [--web-port <port>] [--api-port <port>] [--dry-run]"
  );
}

function parseArgs(argv: string[]) {
  const [modeRaw, ...rest] = argv;
  if (modeRaw !== "dev" && modeRaw !== "start") {
    throw new Error(`Expected mode to be 'dev' or 'start', received '${modeRaw ?? ""}'`);
  }

  let preferredWebPort: number | undefined;
  let preferredApiPort: number | undefined;
  let dryRun = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--web-port") {
      const value = rest[index + 1];
      if (value == null) {
        throw new Error("--web-port requires a value");
      }
      preferredWebPort = parsePortValue(value, "--web-port");
      index += 1;
      continue;
    }
    if (arg === "--api-port") {
      const value = rest[index + 1];
      if (value == null) {
        throw new Error("--api-port requires a value");
      }
      preferredApiPort = parsePortValue(value, "--api-port");
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    mode: modeRaw,
    preferredWebPort,
    preferredApiPort,
    dryRun
  };
}

function startChild(service: ServicePlan): ChildProcess {
  return spawn(service.command.command, service.command.args, {
    cwd: ROOT_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      ...service.env
    }
  });
}

async function runStartupPlan(plan: StartupPlan) {
  const children = [startChild(plan.api), startChild(plan.web)];
  let shutdownStarted = false;
  let exitCode = 0;
  let remaining = children.length;

  const shutdown = (signal: NodeJS.Signals = "SIGTERM") => {
    if (shutdownStarted) {
      return;
    }
    shutdownStarted = true;
    for (const child of children) {
      if (child.exitCode == null && child.signalCode == null) {
        child.kill(signal);
      }
    }
  };

  return await new Promise<number>((resolve) => {
    const finish = () => {
      remaining -= 1;
      if (remaining <= 0) {
        process.off("SIGINT", handleSigint);
        process.off("SIGTERM", handleSigterm);
        resolve(exitCode);
      }
    };

    const handleSigint = () => {
      exitCode = 130;
      shutdown("SIGINT");
    };

    const handleSigterm = () => {
      exitCode = 143;
      shutdown("SIGTERM");
    };

    process.on("SIGINT", handleSigint);
    process.on("SIGTERM", handleSigterm);

    for (const child of children) {
      child.on("error", (error) => {
        console.error(error instanceof Error ? error.message : String(error));
        exitCode = 1;
        shutdown();
        finish();
      });

      child.on("exit", (code, signal) => {
        if (exitCode === 0 && (code !== 0 || signal != null)) {
          exitCode = code ?? 1;
        }
        shutdown(signal === "SIGINT" ? "SIGINT" : "SIGTERM");
        finish();
      });
    }
  });
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const plan = await createStartupPlan({
      mode: args.mode,
      preferredWebPort: args.preferredWebPort,
      preferredApiPort: args.preferredApiPort
    });

    if (args.dryRun) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    for (const warning of plan.warnings) {
      console.warn(`[startup] ${warning}`);
    }

    console.log(`[startup] API: http://127.0.0.1:${plan.api.port}`);
    console.log(`[startup] Web: http://127.0.0.1:${plan.web.port}`);

    const exitCode = await runStartupPlan(plan);
    process.exit(exitCode);
  } catch (error) {
    printUsage();
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
