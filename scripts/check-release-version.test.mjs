import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packagePaths = [
  "package.json",
  "apps/web/package.json",
  "services/api/package.json",
  "packages/domain/package.json",
];

test("the release version stays aligned across packages and the changelog", async () => {
  const packages = await Promise.all(
    packagePaths.map(async (path) => JSON.parse(await readFile(path, "utf8"))),
  );
  const releaseVersion = packages[0].version;

  assert.match(releaseVersion, /^\d+\.\d+\.\d+$/, "release version must use SemVer");
  for (const [index, packageJson] of packages.entries()) {
    assert.equal(
      packageJson.version,
      releaseVersion,
      `${packagePaths[index]} must match the root release version`,
    );
  }

  const changelog = await readFile("CHANGELOG.md", "utf8");
  assert.match(
    changelog,
    new RegExp(`^## \\[${releaseVersion.replaceAll(".", "\\.")}\\]`, "m"),
    `CHANGELOG.md must document release ${releaseVersion}`,
  );
});
