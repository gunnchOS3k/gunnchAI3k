import { LearningEngine } from './learning';
import { DatabaseManager } from './database';

export interface Analysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
}

export class DecisionAnalyzer {
  private learningEngine: LearningEngine;
  private db: DatabaseManager;

  constructor(learningEngine: LearningEngine) {
    this.learningEngine = learningEngine;
    this.db = learningEngine['db'];
  }

  async analyzeProject(project?: string): Promise<Analysis> {
    const decisions = await this.db.getDecisions();
    const patterns = await this.db.getPatterns();
    
    const strengths = this.identifyStrengths(decisions, patterns);
    const weaknesses = this.identifyWeaknesses(decisions, patterns);
    const opportunities = this.identifyOpportunities(decisions, patterns);
    
    const summary = this.generateSummary(strengths, weaknesses, opportunities);
    
    return {
      summary,
      strengths,
      weaknesses,
      opportunities
    };
  }

  private identifyStrengths(decisions: any[], patterns: any[]): string[] {
    const strengths = [];
    
    // Find high-success patterns
    const successfulPatterns = patterns.filter(p => p.successRate > 0.7);
    if (successfulPatterns.length > 0) {
      strengths.push(`Strong performance in ${successfulPatterns.map(p => p.type).join(', ')} decisions`);
    }
    
    // Find consistent decision-making
    const decisionFrequency = this.calculateDecisionFrequency(decisions);
    if (decisionFrequency > 0.8) {
      strengths.push('Consistent decision-making approach');
    }
    
    // Find learning progression
    const learningProgress = this.calculateLearningProgress(decisions);
    if (learningProgress > 0.6) {
      strengths.push('Strong learning and adaptation capabilities');
    }
    
    return strengths;
  }

  private identifyWeaknesses(decisions: any[], patterns: any[]): string[] {
    const weaknesses = [];
    
    // Find low-success patterns
    const unsuccessfulPatterns = patterns.filter(p => p.successRate < 0.3);
    if (unsuccessfulPatterns.length > 0) {
      weaknesses.push(`Challenges in ${unsuccessfulPatterns.map(p => p.type).join(', ')} areas`);
    }
    
    // Find decision gaps
    const decisionGaps = this.identifyDecisionGaps(decisions);
    if (decisionGaps.length > 0) {
      weaknesses.push(`Limited experience in: ${decisionGaps.join(', ')}`);
    }
    
    // Find inconsistency
    const consistency = this.calculateConsistency(decisions);
    if (consistency < 0.5) {
      weaknesses.push('Inconsistent decision-making approach');
    }
    
    return weaknesses;
  }

  private identifyOpportunities(decisions: any[], patterns: any[]): string[] {
    const opportunities = [];
    
    // Find underutilized successful patterns
    const underutilizedPatterns = patterns.filter(p => p.successRate > 0.7 && p.frequency < 3);
    if (underutilizedPatterns.length > 0) {
      opportunities.push(`Leverage successful but underutilized approaches in ${underutilizedPatterns.map(p => p.type).join(', ')}`);
    }
    
    // Find learning opportunities
    const learningOpportunities = this.identifyLearningOpportunities(decisions);
    if (learningOpportunities.length > 0) {
      opportunities.push(`Focus on learning: ${learningOpportunities.join(', ')}`);
    }
    
    // Find optimization opportunities
    const optimizationOpportunities = this.identifyOptimizationOpportunities(patterns);
    if (optimizationOpportunities.length > 0) {
      opportunities.push(`Optimize: ${optimizationOpportunities.join(', ')}`);
    }
    
    return opportunities;
  }

  private calculateDecisionFrequency(decisions: any[]): number {
    if (decisions.length < 2) return 0;
    
    const timeSpan = decisions[0].timestamp.getTime() - decisions[decisions.length - 1].timestamp.getTime();
    const days = timeSpan / (1000 * 60 * 60 * 24);
    const frequency = decisions.length / days;
    
    return Math.min(1, frequency / 7); // Normalize to weekly frequency
  }

  private calculateLearningProgress(decisions: any[]): number {
    if (decisions.length < 3) return 0;
    
    const recentDecisions = decisions.slice(0, Math.floor(decisions.length / 2));
    const olderDecisions = decisions.slice(Math.floor(decisions.length / 2));
    
    const recentSuccess = this.calculateSuccessRate(recentDecisions);
    const olderSuccess = this.calculateSuccessRate(olderDecisions);
    
    return Math.max(0, recentSuccess - olderSuccess);
  }

  private calculateSuccessRate(decisions: any[]): number {
    if (decisions.length === 0) return 0;
    
    const successfulDecisions = decisions.filter(d => 
      d.outcome.toLowerCase().includes('success') ||
      d.outcome.toLowerCase().includes('good') ||
      d.outcome.toLowerCase().includes('great')
    );
    
    return successfulDecisions.length / decisions.length;
  }

  private identifyDecisionGaps(decisions: any[]): string[] {
    const categories = ['technical', 'business', 'team', 'product'];
    const decisionCategories = decisions.map(d => this.categorizeDecision(d.decision));
    const gaps = categories.filter(cat => !decisionCategories.includes(cat));
    
    return gaps;
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

  private calculateConsistency(decisions: any[]): number {
    if (decisions.length < 3) return 1;
    
    const categories = decisions.map(d => this.categorizeDecision(d.decision));
    const categoryCounts = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxCount = Math.max(...Object.values(categoryCounts));
    const totalCount = decisions.length;
    
    return maxCount / totalCount;
  }

  private identifyLearningOpportunities(decisions: any[]): string[] {
    const opportunities = [];
    
    // Check for decision frequency by category
    const categories = decisions.map(d => this.categorizeDecision(d.decision));
    const categoryCounts = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalDecisions = decisions.length;
    const underRepresented = Object.entries(categoryCounts)
      .filter(([_, count]) => count / totalDecisions < 0.2)
      .map(([category, _]) => category);
    
    if (underRepresented.length > 0) {
      opportunities.push(`More experience in ${underRepresented.join(', ')}`);
    }
    
    return opportunities;
  }

  private identifyOptimizationOpportunities(patterns: any[]): string[] {
    const opportunities = [];
    
    // Find patterns with medium success rates that could be improved
    const mediumPatterns = patterns.filter(p => p.successRate >= 0.4 && p.successRate <= 0.6);
    if (mediumPatterns.length > 0) {
      opportunities.push(`Improve ${mediumPatterns.map(p => p.type).join(', ')} decision-making`);
    }
    
    // Find high-frequency but low-success patterns
    const frequentLowSuccess = patterns.filter(p => p.frequency > 3 && p.successRate < 0.4);
    if (frequentLowSuccess.length > 0) {
      opportunities.push(`Reconsider approach to ${frequentLowSuccess.map(p => p.type).join(', ')}`);
    }
    
    return opportunities;
  }

  private generateSummary(strengths: string[], weaknesses: string[], opportunities: string[]): string {
    let summary = 'Based on your decision history and patterns, here\'s your strategic analysis:\n\n';
    
    if (strengths.length > 0) {
      summary += `**Strengths:** You excel in ${strengths.join(', ')}.\n\n`;
    }
    
    if (weaknesses.length > 0) {
      summary += `**Areas for Improvement:** ${weaknesses.join(', ')}.\n\n`;
    }
    
    if (opportunities.length > 0) {
      summary += `**Opportunities:** ${opportunities.join(', ')}.`;
    }
    
    return summary;
  }
}
