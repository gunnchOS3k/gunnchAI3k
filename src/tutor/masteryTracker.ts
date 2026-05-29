const mastery = new Map<string, number>();

export function recordMastery(userId: string, domainId: string, score: number): void {
  mastery.set(`${userId}:${domainId}`, score);
}

export function getMastery(userId: string, domainId: string): number | undefined {
  return mastery.get(`${userId}:${domainId}`);
}
