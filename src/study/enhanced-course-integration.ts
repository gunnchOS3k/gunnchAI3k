// Enhanced Course Material Integration with Visual Analysis
// Uses PDF visual analysis for better course classification

import { CourseMaterialIntegration } from './course-integration';
import { PDFVisualAnalyzer, PDFAnalysisResult, CourseClassification } from './pdf-visual-analyzer';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface EnhancedCourseFile {
  name: string;
  path: string;
  type: 'pdf' | 'docx' | 'txt' | 'md';
  subject: 'probability' | 'robotics' | 'uncertain';
  content?: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
    topics?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    confidence?: number;
    courseName?: string;
    visualAnalysisResults?: PDFAnalysisResult[];
  };
  needsUserInput?: boolean;
  userClassification?: string;
}

export class EnhancedCourseMaterialIntegration extends CourseMaterialIntegration {
  private visualAnalyzer: PDFVisualAnalyzer;
  private userClassifications: Map<string, string> = new Map();

  constructor(courseMaterialsPath: string = './') {
    super(courseMaterialsPath);
    this.visualAnalyzer = new PDFVisualAnalyzer();
  }

  // Enhanced course material loading with visual analysis
  async loadCourseMaterialsWithAnalysis(subject?: string): Promise<EnhancedCourseFile[]> {
    const allMaterials = this.materials.get('probability') || [];
    const roboticsMaterials = this.materials.get('robotics') || [];
    const combinedMaterials = [...allMaterials, ...roboticsMaterials];
    
    const enhancedMaterials: EnhancedCourseFile[] = [];

    for (const material of combinedMaterials) {
      if (existsSync(material.path)) {
        try {
          let enhancedMaterial: EnhancedCourseFile = {
            ...material,
            subject: material.subject as 'probability' | 'robotics' | 'uncertain',
            content: '',
            metadata: {
              ...material.metadata,
              confidence: 0
            }
          };

          // If it's a PDF, perform visual analysis
          if (material.type === 'pdf') {
            console.log(`🔍 Analyzing PDF: ${material.name}`);
            
            try {
              const analysisResults = await this.visualAnalyzer.analyzePDF(material.path, 3);
              const overallClassification = this.visualAnalyzer.getOverallClassification(analysisResults);
              
              enhancedMaterial.subject = overallClassification.subject;
              enhancedMaterial.metadata!.confidence = overallClassification.confidence;
              enhancedMaterial.metadata!.visualAnalysisResults = analysisResults;
              enhancedMaterial.needsUserInput = overallClassification.needsUserInput;
              
              if (overallClassification.courseName) {
                enhancedMaterial.metadata!.courseName = overallClassification.courseName;
              }

              // Generate content based on analysis
              enhancedMaterial.content = this.generateContentFromAnalysis(analysisResults, material);
              
              console.log(`✅ Analysis complete for ${material.name}`);
              console.log(`   Subject: ${overallClassification.subject}`);
              console.log(`   Confidence: ${overallClassification.confidence.toFixed(2)}`);
              console.log(`   Needs user input: ${overallClassification.needsUserInput}`);
              
            } catch (error) {
              console.error(`Error analyzing ${material.name}:`, error);
              // Fallback to basic content
              enhancedMaterial.content = this.generateBasicContent(material);
            }
          } else {
            // For non-PDF files, use basic content generation
            enhancedMaterial.content = this.generateBasicContent(material);
          }

          // Filter by subject if specified
          if (!subject || enhancedMaterial.subject === subject || enhancedMaterial.subject === 'uncertain') {
            enhancedMaterials.push(enhancedMaterial);
          }

        } catch (error) {
          console.error(`Failed to load ${material.name}:`, error);
        }
      } else {
        console.warn(`Course material not found: ${material.path}`);
      }
    }

    return enhancedMaterials;
  }

  // Generate content from visual analysis results
  private generateContentFromAnalysis(analysisResults: PDFAnalysisResult[], material: any): string {
    const totalPages = analysisResults.length;
    const probabilityPages = analysisResults.filter(r => r.suggestedSubject === 'probability').length;
    const roboticsPages = analysisResults.filter(r => r.suggestedSubject === 'robotics').length;
    const uncertainPages = analysisResults.filter(r => r.suggestedSubject === 'uncertain').length;

    let content = `PDF Content: ${material.name}\n\n`;
    content += `Visual Analysis Results:\n`;
    content += `- Total pages analyzed: ${totalPages}\n`;
    content += `- Probability pages: ${probabilityPages}\n`;
    content += `- Robotics pages: ${roboticsPages}\n`;
    content += `- Uncertain pages: ${uncertainPages}\n\n`;

    // Add extracted text from first few pages
    const extractedTexts = analysisResults.slice(0, 2).map(r => r.extractedText).filter(Boolean);
    if (extractedTexts.length > 0) {
      content += `Extracted Text (first 2 pages):\n`;
      content += extractedTexts.join('\n\n---\n\n');
      content += '\n\n';
    }

    // Add visual elements
    const allVisualElements = analysisResults.flatMap(r => r.visualElements);
    const uniqueVisualElements = [...new Set(allVisualElements)];
    if (uniqueVisualElements.length > 0) {
      content += `Visual Elements Detected: ${uniqueVisualElements.join(', ')}\n\n`;
    }

    // Add course names found
    const courseNames = analysisResults.map(r => r.courseName).filter(Boolean);
    const uniqueCourseNames = [...new Set(courseNames)];
    if (uniqueCourseNames.length > 0) {
      content += `Course Names Found: ${uniqueCourseNames.join(', ')}\n\n`;
    }

    content += `Analysis Confidence: ${analysisResults[0]?.confidence.toFixed(2) || 'N/A'}\n`;
    content += `Suggested Subject: ${analysisResults[0]?.suggestedSubject || 'Unknown'}\n\n`;
    
    content += `This PDF has been analyzed using visual recognition to better understand its content and classify it appropriately.`;

    return content;
  }

  // Generate basic content for non-PDF files
  private generateBasicContent(material: any): string {
    return `PDF Content: ${material.name}\n\nTopics: ${material.metadata?.topics?.join(', ') || 'N/A'}\nDifficulty: ${material.metadata?.difficulty || 'N/A'}\n\nThis is a PDF file containing course materials. The actual content would be extracted using PDF parsing libraries.`;
  }

  // Handle user input for uncertain classifications
  async handleUserClassification(fileName: string, userSubject: string): Promise<void> {
    this.userClassifications.set(fileName, userSubject);
    console.log(`✅ User classification recorded: ${fileName} -> ${userSubject}`);
  }

  // Get materials that need user input
  getMaterialsNeedingInput(): EnhancedCourseFile[] {
    // This would return materials that need user classification
    // For now, return empty array as placeholder
    return [];
  }

  // Enhanced flashcard generation with visual analysis
  async generateEnhancedFlashcards(subject: string): Promise<any[]> {
    const materials = await this.loadCourseMaterialsWithAnalysis(subject);
    const flashcards: any[] = [];

    for (const material of materials) {
      if (material.metadata?.visualAnalysisResults) {
        const analysisResults = material.metadata.visualAnalysisResults;
        
        // Create flashcards based on visual analysis
        analysisResults.forEach((result, index) => {
          if (result.extractedText && result.extractedText.length > 50) {
            flashcards.push({
              id: `visual_flashcard_${material.name}_${index}`,
              front: `What concepts are covered in page ${result.pageNumber} of ${material.name}?`,
              back: `Page ${result.pageNumber} covers: ${result.extractedText.substring(0, 200)}...`,
              subject: material.subject,
              topic: material.metadata?.topics?.[0] || 'general',
              confidence: result.confidence,
              visualElements: result.visualElements
            });
          }
        });
      } else {
        // Fallback to basic flashcards
        flashcards.push({
          id: `basic_flashcard_${material.name}`,
          front: `What is covered in ${material.name}?`,
          back: `Topics: ${material.metadata?.topics?.join(', ') || 'N/A'}\nDifficulty: ${material.metadata?.difficulty || 'N/A'}`,
          subject: material.subject,
          topic: material.metadata?.topics?.[0] || 'general'
        });
      }
    }

    return flashcards;
  }

  // Enhanced practice problem generation
  async generateEnhancedPracticeProblems(subject: string): Promise<any[]> {
    const materials = await this.loadCourseMaterialsWithAnalysis(subject);
    const problems: any[] = [];

    for (const material of materials) {
      if (material.metadata?.visualAnalysisResults) {
        const analysisResults = material.metadata.visualAnalysisResults;
        
        // Create problems based on visual analysis
        analysisResults.forEach((result, index) => {
          if (result.extractedText && result.extractedText.includes('problem')) {
            problems.push({
              id: `visual_problem_${material.name}_${index}`,
              question: `Problem from page ${result.pageNumber} of ${material.name}`,
              answer: `Solution involves concepts from: ${result.extractedText.substring(0, 150)}...`,
              difficulty: material.metadata?.difficulty || 'intermediate',
              subject: material.subject,
              confidence: result.confidence,
              visualElements: result.visualElements
            });
          }
        });
      } else {
        // Fallback to basic problems
        problems.push({
          id: `basic_problem_${material.name}`,
          question: `Practice problem based on ${material.name}`,
          answer: `Solution involves: ${material.metadata?.topics?.join(', ') || 'N/A'}`,
          difficulty: material.metadata?.difficulty || 'intermediate',
          subject: material.subject
        });
      }
    }

    return problems;
  }

  // Clean up resources
  cleanup() {
    this.visualAnalyzer.cleanup();
  }
}
