import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envText = await readFile(path.resolve('.env'), 'utf8').catch(() => '');
  return envText.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?\s*$/m)?.[1] || '';
}

async function main() {
  const databaseUrl = await readDatabaseUrl();
  if (!databaseUrl) throw new Error('DATABASE_URL tidak ditemukan');

  const backupDir = path.resolve(process.env.BACKUP_DIR || './backups');
  await mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (databaseUrl.startsWith('postgres')) {
    const targetPath = path.join(backupDir, `tap-order-${stamp}.sql`);
    // ponytail: pg_dump on Windows often not on PATH; allow explicit override
    const pgDump = process.env.PG_DUMP_PATH || 'pg_dump';
    // pg_dump rejects Prisma's ?schema= query param; strip it, set search_path via PGOPTIONS instead
    const url = new URL(databaseUrl);
    const schema = url.searchParams.get('schema') || 'public';
    url.searchParams.delete('schema');
    try {
      await execFileAsync(pgDump, ['--no-owner', '--no-privileges', '--format=plain', '--file', targetPath, url.toString()], {
        env: { ...process.env, PGOPTIONS: `-c search_path=${schema}` },
      });
    } catch (error) {
      throw new Error(`pg_dump gagal (${pgDump}). Set PG_DUMP_PATH ke path pg_dump lengkap: ${String(error)}`);
    }
    console.log(`PostgreSQL backup written: ${targetPath}`);
    return;
  }

  if (databaseUrl.startsWith('file:')) {
    const source = databaseUrl.slice('file:'.length).replace(/^\.\//, '');
    const sourcePath = path.isAbsolute(source) ? source : path.resolve(process.cwd(), 'prisma', source);
    await stat(sourcePath);
    const targetPath = path.join(backupDir, `tap-order-${stamp}.db`);
    await copyFile(sourcePath, targetPath);
    console.log(`SQLite backup written: ${targetPath}`);
    return;
  }

  throw new Error('DATABASE_URL harus PostgreSQL atau SQLite');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
