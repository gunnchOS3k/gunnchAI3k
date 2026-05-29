export function generatePracticeQuestions(topic: string, count = 3): string[] {
  return Array.from({ length: count }, (_, i) => `Practice ${i + 1}: Explain ${topic} in your own words.`);
}
