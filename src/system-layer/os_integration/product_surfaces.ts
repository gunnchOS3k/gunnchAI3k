/**
 * Continuance VI — product surfaces that call the local product service.
 * Tests exercise these callers (not only raw /v1/assist).
 */

import type { GunnchAIProductService } from '../product_service/service';
import type { AssistResponse } from '../product_service/types';
import { AiInterfaceClient } from './ai_interface_client';

export type ProductSurfaceId =
  | 'waike_tutoring'
  | 'code_help'
  | 'device_troubleshooting'
  | 'archive_scientific_attribution'
  | 'connectivity_diagnosis'
  | 'accessibility_support';

export interface ProductSurfaceResult {
  surface: ProductSurfaceId;
  ok: boolean;
  assist: AssistResponse;
  caller: string;
}

async function viaService(
  service: GunnchAIProductService,
  surface: ProductSurfaceId,
  capability: Parameters<GunnchAIProductService['assist']>[0]['capability'],
  query: string,
  caller: string,
): Promise<ProductSurfaceResult> {
  const assist = await service.assist({ capability, query });
  return { surface, ok: assist.ok, assist, caller };
}

export async function waikeTutoring(
  service: GunnchAIProductService,
  topic = 'binary search intuition',
): Promise<ProductSurfaceResult> {
  return viaService(
    service,
    'waike_tutoring',
    'tutoring',
    `WAIKE curriculum tutoring: ${topic}. Use Socratic steps and local fixtures only.`,
    'product_surfaces.waikeTutoring',
  );
}

export async function codeHelp(
  service: GunnchAIProductService,
  prompt = 'Explain a safe local TypeScript helper without writing exploits',
): Promise<ProductSurfaceResult> {
  return viaService(service, 'code_help', 'code', prompt, 'product_surfaces.codeHelp');
}

export async function deviceTroubleshooting(
  service: GunnchAIProductService,
  prompt = 'Student handheld storage health check from device docs',
): Promise<ProductSurfaceResult> {
  return viaService(
    service,
    'device_troubleshooting',
    'device_help',
    prompt,
    'product_surfaces.deviceTroubleshooting',
  );
}

export async function archiveScientificAttribution(
  service: GunnchAIProductService,
  prompt = 'Archive scientific complexity attribution from local corpus',
): Promise<ProductSurfaceResult> {
  return viaService(
    service,
    'archive_scientific_attribution',
    'scientific',
    prompt,
    'product_surfaces.archiveScientificAttribution',
  );
}

export async function connectivityDiagnosis(
  service: GunnchAIProductService,
  prompt = 'Diagnose offline airplane mode connectivity and recommend bearer',
): Promise<ProductSurfaceResult> {
  const network = await viaService(
    service,
    'connectivity_diagnosis',
    'network',
    prompt,
    'product_surfaces.connectivityDiagnosis',
  );
  const pathRec = await service.assist({
    capability: 'connection_path',
    query: prompt,
  });
  return {
    ...network,
    assist: {
      ...network.assist,
      text: `${network.assist.text}\n\nConnection path: ${pathRec.text}`,
      structured: {
        ...network.assist.structured,
        connectionPath: pathRec.structured.connectionPath,
      },
    },
  };
}

export async function accessibilitySupport(
  service: GunnchAIProductService,
  prompt = 'Simplify UI copy and interpret switch-access input for motor limitations',
): Promise<ProductSurfaceResult> {
  const a11y = await viaService(
    service,
    'accessibility_support',
    'a11y',
    prompt,
    'product_surfaces.accessibilitySupport',
  );
  const input = await service.assist({
    capability: 'input_interpretation',
    query: prompt,
  });
  const adapted = await service.assist({
    capability: 'content_adaptation',
    query: `Simplify: ${prompt}`,
  });
  return {
    ...a11y,
    assist: {
      ...a11y.assist,
      text: `${a11y.assist.text}\n\nInput: ${input.text}\n\nAdapted: ${adapted.text}`,
      structured: {
        ...a11y.assist.structured,
        inputInterpretation: input.structured.inputInterpretation,
        adaptedText: adapted.structured.adaptedText,
      },
    },
  };
}

export async function runAllProductSurfaces(
  service: GunnchAIProductService,
): Promise<ProductSurfaceResult[]> {
  return [
    await waikeTutoring(service),
    await codeHelp(service),
    await deviceTroubleshooting(service),
    await archiveScientificAttribution(service),
    await connectivityDiagnosis(service),
    await accessibilitySupport(service),
  ];
}

/** Product surfaces via OS ai_interface client (HTTP). */
export async function runSurfacesViaOsClient(
  client: AiInterfaceClient,
): Promise<Array<{ surface: ProductSurfaceId; ok: boolean; requestId: string }>> {
  const tutoring = await client.tutorStart('student', 'waike binary search');
  const code = await client.assist('code', 'local code help');
  const device = await client.assist('device_help', 'device storage health');
  const science = await client.assist('scientific', 'archive attribution');
  const network = await client.assist('network', 'offline connectivity diagnosis');
  const a11y = await client.assist('a11y', 'accessibility support');
  return [
    {
      surface: 'waike_tutoring',
      ok: Boolean(tutoring.started),
      requestId: String(tutoring.requestId ?? ''),
    },
    { surface: 'code_help', ok: code.ok, requestId: code.requestId },
    { surface: 'device_troubleshooting', ok: device.ok, requestId: device.requestId },
    {
      surface: 'archive_scientific_attribution',
      ok: science.ok,
      requestId: science.requestId,
    },
    { surface: 'connectivity_diagnosis', ok: network.ok, requestId: network.requestId },
    { surface: 'accessibility_support', ok: a11y.ok, requestId: a11y.requestId },
  ];
}
