import { execFile, spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(__dirname, '../..');
const cliPath = resolve(repositoryRoot, 'dist/cli/index.js');

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

function runCommand(cwd: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolveResult({ code, stdout, stderr });
    });
  });
}

async function startServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<html lang="en"><head></head><body>Missing h1</body></html>');
  });

  await new Promise<void>((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolveServer();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server did not expose a TCP address.');
  }

  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveServer, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolveServer();
    });
  });
}

async function writeConfig(
  directory: string,
  baseUrl: string,
  severity: 'error' | 'warning'
): Promise<string> {
  const configPath = join(directory, `seo.${severity}.config.ts`);
  const source = `
type ConfiguredSeverity = 'error' | 'warning';
const h1Severity: ConfiguredSeverity = '${severity}';

export default {
  baseUrl: '${baseUrl}',
  discovery: { type: 'list', urls: ['/'] },
  rules: {
    'title-length': 'off',
    'description-length': 'off',
    'img-alt': 'off',
    'canonical': 'off',
    'noindex': 'off',
    'og-required': 'off',
    'hreflang': 'off',
    'robots-txt': 'off',
    'x-robots-tag': 'off',
    'broken-links': 'off',
    'structured-data': 'off',
    'h1-single': h1Severity,
    'lang': 'off',
    'redirect-chain': 'off',
  },
};
`;

  await writeFile(configPath, source, 'utf8');
  return configPath;
}

test.beforeAll(async () => {
  await execFileAsync(
    process.execPath,
    [resolve(repositoryRoot, 'node_modules/typescript/bin/tsc')],
    { cwd: repositoryRoot }
  );
});

test('CLI loads a TypeScript config and turns rule severity into the correct exit code', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'seo-guardian-cli-'));
  const { server, baseUrl } = await startServer();

  try {
    const warningConfig = await writeConfig(directory, baseUrl, 'warning');
    const warning = await runCommand(directory, [
      cliPath,
      '--config', warningConfig,
      '--reporter', 'json',
    ]);

    expect(warning.code).toBe(0);
    expect(warning.stdout).toContain('"failed": 0');
    expect(warning.stdout).toContain('"warned": 1');

    const errorConfig = await writeConfig(directory, baseUrl, 'error');
    const error = await runCommand(directory, [
      cliPath,
      '--config', errorConfig,
      '--reporter', 'json',
    ]);

    expect(error.code).toBe(1);
    expect(error.stdout).toContain('"failed": 1');
    expect(error.stdout).toContain('"h1-single"');
  } finally {
    await closeServer(server);
    await rm(directory, { recursive: true, force: true });
  }
});
