// Course Material Integration System
// Handles integration of actual course materials (PDFs, notes, problems)

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface CourseFile {
  name: string;
  path: string;
  type: 'pdf' | 'docx' | 'txt' | 'md';
  subject: 'probability' | 'robotics';
  content?: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
    topics?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

export class CourseMaterialIntegration {
  private courseMaterialsPath: string;
  private materials: Map<string, CourseFile[]> = new Map();

  constructor(courseMaterialsPath: string = './course-materials') {
    this.courseMaterialsPath = courseMaterialsPath;
    this.initializeMaterials();
  }

  private initializeMaterials() {
    // Initialize with sample course materials structure
    this.materials.set('probability', [
      {
        name: 'probability_notes.pdf',
        path: join(this.courseMaterialsPath, 'probability', 'notes.pdf'),
        type: 'pdf',
        subject: 'probability',
        metadata: {
          topics: ['basic_probability', 'conditional_probability', 'bayes_theorem', 'random_variables'],
          difficulty: 'intermediate'
        }
      },
      {
        name: 'probability_problems.pdf',
        path: join(this.courseMaterialsPath, 'probability', 'problems.pdf'),
        type: 'pdf',
        subject: 'probability',
        metadata: {
          topics: ['practice_problems', 'conditional_probability', 'bayes_theorem', 'independence'],
          difficulty: 'intermediate'
        }
      }
    ]);

    this.materials.set('robotics', [
      {
        name: 'robotics_notes.pdf',
        path: join(this.courseMaterialsPath, 'robotics', 'notes.pdf'),
        type: 'pdf',
        subject: 'robotics',
        metadata: {
          topics: ['kinematics', 'dynamics', 'control_systems', 'sensors'],
          difficulty: 'intermediate'
        }
      },
      {
        name: 'robotics_problems.pdf',
        path: join(this.courseMaterialsPath, 'robotics', 'problems.pdf'),
        type: 'pdf',
        subject: 'robotics',
        metadata: {
          topics: ['practice_problems', 'kinematics', 'dynamics', 'control'],
          difficulty: 'intermediate'
        }
      }
    ]);
  }

  // Load course materials from files
  async loadCourseMaterials(subject: string): Promise<CourseFile[]> {
    const materials = this.materials.get(subject) || [];
    const loadedMaterials: CourseFile[] = [];

    for (const material of materials) {
      if (existsSync(material.path)) {
        try {
          const content = readFileSync(material.path, 'utf-8');
          loadedMaterials.push({
            ...material,
            content
          });
        } catch (error) {
          console.error(`Failed to load ${material.name}:`, error);
        }
      } else {
        console.warn(`Course material not found: ${material.path}`);
      }
    }

    return loadedMaterials;
  }

  // Extract topics from course materials
  extractTopics(materials: CourseFile[]): string[] {
    const allTopics = new Set<string>();
    
    materials.forEach(material => {
      if (material.metadata?.topics) {
        material.metadata.topics.forEach(topic => allTopics.add(topic));
      }
    });

    return Array.from(allTopics);
  }

  // Generate study materials based on course content
  async generateStudyMaterials(subject: string, topics: string[]): Promise<any> {
    const materials = await this.loadCourseMaterials(subject);
    const relevantMaterials = materials.filter(material => 
      material.metadata?.topics?.some(topic => topics.includes(topic))
    );

    return {
      materials: relevantMaterials,
      topics: this.extractTopics(relevantMaterials),
      flashcards: this.generateFlashcards(relevantMaterials),
      practiceProblems: this.generatePracticeProblems(relevantMaterials),
      studyGuide: this.generateStudyGuide(relevantMaterials, topics)
    };
  }

  private generateFlashcards(materials: CourseFile[]): any[] {
    const flashcards: any[] = [];
    
    materials.forEach(material => {
      if (material.metadata?.topics) {
        material.metadata.topics.forEach(topic => {
          flashcards.push({
            id: `flashcard_${topic}_${Date.now()}`,
            front: `What is ${topic}?`,
            back: `Definition and explanation of ${topic} based on course materials.`,
            subject: material.subject,
            topic: topic,
            difficulty: material.metadata?.difficulty || 'medium',
            mastery: 0,
            lastReviewed: new Date()
          });
        });
      }
    });

    return flashcards;
  }

  private generatePracticeProblems(materials: CourseFile[]): any[] {
    const problems: any[] = [];
    
    materials.forEach(material => {
      if (material.metadata?.topics) {
        material.metadata.topics.forEach(topic => {
          problems.push({
            id: `problem_${topic}_${Date.now()}`,
            question: `Practice problem related to ${topic}`,
            subject: material.subject,
            topic: topic,
            difficulty: material.metadata?.difficulty || 'medium',
            hints: [`Think about the fundamentals of ${topic}`, `Consider the key concepts`],
            solution: `Step-by-step solution for ${topic} problem`,
            commonMistakes: [`Not understanding the basics of ${topic}`, `Rushing through the problem`]
          });
        });
      }
    });

    return problems;
  }

  private generateStudyGuide(materials: CourseFile[], topics: string[]): string {
    return `
# Study Guide for ${materials[0]?.subject || 'Course'}

## Topics to Master:
${topics.map(topic => `• ${topic}`).join('\n')}

## Study Strategy:
1. **Review Fundamentals** - Make sure you understand the basics
2. **Practice Problems** - Work through examples step by step
3. **Active Recall** - Test yourself without looking at notes
4. **Spaced Repetition** - Review at increasing intervals

## Key Concepts:
${materials.map(material => 
  material.metadata?.topics?.map(topic => `• ${topic}`).join('\n')
).join('\n')}

## Practice Resources:
• Flashcards for memorization
• Practice problems with solutions
• Step-by-step explanations
• Common mistakes to avoid

Remember: Every expert was once a beginner! You've got this! 💪✨
    `;
  }

  // Get course materials by subject
  getCourseMaterials(subject: string): CourseFile[] {
    return this.materials.get(subject) || [];
  }

  // Add new course material
  addCourseMaterial(subject: string, material: CourseFile): void {
    if (!this.materials.has(subject)) {
      this.materials.set(subject, []);
    }
    this.materials.get(subject)!.push(material);
  }

  // Update course material
  updateCourseMaterial(subject: string, materialId: string, updates: Partial<CourseFile>): boolean {
    const materials = this.materials.get(subject) || [];
    const materialIndex = materials.findIndex(m => m.name === materialId);
    
    if (materialIndex !== -1) {
      materials[materialIndex] = { ...materials[materialIndex], ...updates };
      return true;
    }
    
    return false;
  }

  // Remove course material
  removeCourseMaterial(subject: string, materialId: string): boolean {
    const materials = this.materials.get(subject) || [];
    const materialIndex = materials.findIndex(m => m.name === materialId);
    
    if (materialIndex !== -1) {
      materials.splice(materialIndex, 1);
      return true;
    }
    
    return false;
  }

  // Get all subjects
  getAllSubjects(): string[] {
    return Array.from(this.materials.keys());
  }

  // Get materials by topic
  getMaterialsByTopic(subject: string, topic: string): CourseFile[] {
    const materials = this.materials.get(subject) || [];
    return materials.filter(material => 
      material.metadata?.topics?.includes(topic)
    );
  }

  // Get difficulty distribution
  getDifficultyDistribution(subject: string): Record<string, number> {
    const materials = this.materials.get(subject) || [];
    const distribution: Record<string, number> = {};
    
    materials.forEach(material => {
      const difficulty = material.metadata?.difficulty || 'unknown';
      distribution[difficulty] = (distribution[difficulty] || 0) + 1;
    });
    
    return distribution;
  }
}

