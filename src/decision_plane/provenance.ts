import {
  DECISION_POLICY_VERSION,
  type ConfidenceGateOutcome,
  type DecisionProvenance,
  type DecisionRequest,
  type DecisionUsage,
} from './contracts';

export function buildProvenance(input: {
  provider_id: string;
  model_id: string;
  remote: boolean;
  request: DecisionRequest;
  usage: DecisionUsage;
  latency_ms: number;
  confidence_gate?: ConfidenceGateOutcome | 'NOT_EVALUATED';
  fallback_used?: boolean;
}): DecisionProvenance {
  return {
    product: 'gunnchAI',
    decision_provider: input.provider_id,
    model: input.model_id,
    remote: input.remote,
    on_device_local: !input.remote,
    cloud_consent: input.request.cloud_consent,
    privacy_class: input.request.privacy_class,
    task_class: input.request.task_class,
    latency_ms: input.latency_ms,
    input_tokens: input.usage.input_tokens,
    output_tokens: input.usage.output_tokens,
    confidence_gate: input.confidence_gate ?? 'NOT_EVALUATED',
    fallback_used: Boolean(input.fallback_used),
    production_default: false,
    policy_version: input.request.policy_version ?? DECISION_POLICY_VERSION,
  };
}
