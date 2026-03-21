import net from "node:net";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createStartupPlan,
  findOpenPort
} from "./run-with-open-ports.ts";

function listenOnRandomPort(): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, () => resolve(server));
  });
}

function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

test("createStartupPlan increments occupied preferred ports and rewires the web API origin", async () => {
  const preferredWebPort = 4100;
  const preferredApiPort = 5100;
  const occupiedPorts = new Set([preferredWebPort, preferredApiPort]);

  const plan = await createStartupPlan({
    mode: "dev",
    preferredWebPort,
    preferredApiPort,
    isPortAvailable: async (port) => !occupiedPorts.has(port)
  });

  assert.equal(plan.web.requestedPort, preferredWebPort);
  assert.equal(plan.web.port, preferredWebPort + 1);
  assert.equal(plan.web.reassigned, true);
  assert.equal(plan.api.requestedPort, preferredApiPort);
  assert.equal(plan.api.port, preferredApiPort + 1);
  assert.equal(plan.api.reassigned, true);
  assert.equal(plan.web.env.MINANCE_API_ORIGIN, `http://127.0.0.1:${preferredApiPort + 1}`);
  assert.match(plan.warnings[0] || "", /web port/i);
  assert.match(plan.warnings[1] || "", /api port/i);
});

test("createStartupPlan keeps preferred ports when they are free", async () => {
  const plan = await createStartupPlan({
    mode: "start",
    preferredWebPort: 6200,
    preferredApiPort: 7200,
    isPortAvailable: async () => true
  });

  assert.equal(plan.web.port, 6200);
  assert.equal(plan.web.reassigned, false);
  assert.equal(plan.api.port, 7200);
  assert.equal(plan.api.reassigned, false);
  assert.deepEqual(plan.warnings, []);
  assert.equal(plan.web.command.args.at(-1), "6200");
  assert.equal(plan.api.env.PORT, "7200");
});

test("createStartupPlan reserves distinct ports for web and api when ranges overlap", async () => {
  const occupiedPorts = new Set([3000, 3001]);

  const plan = await createStartupPlan({
    mode: "dev",
    preferredWebPort: 3000,
    preferredApiPort: 3001,
    isPortAvailable: async (port) => !occupiedPorts.has(port)
  });

  assert.equal(plan.web.port, 3002);
  assert.equal(plan.api.port, 3003);
  assert.notEqual(plan.web.port, plan.api.port);
  assert.equal(plan.web.env.MINANCE_API_ORIGIN, "http://127.0.0.1:3003");
});

test("createStartupPlan preserves the API preferred port when only the web preferred port is busy", async () => {
  const occupiedPorts = new Set([3000]);

  const plan = await createStartupPlan({
    mode: "dev",
    preferredWebPort: 3000,
    preferredApiPort: 3001,
    isPortAvailable: async (port) => !occupiedPorts.has(port)
  });

  assert.equal(plan.api.port, 3001);
  assert.equal(plan.api.reassigned, false);
  assert.equal(plan.web.port, 3002);
  assert.equal(plan.web.env.MINANCE_API_ORIGIN, "http://127.0.0.1:3001");
});

test("findOpenPort skips a real occupied port", async () => {
  const busyServer = await listenOnRandomPort();

  try {
    const address = busyServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP server address");
    }

    const result = await findOpenPort("api", address.port, {
      maxAttempts: 10
    });

    assert.equal(result.requestedPort, address.port);
    assert.equal(result.reassigned, true);
    assert.notEqual(result.port, address.port);
  } finally {
    await closeServer(busyServer);
  }
});
