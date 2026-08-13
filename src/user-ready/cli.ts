import {
  APP_PRODUCT_COMPLETE_TOKEN,
  FRONTIER_PARITY_TOKEN,
  HUMAN_E6_TOKEN,
  USER_READY_001_TOKEN,
  USER_READY_PACKET_TOKEN,
} from './tokens';
import { runUserReady001Packet } from './runtime_001';
import { runUserReadyPacket } from './runtime';

export type PacketId = '001' | '002';

export function resolvePacket(argv = process.argv.slice(2)): PacketId {
  const flag = argv.find((a) => a.startsWith('--packet='));
  if (flag) {
    const v = flag.split('=')[1];
    if (v === '001' || v === '002') return v;
  }
  const idx = argv.indexOf('--packet');
  if (idx >= 0 && (argv[idx + 1] === '001' || argv[idx + 1] === '002')) {
    return argv[idx + 1] as PacketId;
  }
  if (process.env.GUNNCHAI_USER_READY_PACKET === '001') return '001';
  if (process.env.GUNNCHAI_USER_READY_PACKET === '002') return '002';
  // npm script name hint
  const script = process.env.npm_lifecycle_event || '';
  if (script.includes('001')) return '001';
  if (script.includes('002')) return '002';
  return '002';
}

async function main(): Promise<void> {
  const packet = resolvePacket();
  if (packet === '001') {
    const report = await runUserReady001Packet(process.cwd());
    const summary = {
      packet: report.packet,
      allImplementedPassed: report.allImplementedPassed,
      coverage: report.coverage,
      tokens: report.tokens,
      pixels: report.pixels,
      modelTiers: {
        nano: report.modelTiers.nano.weightsStatus,
        localFast: report.modelTiers.localFast.weightsStatus,
        localPro: report.modelTiers.localPro.weightsStatus,
      },
      failed: report.results.filter((r) => !r.passed).map((r) => r.task_id),
      stubChallengeFailures: report.stubChallengeFailures,
      next_packet: report.next_packet,
      notes: report.notes,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (report.tokens[APP_PRODUCT_COMPLETE_TOKEN] !== false) process.exit(2);
    if (report.tokens[FRONTIER_PARITY_TOKEN] !== false) process.exit(2);
    if (report.tokens[HUMAN_E6_TOKEN] !== false) process.exit(2);
    if (!report.allImplementedPassed || report.tokens[USER_READY_001_TOKEN] !== true) {
      process.exit(1);
    }
    return;
  }

  const report = await runUserReadyPacket(process.cwd(), { fastNetworkConsent: true });
  const summary = {
    packet: report.packet,
    allImplementedPassed: report.allImplementedPassed,
    coverage: report.coverage,
    tokens: report.tokens,
    pixels: report.pixels,
    modelTiers: {
      nano: report.modelTiers.nano.weightsStatus,
      localFast: report.modelTiers.localFast.weightsStatus,
      localPro: report.modelTiers.localPro.weightsStatus,
    },
    observation: report.results.find((r) => r.task_id === 'AI-UR-016')?.evidence.observation,
    failed: report.results.filter((r) => !r.passed).map((r) => r.task_id),
    stubChallengeFailures: report.stubChallengeFailures,
    next_packet: report.next_packet,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (report.tokens[APP_PRODUCT_COMPLETE_TOKEN] !== false) process.exit(2);
  if (report.tokens[FRONTIER_PARITY_TOKEN] !== false) process.exit(2);
  if (report.tokens[HUMAN_E6_TOKEN] !== false) process.exit(2);
  if (!report.allImplementedPassed || report.tokens[USER_READY_PACKET_TOKEN] !== true) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
