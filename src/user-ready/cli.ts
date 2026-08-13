import { APP_PRODUCT_COMPLETE_TOKEN, FRONTIER_PARITY_TOKEN, HUMAN_E6_TOKEN, USER_READY_PACKET_TOKEN } from './tokens';
import { runUserReadyPacket } from './runtime';

async function main(): Promise<void> {
  const report = await runUserReadyPacket(process.cwd());
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
