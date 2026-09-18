/** Health endpoint payload builder for NearbyEdgeServer. */
import type { ProviderGateway } from './ProviderGateway';
import { healthPayload } from './ProviderGateway';

export class HealthEndpoint {
  constructor(
    private readonly gateway: ProviderGateway,
    private readonly transport: string,
  ) {}

  async handle(): Promise<Record<string, unknown>> {
    return {
      ...healthPayload(this.gateway, this.transport),
      health: await this.gateway.health(),
    };
  }
}

export { healthPayload };
