#!/usr/bin/env node
/**
 * Continuance V product service CLI
 *
 *   npx tsx src/system-layer/product_service/cli.ts health
 *   npx tsx src/system-layer/product_service/cli.ts serve --port 8791
 *   npx tsx src/system-layer/product_service/cli.ts assist --capability tutoring --query "binary search"
 *   npx tsx src/system-layer/product_service/cli.ts rag-rebuild
 */
import * as path from 'node:path';
import { GunnchAIProductService } from './service';
import { startProductServiceServer } from './server';
import type { ProductRoute } from './types';
import { PRODUCT_SERVICE_TOKEN } from './types';

async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv.slice(2));
  const command = args._[0] ?? 'health';
  const varRoot = args['var-root']
    ? String(args['var-root'])
    : path.join(process.cwd(), 'var', 'gunnchai');
  const service = new GunnchAIProductService(process.cwd(), { varRoot });

  switch (command) {
    case 'health': {
      print(service.health());
      console.error(PRODUCT_SERVICE_TOKEN);
      break;
    }
    case 'requirements': {
      print({ nodes: service.requirementStatus() });
      break;
    }
    case 'routes': {
      print({ routes: service.listRoutes() });
      break;
    }
    case 'assist': {
      const capability = String(args.capability ?? 'tutoring') as ProductRoute;
      const result = await service.assist({
        capability,
        query: String(args.query ?? args._[1] ?? ''),
        purpose: args.purpose ? String(args.purpose) : undefined,
        continuitySessionId: args.session ? String(args.session) : undefined,
      });
      print(result);
      process.exitCode = result.ok ? 0 : 1;
      break;
    }
    case 'rag-rebuild': {
      print(service.rag.rebuild());
      break;
    }
    case 'rag-search': {
      print(service.rag.attribution(String(args.query ?? ''), Number(args.limit ?? 5)));
      break;
    }
    case 'governance': {
      print(service.governance.getState());
      break;
    }
    case 'serve': {
      const port = args.port ? Number(args.port) : 8791;
      const handles = await startProductServiceServer(service, port);
      console.error(
        `gunnchAI product service listening on ${handles.baseUrl} (LOCAL-ONLY 127.0.0.1)`,
      );
      console.error(PRODUCT_SERVICE_TOKEN);
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

export { main as runProductServiceCli };
