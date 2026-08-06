#!/usr/bin/env node
/**
 * gunnchAI3k local-first runtime CLI
 *
 * Usage:
 *   npx tsx src/local-runtime/cli.ts health
 *   npx tsx src/local-runtime/cli.ts version
 *   npx tsx src/local-runtime/cli.ts assist --capability tutoring --query "binary search"
 *   npx tsx src/local-runtime/cli.ts verify-network
 *   npx tsx src/local-runtime/cli.ts serve --port 8787
 */
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { LocalFirstRuntime, inferCapability } from './runtime';
import { startRuntimeServer } from './server';
import type { CapabilityKind } from './types';
import { STATUS_TOKEN_PASS } from './types';

async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv.slice(2));
  const command = args._[0] ?? 'health';
  const auditDir = path.join(process.cwd(), 'evidence', 'local-runtime', 'audit');
  const runtime = new LocalFirstRuntime({
    mode: args.mode === 'cloud-allowed' ? 'cloud-allowed' : 'local-only',
    auditDir,
  });

  switch (command) {
    case 'health': {
      const h = runtime.health();
      print(h);
      if (h.statusToken === STATUS_TOKEN_PASS) {
        console.error(STATUS_TOKEN_PASS);
      }
      process.exitCode = h.status === 'ok' ? 0 : 1;
      break;
    }
    case 'version': {
      const h = runtime.health();
      print({
        runtimeName: h.runtimeName,
        runtimeVersion: h.runtimeVersion,
        packageVersion: h.packageVersion,
        activeProviderId: h.activeProviderId,
        providers: h.providers.map((p) => ({
          id: p.id,
          kind: p.kind,
          label: p.label,
          isTrainedLlm: p.isTrainedLlm,
          modelId: p.modelId,
          available: p.available,
        })),
        disclosure: h.disclosure,
      });
      break;
    }
    case 'verify-network': {
      print(runtime.verifyNetwork());
      break;
    }
    case 'assist': {
      const query = String(args.query ?? args._[1] ?? '');
      const capability = (args.capability as CapabilityKind) || inferCapability(query);
      const result = await runtime.handle({
        id: randomUUID(),
        capability,
        query,
        attemptCloud: Boolean(args['attempt-cloud']),
        timeoutMs: args.timeout ? Number(args.timeout) : 5000,
      });
      print(result);
      process.exitCode = result.ok ? 0 : 1;
      break;
    }
    case 'restart': {
      print(runtime.restart());
      break;
    }
    case 'serve': {
      const port = args.port ? Number(args.port) : 8787;
      const handles = await startRuntimeServer(runtime, port);
      console.error(
        `gunnchAI3k local runtime listening on http://127.0.0.1:${handles.port} (LOCAL-ONLY)`,
      );
      console.error(STATUS_TOKEN_PASS);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      process.exitCode = 2;
  }
}

function parseArgs(argv: string[]): Record<string, string | boolean> & { _: string[] } {
  const out: Record<string, string | boolean> & { _: string[] } = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

if (require.main === module) {
  main(process.argv).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { main as runLocalRuntimeCli };
