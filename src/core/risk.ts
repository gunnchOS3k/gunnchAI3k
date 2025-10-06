import { LearningEngine } from './learning';
import { DatabaseManager } from './database';

export interface RiskAssessment {
  summary: string;
  highRisks: string[];
  mediumRisks: string[];
  mitigation: string[];
}

export class RiskAssessment {
  private learningEngine: LearningEngine;
  private db: DatabaseManager;

  constructor(learningEngine: LearningEngine) {
    this.learningEngine = learningEngine;
    this.db = learningEngine['db'];
  }

  async assessRisks(project?: string): Promise<RiskAssessment> {
    const decisions = await this.db.getDecisions();
    const patterns = await this.db.getPatterns();
    const tasks = await this.db.getTasks();
    
    const highRisks = this.identifyHighRisks(decisions, patterns, tasks);
    const mediumRisks = this.identifyMediumRisks(decisions, patterns, tasks);
    const mitigation = this.generateMitigationStrategies(highRisks, mediumRisks);
    
    const summary = this.generateRiskSummary(highRisks, mediumRisks);
    
    return {
      summary,
      highRisks,
      mediumRisks,
      mitigation
    };
  }

  private identifyHighRisks(decisions: any[], patterns: any[], tasks: any[]): string[] {
    const risks = [];
    
    // Check for repeated failure patterns
    const failurePatterns = patterns.filter(p => p.successRate < 0.2 && p.frequency > 2);
    if (failurePatterns.length > 0) {
      risks.push(`Repeated failures in ${failurePatterns.map(p => p.type).join(', ')} - consider alternative approaches`);
    }
    
    // Check for overdue tasks
    const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && !t.completed);
    if (overdueTasks.length > 0) {
      risks.push(`${overdueTasks.length} overdue tasks - potential impact on project timeline`);
    }
    
    // Check for decision gaps
    const decisionGaps = this.identifyDecisionGaps(decisions);
    if (decisionGaps.length > 0) {
      risks.push(`Limited experience in ${decisionGaps.join(', ')} - higher risk of poor decisions`);
    }
    
    // Check for recent negative outcomes
    const recentDecisions = decisions.slice(0, 5);
    const negativeOutcomes = recentDecisions.filter(d => 
      d.outcome.toLowerCase().includes('failure') ||
      d.outcome.toLowerCase().includes('bad') ||
      d.outcome.toLowerCase().includes('problem')
    );
    if (negativeOutcomes.length >= 3) {
      risks.push('Recent pattern of negative outcomes - review decision-making process');
    }
    
    return risks;
  }

  private identifyMediumRisks(decisions: any[], patterns: any[], tasks: any[]): string[] {
    const risks = [];
    
    // Check for medium success patterns
    const mediumPatterns = patterns.filter(p => p.successRate >= 0.3 && p.successRate <= 0.5);
    if (mediumPatterns.length > 0) {
      risks.push(`Uncertain outcomes in ${mediumPatterns.map(p => p.type).join(', ')} - monitor closely`);
    }
    
    // Check for upcoming deadlines
    const upcomingDeadlines = tasks.filter(t => 
      t.deadline && 
      new Date(t.deadline) > new Date() && 
      new Date(t.deadline) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && 
      !t.completed
    );
    if (upcomingDeadlines.length > 0) {
      risks.push(`${upcomingDeadlines.length} tasks due within a week - ensure adequate resources`);
    }
    
    // Check for decision consistency
    const consistency = this.calculateDecisionConsistency(decisions);
    if (consistency < 0.6) {
      risks.push('Inconsistent decision-making approach - may lead to unpredictable outcomes');
    }
    
    // Check for learning stagnation
    const learningProgress = this.calculateLearningProgress(decisions);
    if (learningProgress < 0.1) {
      risks.push('Limited learning progression - may repeat past mistakes');
    }
    
    return risks;
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

  private calculateLearningProgress(decisions: any[]): number {
    if (decisions.length < 6) return 0;
    
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

  private generateMitigationStrategies(highRisks: string[], mediumRisks: string[]): string[] {
    const strategies = [];
    
    if (highRisks.length > 0) {
      strategies.push('Immediate action required for high-risk items');
      strategies.push('Seek additional expertise or consultation');
      strategies.push('Develop contingency plans for critical decisions');
    }
    
    if (mediumRisks.length > 0) {
      strategies.push('Monitor medium-risk items closely');
      strategies.push('Set up regular check-ins and progress reviews');
      strategies.push('Prepare alternative approaches');
    }
    
    strategies.push('Continue learning from past decisions');
    strategies.push('Document lessons learned for future reference');
    strategies.push('Regular risk assessment and pattern analysis');
    
    return strategies;
  }

  private generateRiskSummary(highRisks: string[], mediumRisks: string[]): string {
    let summary = 'Risk assessment based on your decision history and current projects:\n\n';
    
    if (highRisks.length > 0) {
      summary += `**High Priority Risks (${highRisks.length}):** Immediate attention required\n`;
    }
    
    if (mediumRisks.length > 0) {
      summary += `**Medium Priority Risks (${mediumRisks.length}):** Monitor and prepare mitigation\n`;
    }
    
    if (highRisks.length === 0 && mediumRisks.length === 0) {
      summary += '**Low Risk Environment:** Continue current approach with regular monitoring';
    }
    
    return summary;
  }
}
