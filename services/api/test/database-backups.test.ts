import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  listDatabaseBackups,
  createDatabaseBackup,
  createBackupArchive,
  restoreDatabaseBackup
} from "../src/system-backups.ts";
import { spawnSync } from "node:child_process";
import { forceReloadStoreCache, resetStoreForTests, loadStore } from "../src/store.ts";
import { createId, nowIso } from "../src/utils.ts";

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "minance-backup-test-"));
}

function createTestSqlite(dbPath: string) {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
  const result = spawnSync(
    "sqlite3",
    [dbPath, "CREATE TABLE IF NOT EXISTS test_data (id INTEGER PRIMARY KEY, value TEXT NOT NULL); INSERT INTO test_data VALUES (1, 'hello'); INSERT INTO test_data VALUES (2, 'world');"],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error("Failed to create test SQLite database: " + (result.stderr || result.stdout));
  }
  return dbPath;
}

function isSqliteCliAvailable(): boolean {
  const result = spawnSync("sqlite3", ["--version"], { encoding: "utf8" });
  return result.status === 0 && !result.error;
}

test("createDatabaseBackup creates a valid backup", { skip: !isSqliteCliAvailable() }, () => {
  const tempDir = createTempDir();
  const sqliteFile = path.join(tempDir, "source.sqlite");
  const backupRoot = path.join(tempDir, "backups");
  const uploadDir = path.join(tempDir, "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  createTestSqlite(sqliteFile);

  // Create a test upload file
  fs.writeFileSync(path.join(uploadDir, "test.csv"), "date,amount\n2026-01-01,100");

  const result = createDatabaseBackup({ sqliteFile, backupRoot, uploadDir });
  assert.ok(result.backup.id, "backup should have an id");
  assert.ok(result.backup.id.startsWith("backup_"), "backup id should start with backup_");
  assert.ok(result.backup.createdAt, "backup should have a createdAt");
  assert.ok(result.backup.sizeBytes > 0, "backup size should be > 0");
  assert.ok(result.backup.sqliteSizeBytes > 0, "sqlite size should be > 0");
  assert.ok(result.backup.quickCheckResult.includes("ok"), "quick_check should pass");
  assert.equal(result.backup.hasUploads, true, "should include uploads");
  assert.ok(result.backup.checksums["minance.sqlite"], "should have checksum for minance.sqlite");
  assert.ok(result.backup.checksums["uploads/test.csv"], "should have checksum for uploads/test.csv");

  // Verify backup directory structure
  const backupDir = path.join(backupRoot, result.backup.id);
  assert.ok(fs.existsSync(backupDir), "backup directory should exist");
  assert.ok(fs.existsSync(path.join(backupDir, "minance.sqlite")), "minance.sqlite should exist");
  assert.ok(fs.existsSync(path.join(backupDir, "manifest.json")), "manifest.json should exist");
  assert.ok(fs.existsSync(path.join(backupDir, "uploads")), "uploads directory should exist");
  assert.ok(fs.existsSync(path.join(backupDir, "uploads", "test.csv")), "uploads/test.csv should exist");

  // Verify manifest content
  const manifest = JSON.parse(fs.readFileSync(path.join(backupDir, "manifest.json"), "utf8"));
  assert.equal(manifest.id, result.backup.id);
  assert.ok(manifest.quickCheckResult.includes("ok"));
  assert.equal(manifest.hasUploads, true);

  // Verify backup sqlite is valid and has data
  const readResult = spawnSync(
    "sqlite3",
    [path.join(backupDir, "minance.sqlite"), "SELECT count(*) FROM test_data;"],
    { encoding: "utf8" }
  );
  assert.equal(readResult.stdout.trim(), "2", "backup sqlite should contain data");

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("listDatabaseBackups returns backups sorted newest first", { skip: !isSqliteCliAvailable() }, () => {
  const tempDir = createTempDir();
  const sqliteFile = path.join(tempDir, "source.sqlite");
  const backupRoot = path.join(tempDir, "backups");

  createTestSqlite(sqliteFile);

  // Initially empty
  const empty = listDatabaseBackups({ sqliteFile, backupRoot });
  assert.deepEqual(empty.backups, [], "should be empty initially");

  // Create two backups
  const first = createDatabaseBackup({ sqliteFile, backupRoot });
  const second = createDatabaseBackup({ sqliteFile, backupRoot });

  const listed = listDatabaseBackups({ sqliteFile, backupRoot });
  assert.equal(listed.backups.length, 2, "should list 2 backups");
  // Newest first
  assert.equal(listed.backups[0].id, second.backup.id, "newest backup should be first");
  assert.equal(listed.backups[1].id, first.backup.id, "oldest backup should be second");

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("createBackupArchive returns a valid tar.gz file", { skip: !isSqliteCliAvailable() }, () => {
  const tempDir = createTempDir();
  const sqliteFile = path.join(tempDir, "source.sqlite");
  const backupRoot = path.join(tempDir, "backups");

  createTestSqlite(sqliteFile);
  const created = createDatabaseBackup({ sqliteFile, backupRoot });

  const archive = createBackupArchive(created.backup.id, { backupRoot });
  assert.ok(archive.filePath.endsWith(".tar.gz"), "should be a .tar.gz file");
  assert.ok(archive.fileName.includes(created.backup.id), "file name should include backup id");
  assert.ok(archive.sizeBytes > 0, "archive should not be empty");
  assert.ok(fs.existsSync(archive.filePath), "archive file should exist");

  // Verify it's a valid gzip
  const fileBuffer = fs.readFileSync(archive.filePath);
  assert.equal(fileBuffer[0], 0x1f, "gzip magic byte 1");
  assert.equal(fileBuffer[1], 0x8b, "gzip magic byte 2");

  // Clean up temp archive
  fs.rmSync(archive.filePath, { force: true });
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("createBackupArchive rejects invalid backup id", () => {
  assert.throws(
    () => createBackupArchive("../etc/passwd"),
    /Invalid backup id/,
    "should reject path traversal"
  );

  assert.throws(
    () => createBackupArchive("../../etc"),
    /Invalid backup id/,
    "should reject relative path"
  );
});

test("createBackupArchive rejects non-existent backup", () => {
  assert.throws(
    () => createBackupArchive("backup_nonexistent", { backupRoot: "/tmp" }),
    /Backup not found/,
    "should reject non-existent backup"
  );
});

test("restoreDatabaseBackup requires confirmation matching backup id", { skip: !isSqliteCliAvailable() }, () => {
  const tempDir = createTempDir();
  const sqliteFile = path.join(tempDir, "source.sqlite");
  const backupRoot = path.join(tempDir, "backups");

  createTestSqlite(sqliteFile);
  const created = createDatabaseBackup({ sqliteFile, backupRoot });

  // Wrong confirmation
  assert.throws(
    () => restoreDatabaseBackup(created.backup.id, { confirmation: "wrong-id" }, { sqliteFile, backupRoot }),
    /Confirmation required/,
    "should reject wrong confirmation"
  );

  // Empty confirmation
  assert.throws(
    () => restoreDatabaseBackup(created.backup.id, { confirmation: "" }, { sqliteFile, backupRoot }),
    /Confirmation required/,
    "should reject empty confirmation"
  );

  // Correct confirmation
  const result = restoreDatabaseBackup(created.backup.id, { confirmation: created.backup.id }, { sqliteFile, backupRoot });
  assert.equal(result.restored, true);
  assert.equal(result.backupId, created.backup.id);
  assert.ok(result.safetyBackupId, "should have created a safety backup");

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("restoreDatabaseBackup restores data and rolls back post-backup changes", { skip: !isSqliteCliAvailable() }, () => {
  const tempDir = createTempDir();
  const sqliteFile = path.join(tempDir, "source.sqlite");
  const backupRoot = path.join(tempDir, "backups");

  createTestSqlite(sqliteFile);

  // Create backup
  const created = createDatabaseBackup({ sqliteFile, backupRoot });

  // Add data after backup
  const addResult = spawnSync(
    "sqlite3",
    [sqliteFile, "INSERT INTO test_data VALUES (3, 'after-backup');"],
    { encoding: "utf8" }
  );
  assert.equal(addResult.status, 0, "should add post-backup data");

  // Verify post-backup data exists in live db
  const verifyResult = spawnSync(
    "sqlite3",
    [sqliteFile, "SELECT count(*) FROM test_data;"],
    { encoding: "utf8" }
  );
  assert.equal(verifyResult.stdout.trim(), "3", "live db should have 3 rows before restore");

  // Restore from backup
  const result = restoreDatabaseBackup(created.backup.id, { confirmation: created.backup.id }, { sqliteFile, backupRoot });
  assert.equal(result.restored, true);

  // Verify post-backup data is gone (rolled back to backup state)
  const afterRestore = spawnSync(
    "sqlite3",
    [sqliteFile, "SELECT count(*) FROM test_data;"],
    { encoding: "utf8" }
  );
  assert.equal(afterRestore.stdout.trim(), "2", "restored db should have 2 rows (post-backup data removed)");

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("restoreDatabaseBackup creates a pre-reload safety backup", { skip: !isSqliteCliAvailable() }, () => {
  const tempDir = createTempDir();
  const sqliteFile = path.join(tempDir, "source.sqlite");
  const backupRoot = path.join(tempDir, "backups");

  createTestSqlite(sqliteFile);
  const created = createDatabaseBackup({ sqliteFile, backupRoot });

  // Add some data to make pre-reload backup meaningful
  const addResult = spawnSync(
    "sqlite3",
    [sqliteFile, "INSERT INTO test_data VALUES (10, 'pre-reload-data');"],
    { encoding: "utf8" }
  );
  assert.equal(addResult.status, 0);

  const result = restoreDatabaseBackup(created.backup.id, { confirmation: created.backup.id }, { sqliteFile, backupRoot });
  assert.ok(result.safetyBackupId, "should have created a safety backup");

  // Verify safety backup exists
  const backups = listDatabaseBackups({ backupRoot });
  const safetyIds = backups.backups.map((b) => b.id);
  assert.ok(safetyIds.includes(result.safetyBackupId!), "safety backup should be listed");

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("restoreDatabaseBackup rejects backup with failed quick_check", { skip: !isSqliteCliAvailable() }, () => {
  const tempDir = createTempDir();
  const sqliteFile = path.join(tempDir, "source.sqlite");
  const backupRoot = path.join(tempDir, "backups");

  createTestSqlite(sqliteFile);
  const created = createDatabaseBackup({ sqliteFile, backupRoot });

  // Corrupt the backup sqlite
  const backupDir = path.join(backupRoot, created.backup.id);
  const backupSqlite = path.join(backupDir, "minance.sqlite");
  fs.writeFileSync(backupSqlite, "this is not a valid sqlite database");

  assert.throws(
    () => restoreDatabaseBackup(created.backup.id, { confirmation: created.backup.id }, { sqliteFile, backupRoot }),
    /Backup validation failed/,
    "should reject backup with failed quick_check"
  );

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("restoreDatabaseBackup cleans up WAL/SHM sidecars", { skip: !isSqliteCliAvailable() }, () => {
  const tempDir = createTempDir();
  const sqliteFile = path.join(tempDir, "source.sqlite");
  const backupRoot = path.join(tempDir, "backups");

  createTestSqlite(sqliteFile);

  // Create sidecar files
  fs.writeFileSync(sqliteFile + "-wal", "fake wal content");
  fs.writeFileSync(sqliteFile + "-shm", "fake shm content");
  assert.ok(fs.existsSync(sqliteFile + "-wal"), "WAL should exist before restore");
  assert.ok(fs.existsSync(sqliteFile + "-shm"), "SHM should exist before restore");

  const created = createDatabaseBackup({ sqliteFile, backupRoot });

  // Re-create sidecars after backup creation (backup might create them)
  fs.writeFileSync(sqliteFile + "-wal", "stale wal content");
  fs.writeFileSync(sqliteFile + "-shm", "stale shm content");

  restoreDatabaseBackup(created.backup.id, { confirmation: created.backup.id }, { sqliteFile, backupRoot });

  // Sidecars should be gone
  assert.equal(fs.existsSync(sqliteFile + "-wal"), false, "WAL should be removed after restore");
  assert.equal(fs.existsSync(sqliteFile + "-shm"), false, "SHM should be removed after restore");

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("restoreDatabaseBackup restores uploads from backup", { skip: !isSqliteCliAvailable() }, () => {
  const tempDir = createTempDir();
  const sqliteFile = path.join(tempDir, "source.sqlite");
  const backupRoot = path.join(tempDir, "backups");
  const uploadDir = path.join(tempDir, "uploads");

  createTestSqlite(sqliteFile);
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, "import.csv"), "original,data");

  const created = createDatabaseBackup({ sqliteFile, backupRoot, uploadDir });

  // Modify uploads after backup
  fs.writeFileSync(path.join(uploadDir, "modified.csv"), "modified,data");

  restoreDatabaseBackup(created.backup.id, { confirmation: created.backup.id }, { sqliteFile, backupRoot, uploadDir });

  // Uploads should be from backup, not modified
  assert.ok(fs.existsSync(path.join(uploadDir, "import.csv")), "original upload should exist");
  assert.equal(fs.existsSync(path.join(uploadDir, "modified.csv")), false, "modified upload should not exist");

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("restore with currentSessionId checks session existence after reload", { skip: !isSqliteCliAvailable() }, () => {
  const tempDir = createTempDir();
  const sqliteFile = path.join(tempDir, "source.sqlite");
  const backupRoot = path.join(tempDir, "backups");

  createTestSqlite(sqliteFile);
  const created = createDatabaseBackup({ sqliteFile, backupRoot });

  const result = restoreDatabaseBackup(
    created.backup.id,
    { confirmation: created.backup.id, currentSessionId: "session_not_in_db" },
    { sqliteFile, backupRoot }
  );
  assert.equal(result.currentSessionStillExists, false, "should report session does not exist");

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});
