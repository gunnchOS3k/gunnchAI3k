// PDF Visual Analysis System for gunnchAI3k
// Converts PDF pages to images and analyzes content for better course classification

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

export interface PDFAnalysisResult {
  pageNumber: number;
  extractedText: string;
  courseIndicators: {
    probability: number;
    robotics: number;
    uncertain: boolean;
  };
  confidence: number;
  suggestedSubject: string;
  visualElements: string[];
  courseName?: string;
}

export interface CourseClassification {
  subject: 'probability' | 'robotics' | 'uncertain';
  confidence: number;
  reasoning: string[];
  courseName?: string;
  needsUserInput: boolean;
}

export class PDFVisualAnalyzer {
  private tempDir: string;
  private confidenceThreshold: number = 0.7;

  constructor(tempDir: string = './temp/pdf-analysis') {
    this.tempDir = tempDir;
    this.ensureTempDir();
  }

  private ensureTempDir() {
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Convert PDF page to image
  async convertPDFPageToImage(pdfPath: string, pageNumber: number = 1): Promise<string> {
    try {
      const pdf2pic = require('pdf2pic');
      const convert = pdf2pic.fromPath(pdfPath, {
        density: 300,
        saveFilename: `page_${pageNumber}`,
        savePath: this.tempDir,
        format: 'png',
        width: 2000,
        height: 2000
      });

      const result = await convert(pageNumber);
      return result.path;
    } catch (error) {
      console.error('Error converting PDF to image:', error);
      throw new Error(`Failed to convert PDF page ${pageNumber} to image: ${error}`);
    }
  }

  // Analyze image for text content
  async analyzeImageForText(imagePath: string): Promise<string> {
    try {
      const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
        logger: m => console.log(m)
      });
      return text;
    } catch (error) {
      console.error('Error analyzing image for text:', error);
      return '';
    }
  }

  // Analyze image for visual elements
  async analyzeImageForVisualElements(imagePath: string): Promise<string[]> {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      
      const visualElements: string[] = [];
      
      // Analyze for mathematical symbols
      if (this.containsMathematicalSymbols(imagePath)) {
        visualElements.push('mathematical_symbols');
      }
      
      // Analyze for diagrams
      if (this.containsDiagrams(imagePath)) {
        visualElements.push('diagrams');
      }
      
      // Analyze for graphs
      if (this.containsGraphs(imagePath)) {
        visualElements.push('graphs');
      }
      
      // Analyze for equations
      if (this.containsEquations(imagePath)) {
        visualElements.push('equations');
      }
      
      return visualElements;
    } catch (error) {
      console.error('Error analyzing visual elements:', error);
      return [];
    }
  }

  // Check for mathematical symbols
  private containsMathematicalSymbols(imagePath: string): boolean {
    // This would use image analysis to detect mathematical symbols
    // For now, we'll use text analysis as a proxy
    return true; // Placeholder
  }

  // Check for diagrams
  private containsDiagrams(imagePath: string): boolean {
    // This would use image analysis to detect diagrams
    return true; // Placeholder
  }

  // Check for graphs
  private containsGraphs(imagePath: string): boolean {
    // This would use image analysis to detect graphs
    return true; // Placeholder
  }

  // Check for equations
  private containsEquations(imagePath: string): boolean {
    // This would use image analysis to detect equations
    return true; // Placeholder
  }

  // Analyze course content from text
  analyzeCourseContent(text: string): CourseClassification {
    const probabilityKeywords = [
      'probability', 'random variable', 'distribution', 'bayes', 'conditional',
      'statistics', 'variance', 'expectation', 'independence', 'joint probability',
      'marginal', 'posterior', 'prior', 'likelihood', 'binomial', 'normal',
      'exponential', 'poisson', 'uniform', 'gaussian', 'markov', 'chain'
    ];

    const roboticsKeywords = [
      'robotics', 'robot', 'kinematics', 'dynamics', 'control', 'sensor',
      'actuator', 'manipulator', 'end effector', 'joint', 'link', 'dh parameters',
      'jacobian', 'trajectory', 'path planning', 'obstacle avoidance', 'navigation',
      'localization', 'mapping', 'slam', 'computer vision', 'machine learning',
      'neural network', 'reinforcement learning', 'autonomous', 'mobile robot'
    ];

    const courseNamePatterns = [
      /EL\d{4}/g,  // Course codes like EL6303
      /CS\d{4}/g,  // Computer Science courses
      /EE\d{4}/g,  // Electrical Engineering courses
      /MATH\d{4}/g // Mathematics courses
    ];

    // Extract course name
    let courseName: string | undefined;
    for (const pattern of courseNamePatterns) {
      const match = text.match(pattern);
      if (match) {
        courseName = match[0];
        break;
      }
    }

    // Count keyword matches
    const probabilityMatches = probabilityKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    const roboticsMatches = roboticsKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    // Calculate confidence scores
    const totalKeywords = probabilityMatches + roboticsMatches;
    const probabilityScore = totalKeywords > 0 ? probabilityMatches / totalKeywords : 0;
    const roboticsScore = totalKeywords > 0 ? roboticsMatches / totalKeywords : 0;

    // Determine subject and confidence
    let subject: 'probability' | 'robotics' | 'uncertain';
    let confidence: number;
    let reasoning: string[] = [];
    let needsUserInput = false;

    if (probabilityScore > roboticsScore && probabilityScore > this.confidenceThreshold) {
      subject = 'probability';
      confidence = probabilityScore;
      reasoning.push(`Found ${probabilityMatches} probability-related keywords`);
    } else if (roboticsScore > probabilityScore && roboticsScore > this.confidenceThreshold) {
      subject = 'robotics';
      confidence = roboticsScore;
      reasoning.push(`Found ${roboticsMatches} robotics-related keywords`);
    } else {
      subject = 'uncertain';
      confidence = Math.max(probabilityScore, roboticsScore);
      needsUserInput = true;
      reasoning.push('Insufficient confidence to determine subject');
      reasoning.push(`Probability score: ${probabilityScore.toFixed(2)}`);
      reasoning.push(`Robotics score: ${roboticsScore.toFixed(2)}`);
    }

    return {
      subject,
      confidence,
      reasoning,
      courseName,
      needsUserInput
    };
  }

  // Main analysis function
  async analyzePDF(pdfPath: string, maxPages: number = 3): Promise<PDFAnalysisResult[]> {
    const results: PDFAnalysisResult[] = [];

    try {
      for (let page = 1; page <= maxPages; page++) {
        console.log(`🔍 Analyzing PDF page ${page}...`);
        
        // Convert PDF page to image
        const imagePath = await this.convertPDFPageToImage(pdfPath, page);
        
        // Extract text from image
        const extractedText = await this.analyzeImageForText(imagePath);
        
        // Analyze visual elements
        const visualElements = await this.analyzeImageForVisualElements(imagePath);
        
        // Analyze course content
        const classification = this.analyzeCourseContent(extractedText);
        
        const result: PDFAnalysisResult = {
          pageNumber: page,
          extractedText,
          courseIndicators: {
            probability: classification.subject === 'probability' ? classification.confidence : 0,
            robotics: classification.subject === 'robotics' ? classification.confidence : 0,
            uncertain: classification.subject === 'uncertain'
          },
          confidence: classification.confidence,
          suggestedSubject: classification.subject,
          visualElements,
          courseName: classification.courseName
        };

        results.push(result);
        
        console.log(`✅ Page ${page} analysis complete`);
        console.log(`   Subject: ${classification.subject}`);
        console.log(`   Confidence: ${classification.confidence.toFixed(2)}`);
        console.log(`   Course: ${classification.courseName || 'Unknown'}`);
      }
    } catch (error) {
      console.error('Error analyzing PDF:', error);
      throw error;
    }

    return results;
  }

  // Get overall classification for the entire PDF
  getOverallClassification(results: PDFAnalysisResult[]): CourseClassification {
    const totalPages = results.length;
    const probabilityPages = results.filter(r => r.suggestedSubject === 'probability').length;
    const roboticsPages = results.filter(r => r.suggestedSubject === 'robotics').length;
    const uncertainPages = results.filter(r => r.suggestedSubject === 'uncertain').length;

    const probabilityRatio = probabilityPages / totalPages;
    const roboticsRatio = roboticsPages / totalPages;
    const uncertainRatio = uncertainPages / totalPages;

    let subject: 'probability' | 'robotics' | 'uncertain';
    let confidence: number;
    let reasoning: string[] = [];
    let needsUserInput = false;

    if (probabilityRatio > roboticsRatio && probabilityRatio > 0.5) {
      subject = 'probability';
      confidence = probabilityRatio;
      reasoning.push(`${probabilityPages}/${totalPages} pages classified as probability`);
    } else if (roboticsRatio > probabilityRatio && roboticsRatio > 0.5) {
      subject = 'robotics';
      confidence = roboticsRatio;
      reasoning.push(`${roboticsPages}/${totalPages} pages classified as robotics`);
    } else {
      subject = 'uncertain';
      confidence = Math.max(probabilityRatio, roboticsRatio);
      needsUserInput = true;
      reasoning.push('Insufficient confidence for automatic classification');
      reasoning.push(`Probability: ${probabilityPages}/${totalPages} pages`);
      reasoning.push(`Robotics: ${roboticsPages}/${totalPages} pages`);
      reasoning.push(`Uncertain: ${uncertainPages}/${totalPages} pages`);
    }

    // Check for course name consistency
    const courseNames = results.map(r => r.courseName).filter(Boolean);
    const uniqueCourseNames = [...new Set(courseNames)];
    
    if (uniqueCourseNames.length > 0) {
      reasoning.push(`Course names found: ${uniqueCourseNames.join(', ')}`);
    }

    return {
      subject,
      confidence,
      reasoning,
      courseName: uniqueCourseNames[0],
      needsUserInput
    };
  }

  // Clean up temporary files
  cleanup() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        files.forEach((file: string) => {
          fs.unlinkSync(path.join(this.tempDir, file));
        });
      }
    } catch (error) {
      console.error('Error cleaning up temporary files:', error);
    }
  }
}
