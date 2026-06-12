import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { BACKUP_ROOT, SQLITE_FILE, UPLOAD_DIR, TMP_DIR } from "./config.ts";
import { forceReloadStoreCache, loadStore } from "./store.ts";
import { nowIso } from "./utils.ts";

const SQLITE_BUSY_TIMEOUT_MS = 5_000;
const SQLITE_MAX_BUFFER = 1024 * 1024 * 20;

/**
 * Safe backup id pattern: alphanumeric, dots, hyphens, underscores only.
 * This prevents path traversal while allowing timestamp-based ids.
 */
const SAFE_ID_RE = /^[A-Za-z0-9._-]+$/;

export interface BackupOptions {
  sqliteFile?: string;
  backupRoot?: string;
  uploadDir?: string;
}

export interface BackupSummary {
  id: string;
  createdAt: string;
  sizeBytes: number;
  sqliteSizeBytes: number;
  quickCheckResult: string;
  hasUploads: boolean;
  checksums: Record<string, string>;
}

export interface BackupListResponse {
  backups: BackupSummary[];
}

export interface CreateBackupResponse {
  backup: BackupSummary;
}

export interface RestoreBackupResponse {
  restored: boolean;
  backupId: string;
  safetyBackupId: string | null;
  currentSessionStillExists: boolean;
}

function resolveOptions(options?: BackupOptions) {
  return {
    sqliteFile: options?.sqliteFile || SQLITE_FILE,
    backupRoot: options?.backupRoot || BACKUP_ROOT,
    uploadDir: options?.uploadDir || UPLOAD_DIR
  };
}

function sqliteExec(args: string[]) {
  return spawnSync("sqlite3", ["-cmd", `.timeout ${SQLITE_BUSY_TIMEOUT_MS}`, ...args], {
    encoding: "utf8",
    maxBuffer: SQLITE_MAX_BUFFER
  });
}

function checksumFile(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath);
    return createHash("sha256").update(content).digest("hex");
  } catch {
    return "checksum_unavailable";
  }
}

function checksumTree(dir: string, prefix: string, out: Record<string, string>): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      checksumTree(fullPath, relPath, out);
    } else if (entry.isFile()) {
      out[relPath] = checksumFile(fullPath);
    }
  }
}

function runQuickCheck(dbPath: string): string {
  const result = sqliteExec([dbPath, "PRAGMA quick_check;"]);
  if (result.status !== 0 || result.error) {
    return "error: " + (result.error?.message || result.stderr || "quick_check failed").trim();
  }
  return (result.stdout || "").trim();
}

function isValidBackupId(id: string): boolean {
  return SAFE_ID_RE.test(id);
}

function resolveBackupDir(backupRoot: string, id: string): string {
  if (!isValidBackupId(id)) {
    throw new Error("Invalid backup id");
  }
  const resolved = path.resolve(backupRoot, id);
  // Ensure it's still inside backupRoot (no traversal)
  if (!resolved.startsWith(path.resolve(backupRoot))) {
    throw new Error("Invalid backup id");
  }
  return resolved;
}

function readBackupManifest(backupDir: string): Record<string, unknown> | null {
  const manifestPath = path.join(backupDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function directorySize(dir: string): number {
  let total = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += directorySize(fullPath);
      } else if (entry.isFile()) {
        total += fs.statSync(fullPath).size;
      }
    }
  } catch {
    // skip inaccessible entries
  }
  return total;
}

/**
 * List all backups, sorted newest first by creation time in manifest.
 */
export function listDatabaseBackups(options?: BackupOptions): BackupListResponse {
  const { backupRoot } = resolveOptions(options);
  const backups: BackupSummary[] = [];

  if (!fs.existsSync(backupRoot)) {
    return { backups: [] };
  }

  const entries = fs.readdirSync(backupRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!isValidBackupId(entry.name)) continue;

    const backupDir = path.join(backupRoot, entry.name);
    const manifest = readBackupManifest(backupDir);
    if (!manifest) continue;

    const sqlitePath = path.join(backupDir, "minance.sqlite");
    const sqliteSizeBytes = fs.existsSync(sqlitePath) ? fs.statSync(sqlitePath).size : 0;
    const hasUploads = fs.existsSync(path.join(backupDir, "uploads"));

    backups.push({
      id: entry.name,
      createdAt: String(manifest.createdAt || ""),
      sizeBytes: directorySize(backupDir),
      sqliteSizeBytes,
      quickCheckResult: String(manifest.quickCheckResult || "unknown"),
      hasUploads,
      checksums: (manifest.checksums as Record<string, string>) || {}
    });
  }

  backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { backups };
}

/**
 * Create a new backup using SQLite's online backup mechanism.
 */
export function createDatabaseBackup(options?: BackupOptions): CreateBackupResponse {
  const { sqliteFile, backupRoot, uploadDir } = resolveOptions(options);

  if (!fs.existsSync(sqliteFile)) {
    throw new Error("SQLite database file does not exist");
  }

  const stamp = nowIso().replace(/[:.]/g, "-");
  const id = `backup_${stamp}_${randomBytes(4).toString("hex")}`;
  const backupDir = path.resolve(backupRoot, id);
  fs.mkdirSync(backupDir, { recursive: true });

  const targetSqlite = path.join(backupDir, "minance.sqlite");

  // Use SQLite online backup via .backup command — not a raw file copy.
  // This ensures the backup is consistent even during concurrent writes.
  const backupResult = sqliteExec([sqliteFile, `.backup '${targetSqlite}'`]);
  if (backupResult.status !== 0 || backupResult.error) {
    // Clean up on failure
    fs.rmSync(backupDir, { recursive: true, force: true });
    const reason = backupResult.error?.message || backupResult.stderr || "SQLite backup failed";
    throw new Error(String(reason).trim());
  }

  // Run quick_check on the backup
  const quickCheckResult = runQuickCheck(targetSqlite);

  // Compute checksums
  const checksums: Record<string, string> = {
    "minance.sqlite": checksumFile(targetSqlite)
  };

  // Copy uploads directory if it exists
  let hasUploads = false;
  if (fs.existsSync(uploadDir)) {
    const targetUploads = path.join(backupDir, "uploads");
    fs.cpSync(uploadDir, targetUploads, { recursive: true });
    hasUploads = true;
    // Checksum each file in uploads recursively
    if (fs.existsSync(targetUploads)) {
      checksumTree(targetUploads, "uploads", checksums);
    }
  }

  // Write manifest.json
  const manifest = {
    id,
    createdAt: nowIso(),
    sqliteFile: path.basename(sqliteFile),
    quickCheckResult,
    hasUploads,
    checksums
  };
  fs.writeFileSync(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  return {
    backup: {
      id,
      createdAt: manifest.createdAt,
      sizeBytes: directorySize(backupDir),
      sqliteSizeBytes: fs.statSync(targetSqlite).size,
      quickCheckResult,
      hasUploads,
      checksums
    }
  };
}

/**
 * Create a tar.gz archive of a backup directory in the tmp directory.
 * Returns the temporary file path so the caller can stream it and clean up.
 */
export function createBackupArchive(id: string, options?: BackupOptions): { filePath: string; fileName: string; sizeBytes: number } {
  const { backupRoot } = resolveOptions(options);
  const backupDir = resolveBackupDir(backupRoot, id);

  if (!fs.existsSync(backupDir)) {
    throw new Error("Backup not found");
  }

  // Verify manifest exists
  const manifest = readBackupManifest(backupDir);
  if (!manifest) {
    throw new Error("Backup manifest not found");
  }

  fs.mkdirSync(TMP_DIR, { recursive: true });
  const archivePath = path.join(TMP_DIR, `minance-backup-${id}-${process.pid}-${Date.now()}.tar.gz`);

  // Use system tar to create the archive
  const tarResult = spawnSync("tar", ["czf", archivePath, "-C", path.dirname(backupDir), path.basename(backupDir)], {
    encoding: "utf8",
    maxBuffer: SQLITE_MAX_BUFFER
  });

  if (tarResult.status !== 0 || tarResult.error) {
    const reason = tarResult.error?.message || tarResult.stderr || "tar archive creation failed";
    throw new Error(String(reason).trim());
  }

  const stat = fs.statSync(archivePath);
  return {
    filePath: archivePath,
    fileName: `minance-backup-${id}.tar.gz`,
    sizeBytes: stat.size
  };
}

/**
 * Restore a backup: safety backup, validate, atomically replace DB, restore uploads, reload cache.
 */
export function restoreDatabaseBackup(
  id: string,
  body: { confirmation: string; currentSessionId?: string },
  options?: BackupOptions
): RestoreBackupResponse {
  const { sqliteFile, backupRoot, uploadDir } = resolveOptions(options);
  const backupDir = resolveBackupDir(backupRoot, id);

  // Require exact confirmation = backup id
  if (!body.confirmation || body.confirmation !== id) {
    throw new Error("Confirmation required: must match the backup id");
  }

  if (!fs.existsSync(backupDir)) {
    throw new Error("Backup not found");
  }

  const backupSqlite = path.join(backupDir, "minance.sqlite");
  if (!fs.existsSync(backupSqlite)) {
    throw new Error("Backup does not contain a SQLite database file");
  }

  // Validate backup with quick_check before applying
  const quickCheckResult = runQuickCheck(backupSqlite);
  if (!quickCheckResult.includes("ok")) {
    throw new Error(`Backup validation failed (PRAGMA quick_check): ${quickCheckResult}`);
  }

  // Create pre-reload safety backup
  let safetyBackupId: string | null = null;
  try {
    const safety = createDatabaseBackup(options);
    safetyBackupId = safety.backup.id;
  } catch {
    // Safety backup failure is non-fatal; log and continue
    safetyBackupId = null;
  }

  const sqliteDir = path.dirname(sqliteFile);
  fs.mkdirSync(sqliteDir, { recursive: true });

  // Copy backup to temp path, then atomically rename over live file
  const tempPath = path.join(sqliteDir, `.restore-tmp-${Date.now()}.sqlite`);
  fs.copyFileSync(backupSqlite, tempPath);
  fs.renameSync(tempPath, sqliteFile);

  // Remove stale WAL and SHM sidecars
  for (const ext of ["-wal", "-shm"]) {
    const sidecar = sqliteFile + ext;
    if (fs.existsSync(sidecar)) {
      fs.rmSync(sidecar, { force: true });
    }
  }

  // Restore uploads if the backup has an uploads directory
  const backupUploads = path.join(backupDir, "uploads");
  if (fs.existsSync(backupUploads)) {
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.cpSync(backupUploads, uploadDir, { recursive: true });
  }

  // Force the in-memory store cache to reload from the replaced database
  forceReloadStoreCache();

  // Check if the current session still exists after reload
  let currentSessionStillExists = true;
  if (body.currentSessionId) {
    const store = loadStore();
    const session = store.sessions.find((s) => s.id === body.currentSessionId);
    currentSessionStillExists = !!session;
  }

  return {
    restored: true,
    backupId: id,
    safetyBackupId,
    currentSessionStillExists
  };
}
