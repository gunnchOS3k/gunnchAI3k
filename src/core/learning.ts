import { DatabaseManager } from './database';
import { Logger } from '../utils/logger';

export interface Decision {
  decision: string;
  outcome: string;
  context: string;
  timestamp: Date;
  userId: string;
}

export interface Pattern {
  type: string;
  description: string;
  frequency: number;
  successRate: number;
  recommendations: string[];
}

export interface Prediction {
  summary: string;
  probability: number;
  confidence: number;
  factors: string[];
}

export class LearningEngine {
  private db: DatabaseManager;
  private logger: Logger;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.logger = new Logger();
  }

  async initialize() {
    this.logger.info('Learning engine initialized');
  }

  async learnFromDecision(decision: Decision) {
    try {
      // Store the decision in the database
      await this.db.storeDecision(decision);
      
      // Analyze the decision for patterns
      await this.analyzeDecision(decision);
      
      // Update learning models
      await this.updateModels(decision);
      
      this.logger.info(`Learned from decision: ${decision.decision}`);
    } catch (error) {
      this.logger.error('Failed to learn from decision:', error);
      throw error;
    }
  }

  private async analyzeDecision(decision: Decision) {
    // Analyze decision patterns
    const patterns = await this.db.getPatterns();
    const newPattern = this.extractPattern(decision);
    
    // Check if this pattern already exists
    const existingPattern = patterns.find(p => p.type === newPattern.type);
    
    if (existingPattern) {
      // Update existing pattern
      existingPattern.frequency++;
      existingPattern.successRate = this.calculateSuccessRate(existingPattern, decision);
      await this.db.updatePattern(existingPattern);
    } else {
      // Create new pattern
      await this.db.createPattern(newPattern);
    }
  }

  private extractPattern(decision: Decision): Pattern {
    // Simple pattern extraction - can be enhanced with ML
    const type = this.categorizeDecision(decision.decision);
    const successRate = this.calculateOutcomeSuccess(decision.outcome);
    
    return {
      type,
      description: decision.decision,
      frequency: 1,
      successRate,
      recommendations: this.generateRecommendations(decision)
    };
  }

  private categorizeDecision(decision: string): string {
    const keywords = {
      'technical': ['code', 'development', 'programming', 'bug', 'feature'],
      'business': ['strategy', 'marketing', 'sales', 'revenue', 'customer'],
      'team': ['hire', 'fire', 'meeting', 'collaboration', 'management'],
      'product': ['design', 'user', 'interface', 'experience', 'launch']
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => decision.toLowerCase().includes(word))) {
        return category;
      }
    }
    
    return 'general';
  }

  private calculateOutcomeSuccess(outcome: string): number {
    const positiveWords = ['success', 'good', 'great', 'excellent', 'positive', 'achieved'];
    const negativeWords = ['failure', 'bad', 'terrible', 'negative', 'failed', 'problem'];
    
    const outcomeLower = outcome.toLowerCase();
    const positiveCount = positiveWords.filter(word => outcomeLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => outcomeLower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 0.8;
    if (negativeCount > positiveCount) return 0.2;
    return 0.5;
  }

  private calculateSuccessRate(existingPattern: Pattern, newDecision: Decision): number {
    const currentSuccess = this.calculateOutcomeSuccess(newDecision.outcome);
    return (existingPattern.successRate * (existingPattern.frequency - 1) + currentSuccess) / existingPattern.frequency;
  }

  private generateRecommendations(decision: Decision): string[] {
    const recommendations = [];
    
    if (decision.outcome.toLowerCase().includes('success')) {
      recommendations.push('Continue this approach for similar situations');
      recommendations.push('Document this successful strategy');
    } else {
      recommendations.push('Consider alternative approaches');
      recommendations.push('Analyze what went wrong');
      recommendations.push('Seek additional input before deciding');
    }
    
    return recommendations;
  }

  private async updateModels(decision: Decision) {
    // Update machine learning models based on new data
    // This is a placeholder for actual ML model updates
    this.logger.info('Updated learning models with new decision data');
  }

  async analyzePatterns(type: string = 'all') {
    const patterns = await this.db.getPatterns();
    const filteredPatterns = type === 'all' ? patterns : patterns.filter(p => p.type === type);
    
    const summary = this.generatePatternSummary(filteredPatterns);
    const keyPatterns = this.extractKeyPatterns(filteredPatterns);
    const recommendations = this.generatePatternRecommendations(filteredPatterns);
    
    return {
      summary,
      keyPatterns,
      recommendations
    };
  }

  private generatePatternSummary(patterns: Pattern[]): string {
    if (patterns.length === 0) {
      return 'No patterns found for the specified type.';
    }
    
    const totalPatterns = patterns.length;
    const avgSuccessRate = patterns.reduce((sum, p) => sum + p.successRate, 0) / totalPatterns;
    const mostFrequent = patterns.reduce((max, p) => p.frequency > max.frequency ? p : max);
    
    return `Found ${totalPatterns} patterns with an average success rate of ${(avgSuccessRate * 100).toFixed(1)}%. The most frequent pattern is "${mostFrequent.description}".`;
  }

  private extractKeyPatterns(patterns: Pattern[]): string[] {
    return patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)
      .map(p => `${p.description} (${p.frequency} times, ${(p.successRate * 100).toFixed(1)}% success)`);
  }

  private generatePatternRecommendations(patterns: Pattern[]): string[] {
    const recommendations = [];
    
    const successfulPatterns = patterns.filter(p => p.successRate > 0.7);
    const unsuccessfulPatterns = patterns.filter(p => p.successRate < 0.3);
    
    if (successfulPatterns.length > 0) {
      recommendations.push('Leverage your successful patterns more often');
      recommendations.push('Document and share successful strategies with your team');
    }
    
    if (unsuccessfulPatterns.length > 0) {
      recommendations.push('Avoid or modify patterns that have low success rates');
      recommendations.push('Analyze why certain approaches aren\'t working');
    }
    
    return recommendations;
  }

  async predictOutcome(scenario: string): Promise<Prediction> {
    // Simple prediction based on historical patterns
    const patterns = await this.db.getPatterns();
    const relevantPatterns = patterns.filter(p => 
      scenario.toLowerCase().includes(p.description.toLowerCase()) ||
      p.description.toLowerCase().includes(scenario.toLowerCase())
    );
    
    if (relevantPatterns.length === 0) {
      return {
        summary: 'No relevant historical data found for this scenario.',
        probability: 50,
        confidence: 20,
        factors: ['Limited historical data']
      };
    }
    
    const avgSuccessRate = relevantPatterns.reduce((sum, p) => sum + p.successRate, 0) / relevantPatterns.length;
    const confidence = Math.min(90, relevantPatterns.length * 15);
    
    return {
      summary: `Based on ${relevantPatterns.length} similar past decisions, there's a ${(avgSuccessRate * 100).toFixed(1)}% chance of success.`,
      probability: Math.round(avgSuccessRate * 100),
      confidence,
      factors: relevantPatterns.map(p => p.description)
    };
  }
}
