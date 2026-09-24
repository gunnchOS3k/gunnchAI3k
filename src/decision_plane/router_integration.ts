import type { RouterV2Input, RouterV2Result } from '../control/model_router_v2';
import { ModelRouterV2 } from '../control/model_router_v2';
import type { DecisionBroker } from './decision_broker';
import type { DecisionRequest } from './contracts';
import { featureInferenceQuestions } from './tasks/schemas';

export interface InferredRouterFeatures {
  needs_tools?: boolean;
  needs_multimodal?: boolean;
  used_decision_plane: boolean;
  reason: string;
}

/**
 * Jev may infer fuzzy features for ModelRouterV2. It does not replace hard constraints.
 */
export async function inferRouterFeatures(
  broker: DecisionBroker,
  state: unknown,
  hard: Omit<DecisionRequest, 'questions' | 'state' | 'task_class'>,
): Promise<InferredRouterFeatures> {
  try {
    const result = await broker.evaluate({
      ...hard,
      state,
      task_class: 'task_feature_inference',
      questions: featureInferenceQuestions(),
    });
    if (result.response.provenance.fallback_used || result.gate.outcome !== 'AUTO_BRANCH') {
      return { used_decision_plane: false, reason: result.gate.reason };
    }
    const tools = result.response.answers.needs_tools;
    const mm = result.response.answers.needs_multimodal;
    return {
      needs_tools: tools && tools.type === 'binary_probability' ? tools.probability_true >= 0.5 : undefined,
      needs_multimodal: mm && mm.type === 'binary_probability' ? mm.probability_true >= 0.5 : undefined,
      used_decision_plane: true,
      reason: 'GATED_FEATURES',
    };
  } catch {
    return { used_decision_plane: false, reason: 'DECISION_PLANE_UNAVAILABLE' };
  }
}

export function routeWithOptionalFeatures(
  router: ModelRouterV2,
  input: RouterV2Input,
  inferred: InferredRouterFeatures,
): RouterV2Result {
  const merged: RouterV2Input = {
    ...input,
    needs_tools: inferred.needs_tools ?? input.needs_tools,
    needs_multimodal: inferred.needs_multimodal ?? input.needs_multimodal,
  };
  return router.route(merged);
}
