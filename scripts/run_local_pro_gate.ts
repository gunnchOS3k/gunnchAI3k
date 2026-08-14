import { ModelDownloadManager } from '../src/user-ready/model_manager';
import { runLocalProDirect } from '../src/user-ready/local_pro_runtime';

async function main(): Promise<void> {
  const m = new ModelDownloadManager();
  const e = await m.ensure('local-pro-qwen2_5-1_5b', { networkConsent: true, timeoutMs: 900_000 });
  console.log('ensure', JSON.stringify(e, null, 2));
  if (!e.ok) process.exit(1);
  const r = await runLocalProDirect(process.cwd(), { networkConsent: true });
  console.log(
    JSON.stringify(
      {
        ok: r.ok,
        sha256: r.sha256,
        bytes: r.bytes,
        weightsStatus: r.weightsStatus,
        notes: r.notes,
        cases: r.cases.map((c) => ({
          id: c.id,
          realInference: c.realInference,
          latencyMs: c.latencyMs,
          out: c.output.slice(0, 120),
        })),
      },
      null,
      2,
    ),
  );
  if (!r.ok) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
