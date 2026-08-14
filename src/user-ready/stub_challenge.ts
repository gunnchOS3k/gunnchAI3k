/**
 * Independent self-challenge: COMPLETE tasks must not be slogan stubs.
 * PARTIAL may list a runtime test without claiming implemented=true.
 */

const STUB_MARKERS = [
  /\bTODO\b/,
  /\bFIXME\b/,
  /\bnot implemented\b/i,
  /\bstub only\b/i,
  /\bcoming soon\b/i,
];

export function assertNotStub(label: string, value: unknown): void {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text || text.trim().length < 12) {
    throw new Error(`STUB_CHALLENGE_EMPTY:${label}`);
  }
  for (const re of STUB_MARKERS) {
    if (re.test(text)) throw new Error(`STUB_CHALLENGE_MARKER:${label}:${re}`);
  }
}

export function challengeImplementedFlags(
  tasks: Array<{
    task_id: string;
    implemented: boolean;
    actual_runtime_test: string | null;
    coverage_status?: 'COMPLETE' | 'PARTIAL' | 'OPEN';
  }>,
): string[] {
  const failures: string[] = [];
  for (const t of tasks) {
    const status = t.coverage_status ?? (t.implemented ? 'COMPLETE' : 'OPEN');
    if (status === 'COMPLETE') {
      if (!t.implemented) {
        failures.push(`${t.task_id}: COMPLETE but implemented=false`);
      }
      if (!t.actual_runtime_test) {
        failures.push(`${t.task_id}: COMPLETE but actual_runtime_test is null`);
      }
    } else if (status === 'PARTIAL') {
      if (t.implemented) {
        failures.push(`${t.task_id}: PARTIAL must not set implemented=true (that means COMPLETE)`);
      }
      if (!t.actual_runtime_test) {
        failures.push(`${t.task_id}: PARTIAL but actual_runtime_test is null`);
      }
    } else {
      if (t.implemented) {
        failures.push(`${t.task_id}: OPEN but implemented=true`);
      }
      if (t.actual_runtime_test) {
        failures.push(`${t.task_id}: OPEN but a runtime test path is listed`);
      }
    }
  }
  return failures;
}

export interface Challenge002Input {
  nanoShaUsedAsFast: boolean;
  emptyFileAccepted: boolean;
  fakeGgufAccepted: boolean;
  deepResearchSourceCount: number;
  unreadCited: string[];
  fabricatedUrls: string[];
  silentCloud: boolean;
  screenWithoutConsent: boolean;
  codingAgentDiffOnlyAccepted: boolean;
  matrixHasHardcodedPass: boolean;
}

export function challengeUserReady002(input: Challenge002Input): string[] {
  const failures: string[] = [];
  if (input.nanoShaUsedAsFast) failures.push('NANO_AS_FAST');
  if (input.emptyFileAccepted) failures.push('EMPTY_FILE_SHA');
  if (input.fakeGgufAccepted) failures.push('FAKE_MODEL_BYTES');
  if (input.deepResearchSourceCount < 2) failures.push('SINGLE_SEARCH_AS_DEEP_RESEARCH');
  if (input.unreadCited.length > 0) failures.push('UNREAD_SOURCE_CITED');
  if (input.fabricatedUrls.length > 0) failures.push('INVENTED_CITATIONS');
  if (input.silentCloud) failures.push('HIDDEN_CLOUD');
  if (input.screenWithoutConsent) failures.push('SCREEN_WITHOUT_CONSENT');
  if (input.codingAgentDiffOnlyAccepted) failures.push('DIFF_ONLY_CODING_AGENT');
  if (input.matrixHasHardcodedPass) failures.push('HARDCODED_MATRIX_PASS');
  return failures;
}

export interface Challenge003Input {
  syntheticDiscoveryCited: boolean;
  ocrOnlyClaimedComplete: boolean;
  draftPrJsonWithoutLiveUrl: boolean;
  fakeLocalPro: boolean;
  silentCloud: boolean;
  unreadCitations: boolean;
  unsafeTools: boolean;
}

export function challengeUserReady003(input: Challenge003Input): string[] {
  const failures: string[] = [];
  if (input.syntheticDiscoveryCited) failures.push('SYNTHETIC_SEARCH_AS_DEEP_RESEARCH');
  if (input.ocrOnlyClaimedComplete) failures.push('OCR_AS_VLM');
  if (input.draftPrJsonWithoutLiveUrl) failures.push('DRAFT_PR_JSON_NOT_LIVE');
  if (input.fakeLocalPro) failures.push('FAKE_LOCAL_PRO');
  if (input.silentCloud) failures.push('SILENT_CLOUD');
  if (input.unreadCitations) failures.push('UNREAD_CITATIONS');
  if (input.unsafeTools) failures.push('UNSAFE_TOOLS');
  return failures;
}
