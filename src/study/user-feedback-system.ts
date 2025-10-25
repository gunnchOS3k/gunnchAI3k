// User Feedback System for Course Material Classification
// Handles user input when gunnchAI3k is uncertain about course classification

import { Message } from 'discord.js';

export interface UserFeedback {
  fileName: string;
  userSubject: string;
  userId: string;
  timestamp: Date;
  confidence: number;
  reasoning: string;
}

export interface ClassificationRequest {
  fileName: string;
  currentClassification: string;
  confidence: number;
  reasoning: string[];
  visualAnalysisResults?: any[];
  needsUserInput: boolean;
}

export class UserFeedbackSystem {
  private feedbackHistory: Map<string, UserFeedback[]> = new Map();
  private pendingClassifications: Map<string, ClassificationRequest> = new Map();

  // Request user input for uncertain classification
  async requestUserClassification(
    message: Message, 
    classificationRequest: ClassificationRequest
  ): Promise<void> {
    const userId = message.author.id;
    const userName = message.author.username;

    // Store the pending classification
    this.pendingClassifications.set(classificationRequest.fileName, classificationRequest);

    // Create user-friendly message
    const feedbackMessage = this.createFeedbackMessage(classificationRequest, userName);
    
    await message.reply(feedbackMessage);
  }

  // Create feedback message for user
  private createFeedbackMessage(request: ClassificationRequest, userName: string): string {
    let message = `🤔 **Course Classification Help Needed!** 🤔\n\n`;
    message += `Hey ${userName}! I need your help with this course material:\n\n`;
    message += `📄 **File:** ${request.fileName}\n`;
    message += `🎯 **Current Classification:** ${request.currentClassification}\n`;
    message += `📊 **Confidence:** ${(request.confidence * 100).toFixed(1)}%\n\n`;

    if (request.reasoning.length > 0) {
      message += `🧠 **My Analysis:**\n`;
      request.reasoning.forEach(reason => {
        message += `• ${reason}\n`;
      });
      message += `\n`;
    }

    if (request.visualAnalysisResults && request.visualAnalysisResults.length > 0) {
      message += `🔍 **Visual Analysis Results:**\n`;
      const results = request.visualAnalysisResults.slice(0, 2); // Show first 2 pages
      results.forEach((result, index) => {
        message += `**Page ${result.pageNumber}:**\n`;
        message += `• Subject: ${result.suggestedSubject}\n`;
        message += `• Confidence: ${(result.confidence * 100).toFixed(1)}%\n`;
        if (result.courseName) {
          message += `• Course: ${result.courseName}\n`;
        }
        if (result.visualElements.length > 0) {
          message += `• Visual Elements: ${result.visualElements.join(', ')}\n`;
        }
        message += `\n`;
      });
    }

    message += `❓ **Please help me classify this correctly:**\n\n`;
    message += `**For Probability:** Reply with \`@gunnchAI3k classify ${request.fileName} as probability\`\n`;
    message += `**For Robotics:** Reply with \`@gunnchAI3k classify ${request.fileName} as robotics\`\n`;
    message += `**For Other Subject:** Reply with \`@gunnchAI3k classify ${request.fileName} as [subject name]\`\n\n`;
    message += `💡 **This helps me learn and improve my classification accuracy!** 💡`;

    return message;
  }

  // Process user feedback
  async processUserFeedback(message: Message): Promise<boolean> {
    const content = message.content.toLowerCase();
    const userId = message.author.id;

    // Check if this is a classification command
    const classificationMatch = content.match(/classify\s+(.+?)\s+as\s+(.+)/);
    if (!classificationMatch) {
      return false;
    }

    const fileName = classificationMatch[1].trim();
    const userSubject = classificationMatch[2].trim();

    // Find the pending classification
    const pendingRequest = this.pendingClassifications.get(fileName);
    if (!pendingRequest) {
      await message.reply(`❌ I don't have a pending classification request for "${fileName}". Please make sure the filename is correct.`);
      return false;
    }

    // Record the feedback
    const feedback: UserFeedback = {
      fileName,
      userSubject,
      userId,
      timestamp: new Date(),
      confidence: pendingRequest.confidence,
      reasoning: `User classified as ${userSubject}`
    };

    // Store feedback
    if (!this.feedbackHistory.has(userId)) {
      this.feedbackHistory.set(userId, []);
    }
    this.feedbackHistory.get(userId)!.push(feedback);

    // Remove from pending
    this.pendingClassifications.delete(fileName);

    // Acknowledge the feedback
    await message.reply(`✅ **Classification Updated!** ✅\n\n📄 **File:** ${fileName}\n🎯 **Subject:** ${userSubject}\n👤 **User:** ${message.author.username}\n\nThank you for helping me learn! I'll use this information to improve my future classifications. 🧠✨`);

    return true;
  }

  // Get feedback history for a user
  getUserFeedbackHistory(userId: string): UserFeedback[] {
    return this.feedbackHistory.get(userId) || [];
  }

  // Get all pending classifications
  getPendingClassifications(): ClassificationRequest[] {
    return Array.from(this.pendingClassifications.values());
  }

  // Check if a file needs user input
  needsUserInput(fileName: string): boolean {
    return this.pendingClassifications.has(fileName);
  }

  // Get classification statistics
  getClassificationStats(): any {
    const allFeedback = Array.from(this.feedbackHistory.values()).flat();
    const totalFeedback = allFeedback.length;
    
    const subjectCounts = allFeedback.reduce((acc, feedback) => {
      acc[feedback.userSubject] = (acc[feedback.userSubject] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageConfidence = allFeedback.length > 0 
      ? allFeedback.reduce((sum, feedback) => sum + feedback.confidence, 0) / allFeedback.length 
      : 0;

    return {
      totalFeedback,
      subjectCounts,
      averageConfidence,
      pendingCount: this.pendingClassifications.size
    };
  }

  // Learn from user feedback to improve future classifications
  learnFromFeedback(): any {
    const allFeedback = Array.from(this.feedbackHistory.values()).flat();
    
    // Analyze patterns in user corrections
    const corrections = allFeedback.filter(feedback => 
      feedback.reasoning.includes('User classified as')
    );

    const learningInsights = {
      totalCorrections: corrections.length,
      commonCorrections: this.analyzeCommonCorrections(corrections),
      accuracyImprovements: this.calculateAccuracyImprovements(corrections)
    };

    return learningInsights;
  }

  // Analyze common correction patterns
  private analyzeCommonCorrections(corrections: UserFeedback[]): any {
    const patterns: Record<string, number> = {};
    
    corrections.forEach(correction => {
      const key = `${correction.fileName} -> ${correction.userSubject}`;
      patterns[key] = (patterns[key] || 0) + 1;
    });

    return patterns;
  }

  // Calculate accuracy improvements
  private calculateAccuracyImprovements(corrections: UserFeedback[]): any {
    const improvements = {
      probabilityAccuracy: 0,
      roboticsAccuracy: 0,
      overallAccuracy: 0
    };

    // This would analyze the corrections to determine accuracy improvements
    // For now, return placeholder values
    return improvements;
  }

  // Create a summary of the feedback system
  getFeedbackSummary(): string {
    const stats = this.getClassificationStats();
    const pending = this.getPendingClassifications();
    
    let summary = `📊 **User Feedback System Summary** 📊\n\n`;
    summary += `**Total User Classifications:** ${stats.totalFeedback}\n`;
    summary += `**Average Confidence:** ${(stats.averageConfidence * 100).toFixed(1)}%\n`;
    summary += `**Pending Classifications:** ${stats.pendingCount}\n\n`;

    if (Object.keys(stats.subjectCounts).length > 0) {
      summary += `**Subject Distribution:**\n`;
      Object.entries(stats.subjectCounts).forEach(([subject, count]) => {
        summary += `• ${subject}: ${count} classifications\n`;
      });
      summary += `\n`;
    }

    if (pending.length > 0) {
      summary += `**Pending Classifications:**\n`;
      pending.forEach(request => {
        summary += `• ${request.fileName} (${request.currentClassification})\n`;
      });
    }

    return summary;
  }
}
