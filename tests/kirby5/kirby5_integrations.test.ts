import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  WAIKE_SYSTEM_ONE_DECISION_CONTRACT_V1,
  assertWaikeSystemOneAllowed,
} from '../../integrations/waike/system_one_decision_contract_v1';
import {
  CAPSULE_SYSTEM_ONE_DECISION_CONTRACT_V1,
  assertCapsuleRemoteAllowed,
} from '../../integrations/gunnchos_capsule/system_one_decision_contract_v1';
import {
  RESEARCH_SYSTEM_ONE_DECISION_CONTRACT_V1,
  assertResearchSystemOneAllowed,
} from '../../integrations/research/system_one_decision_contract_v1';
import { createDecisionBroker } from '../../src/decision_plane/decision_broker';
import { TypeSafeFixtureProvider } from '../../src/providers/typesafe/typesafe_fixture';
import { waikeTutorQuestions, toolProposalQuestions, agentControllerQuestions } from '../../src/decision_plane/tasks/schemas';
import { WAIKE_FRONTIER_CONTRACT_V2 } from '../../integrations/waike/frontier_contract_v2';
import { DEVICE_OS_FRONTIER_CONTRACT_V2 } from '../../integrations/device_os/frontier_contract_v2';

const ROOT = path.resolve(__dirname, '../..');

describe('KIRBY-5 WAIKE / Capsule / research contracts', () => {
  test('WAIKE allows tutor routing and forbids Jev grading / student records', async () => {
    expect(WAIKE_SYSTEM_ONE_DECISION_CONTRACT_V1.rules.jev_not_grade_authority).toBe(true);
    expect(assertWaikeSystemOneAllowed('tutor_mode_selection').ok).toBe(true);
    expect(assertWaikeSystemOneAllowed('final_grade').ok).toBe(false);
    expect(assertWaikeSystemOneAllowed('student_penalty').ok).toBe(false);
    expect(assertWaikeSystemOneAllowed('send_student_records').ok).toBe(false);
    expect(WAIKE_FRONTIER_CONTRACT_V2.rules.model_owned_shell_authority).toBe(false);

    const broker = createDecisionBroker(new TypeSafeFixtureProvider(), new TypeSafeFixtureProvider(), {
      GUNNCHAI_SYSTEM_ONE_DECISION_PLANE: '1',
      GUNNCHAI_TYPESAFE_JEV: '1',
      GUNNCHAI_TYPESAFE_LIVE: '1',
      GUNNCHAI_JEV_WAIKE_ROUTING: '1',
    });
    const result = await broker.evaluate({
      state: { text: 'I am stuck on the concept of recursion' },
      questions: waikeTutorQuestions(),
      privacy_class: 'personal',
      task_class: 'waike_tutor_mode',
      cloud_consent: true,
      latency_budget_ms: 2000,
    });
    expect(result.response.answers.tutor_mode.type).toBe('categorical_choice');
    expect(result.response.provenance.production_default).toBe(false);
  });

  test('Capsule is local-first, consent-gated, and blocks device secrets / open LAN', () => {
    expect(CAPSULE_SYSTEM_ONE_DECISION_CONTRACT_V1.rules.local_first).toBe(true);
    expect(CAPSULE_SYSTEM_ONE_DECISION_CONTRACT_V1.rules.unauthenticated_lan_inference).toBe(false);
    expect(DEVICE_OS_FRONTIER_CONTRACT_V2.rules.model_owned_shell_authority).toBe(false);
    expect(assertCapsuleRemoteAllowed({ offline: true, cloud_consent: true, privacy_class: 'public', contains_device_secret: false }).ok).toBe(false);
    expect(assertCapsuleRemoteAllowed({ offline: false, cloud_consent: false, privacy_class: 'public', contains_device_secret: false }).ok).toBe(false);
    expect(assertCapsuleRemoteAllowed({ offline: false, cloud_consent: true, privacy_class: 'device_local', contains_device_secret: false }).ok).toBe(false);
    expect(assertCapsuleRemoteAllowed({ offline: false, cloud_consent: true, privacy_class: 'public', contains_device_secret: true }).ok).toBe(false);
    expect(assertCapsuleRemoteAllowed({ offline: false, cloud_consent: true, privacy_class: 'public', contains_device_secret: false }).ok).toBe(true);
  });

  test('Research System One cannot own 6G / network-control safety', () => {
    expect(RESEARCH_SYSTEM_ONE_DECISION_CONTRACT_V1.rules.jev_not_network_safety_authority).toBe(true);
    expect(assertResearchSystemOneAllowed('evidence_triage').ok).toBe(true);
    expect(assertResearchSystemOneAllowed('network_control').ok).toBe(false);
    expect(assertResearchSystemOneAllowed('6g_control_loop').ok).toBe(false);
  });

  test('tool proposal remains proposal-only; agent controller does not lift budgets', async () => {
    const broker = createDecisionBroker(new TypeSafeFixtureProvider(), new TypeSafeFixtureProvider(), {
      GUNNCHAI_SYSTEM_ONE_DECISION_PLANE: '1',
      GUNNCHAI_TYPESAFE_JEV: '1',
      GUNNCHAI_TYPESAFE_LIVE: '1',
    });
    const tool = await broker.evaluate({
      state: { text: 'Diagnose why adb devices is empty' },
      questions: toolProposalQuestions(),
      privacy_class: 'public',
      task_class: 'tool_class_proposal',
      cloud_consent: true,
      latency_budget_ms: 2000,
    });
    expect(tool.response.answers.tool_class.type).toBe('categorical_choice');
    const agent = await broker.evaluate({
      state: { text: 'token budget exhausted after 3 retries' },
      questions: agentControllerQuestions(),
      privacy_class: 'public',
      task_class: 'agent_continue_stop',
      cloud_consent: true,
      latency_budget_ms: 2000,
    });
    expect(agent.response.answers.next_step.type).toBe('categorical_choice');
  });

  test('required KIRBY-5 docs exist', () => {
    const docs = [
      'docs/frontier/KIRBY5_JEV_SYSTEM_ONE_ADOPTION.md',
      'docs/frontier/SYSTEM_ONE_DECISION_PLANE.md',
      'docs/frontier/JEV_DATA_PRIVACY_REVIEW.md',
      'docs/frontier/JEV_SECURITY_MODEL.md',
      'docs/frontier/JEV_CALIBRATION_EVAL_PLAN.md',
      'docs/frontier/JEV_PROMOTION_POLICY.md',
      'docs/uml/current/system_one_decision_plane.md',
      'docs/frontier/KIRBY_DOCTRINE_V2.md',
    ];
    for (const rel of docs) {
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
    }
  });
});
