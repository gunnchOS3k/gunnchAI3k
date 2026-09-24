import type { DecisionProvider } from './decision_provider';

export class DecisionRegistry {
  private readonly byId = new Map<string, DecisionProvider>();

  register(provider: DecisionProvider): void {
    this.byId.set(provider.provider_id, provider);
  }

  get(id: string): DecisionProvider | undefined {
    return this.byId.get(id);
  }

  list(): DecisionProvider[] {
    return [...this.byId.values()];
  }
}
