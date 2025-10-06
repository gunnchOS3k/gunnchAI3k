import { LearningEngine } from './learning';
import { DatabaseManager } from './database';

export interface Suggestions {
  summary: string;
  actions: string[];
  priority: string;
  confidence: number;
}

export interface Optimizations {
  summary: string;
  quickWins: string[];
  longTerm: string[];
}

export class StrategicPlanner {
  private learningEngine: LearningEngine;
  private db: DatabaseManager;

  constructor(learningEngine: LearningEngine) {
    this.learningEngine = learningEngine;
    this.db = learningEngine['db'];
  }

  async generateSuggestions(situation: string): Promise<Suggestions> {
    const decisions = await this.db.getDecisions();
    const patterns = await this.db.getPatterns();
    
    const relevantPatterns = this.findRelevantPatterns(situation, patterns);
    const actions = this.generateActions(situation, relevantPatterns, decisions);
    const priority = this.determinePriority(situation, relevantPatterns);
    const confidence = this.calculateConfidence(relevantPatterns, decisions);
    
    const summary = this.generateSuggestionSummary(situation, actions, priority);
    
    return {
      summary,
      actions,
      priority,
      confidence
    };
  }

  async getOptimizations(area?: string): Promise<Optimizations> {
    const decisions = await this.db.getDecisions();
    const patterns = await this.db.getPatterns();
    const tasks = await this.db.getTasks();
    
    const quickWins = this.identifyQuickWins(decisions, patterns, tasks, area);
    const longTerm = this.identifyLongTermOptimizations(decisions, patterns, tasks, area);
    
    const summary = this.generateOptimizationSummary(quickWins, longTerm);
    
    return {
      summary,
      quickWins,
      longTerm
    };
  }

  private findRelevantPatterns(situation: string, patterns: any[]): any[] {
    const situationLower = situation.toLowerCase();
    
    return patterns.filter(pattern => {
      const descriptionLower = pattern.description.toLowerCase();
      const typeLower = pattern.type.toLowerCase();
      
      return situationLower.includes(typeLower) ||
             descriptionLower.includes(situationLower) ||
             situationLower.includes(descriptionLower);
    });
  }

  private generateActions(situation: string, patterns: any[], decisions: any[]): string[] {
    const actions = [];
    
    // Get successful patterns for similar situations
    const successfulPatterns = patterns.filter(p => p.successRate > 0.7);
    if (successfulPatterns.length > 0) {
      actions.push(`Apply successful ${successfulPatterns.map(p => p.type).join(', ')} strategies`);
    }
    
    // Get specific recommendations from patterns
    const recommendations = patterns.flatMap(p => p.recommendations);
    if (recommendations.length > 0) {
      actions.push(...recommendations.slice(0, 3));
    }
    
    // Generate situation-specific actions
    const situationActions = this.generateSituationSpecificActions(situation);
    actions.push(...situationActions);
    
    // Add learning-based actions
    const learningActions = this.generateLearningBasedActions(decisions);
    actions.push(...learningActions);
    
    return actions.slice(0, 5); // Limit to top 5 actions
  }

  private generateSituationSpecificActions(situation: string): string[] {
    const actions = [];
    const situationLower = situation.toLowerCase();
    
    if (situationLower.includes('technical') || situationLower.includes('code')) {
      actions.push('Review technical requirements and constraints');
      actions.push('Consider prototyping or proof of concept');
      actions.push('Seek technical expertise if needed');
    }
    
    if (situationLower.includes('business') || situationLower.includes('strategy')) {
      actions.push('Analyze market conditions and competition');
      actions.push('Define clear success metrics');
      actions.push('Consider stakeholder impact');
    }
    
    if (situationLower.includes('team') || situationLower.includes('management')) {
      actions.push('Assess team capabilities and capacity');
      actions.push('Consider team dynamics and communication');
      actions.push('Plan for knowledge transfer if needed');
    }
    
    if (situationLower.includes('product') || situationLower.includes('user')) {
      actions.push('Gather user feedback and requirements');
      actions.push('Consider user experience implications');
      actions.push('Plan for testing and validation');
    }
    
    return actions;
  }

  private generateLearningBasedActions(decisions: any[]): string[] {
    const actions = [];
    
    // Analyze recent decision patterns
    const recentDecisions = decisions.slice(0, 10);
    const successRate = this.calculateRecentSuccessRate(recentDecisions);
    
    if (successRate < 0.5) {
      actions.push('Consider alternative approaches based on past failures');
      actions.push('Seek additional input before deciding');
    } else {
      actions.push('Leverage successful decision patterns');
      actions.push('Build on previous successes');
    }
    
    return actions;
  }

  private calculateRecentSuccessRate(decisions: any[]): number {
    if (decisions.length === 0) return 0;
    
    const successfulDecisions = decisions.filter(d => 
      d.outcome.toLowerCase().includes('success') ||
      d.outcome.toLowerCase().includes('good') ||
      d.outcome.toLowerCase().includes('great')
    );
    
    return successfulDecisions.length / decisions.length;
  }

  private determinePriority(situation: string, patterns: any[]): string {
    const situationLower = situation.toLowerCase();
    
    // High priority indicators
    if (situationLower.includes('urgent') || situationLower.includes('critical')) {
      return 'High';
    }
    
    if (situationLower.includes('deadline') || situationLower.includes('timeline')) {
      return 'High';
    }
    
    // Medium priority indicators
    if (situationLower.includes('important') || situationLower.includes('significant')) {
      return 'Medium';
    }
    
    // Check pattern success rates
    const avgSuccessRate = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length 
      : 0.5;
    
    if (avgSuccessRate < 0.3) {
      return 'High';
    } else if (avgSuccessRate < 0.6) {
      return 'Medium';
    }
    
    return 'Low';
  }

  private calculateConfidence(patterns: any[], decisions: any[]): number {
    if (patterns.length === 0) return 30;
    
    const avgSuccessRate = patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length;
    const patternConfidence = avgSuccessRate * 100;
    
    const decisionConfidence = Math.min(90, decisions.length * 5);
    
    return Math.round((patternConfidence + decisionConfidence) / 2);
  }

  private generateSuggestionSummary(situation: string, actions: string[], priority: string): string {
    let summary = `Based on your situation: "${situation}"\n\n`;
    summary += `**Priority Level:** ${priority}\n\n`;
    summary += `**Recommended Actions:**\n${actions.map((action, index) => `${index + 1}. ${action}`).join('\n')}`;
    
    return summary;
  }

  private identifyQuickWins(decisions: any[], patterns: any[], tasks: any[], area?: string): string[] {
    const quickWins = [];
    
    // Find high-success, low-effort patterns
    const quickWinPatterns = patterns.filter(p => p.successRate > 0.8 && p.frequency < 5);
    if (quickWinPatterns.length > 0) {
      quickWins.push(`Leverage ${quickWinPatterns.map(p => p.type).join(', ')} approaches more frequently`);
    }
    
    // Find incomplete tasks that can be completed quickly
    const incompleteTasks = tasks.filter(t => !t.completed);
    if (incompleteTasks.length > 0) {
      quickWins.push(`Complete ${Math.min(3, incompleteTasks.length)} pending tasks`);
    }
    
    // Find decision-making improvements
    const decisionGaps = this.identifyDecisionGaps(decisions);
    if (decisionGaps.length > 0) {
      quickWins.push(`Gain experience in ${decisionGaps.slice(0, 2).join(', ')}`);
    }
    
    return quickWins;
  }

  private identifyLongTermOptimizations(decisions: any[], patterns: any[], tasks: any[], area?: string): string[] {
    const longTerm = [];
    
    // Improve decision-making consistency
    const consistency = this.calculateDecisionConsistency(decisions);
    if (consistency < 0.7) {
      longTerm.push('Develop consistent decision-making framework');
    }
    
    // Build expertise in weak areas
    const weakPatterns = patterns.filter(p => p.successRate < 0.4);
    if (weakPatterns.length > 0) {
      longTerm.push(`Build expertise in ${weakPatterns.map(p => p.type).join(', ')}`);
    }
    
    // Establish learning systems
    longTerm.push('Implement systematic learning and feedback loops');
    longTerm.push('Create knowledge base of successful strategies');
    longTerm.push('Develop risk assessment and mitigation processes');
    
    return longTerm;
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

  private calculateDecisionConsistency(decisions: any[]): number {
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

  private generateOptimizationSummary(quickWins: string[], longTerm: string[]): string {
    let summary = 'Optimization recommendations based on your patterns and performance:\n\n';
    
    if (quickWins.length > 0) {
      summary += `**Quick Wins (${quickWins.length}):** Immediate improvements you can implement\n`;
    }
    
    if (longTerm.length > 0) {
      summary += `**Long-term Optimizations (${longTerm.length}):** Strategic improvements for sustained growth\n`;
    }
    
    return summary;
  }
}
