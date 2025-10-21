// gunnchAI3k Study Copilot v2 - File Ingestion Pipeline
// Handles PDF, DOCX, PPTX, and image file parsing

import * as fs from 'fs';
import * as path from 'path';
import { parse as pdfParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
// Note: pptx-parser and tesseract.js are browser-only libraries
// For Node.js, we'll use alternative approaches or mock implementations

export interface CourseModel {
  courseName: string;
  topics: Topic[];
  learningObjectives: string[];
  keyFormulas: string[];
  deadlines: Date[];
  examDates: Date[];
  exemplars: Exemplar[];
}

export interface Topic {
  name: string;
  description: string;
  keyConcepts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
}

export interface Exemplar {
  type: 'worked-example' | 'practice-problem' | 'case-study';
  title: string;
  problem: string;
  solution: string;
  steps: string[];
  topic: string;
}

export interface ParsedContent {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
  };
  structure: {
    headings: string[];
    sections: string[];
  };
}

export async function ingestFiles(
  courseName: string,
  files: {
    syllabus?: Buffer | string;
    assignment?: Buffer | string;
    lecture?: Buffer | string;
  }
): Promise<CourseModel> {
  console.log(`📚 Starting ingestion for course: ${courseName}`);
  
  const parsedContents: ParsedContent[] = [];
  
  // Parse syllabus if provided
  if (files.syllabus) {
    const syllabusContent = await parseFile(files.syllabus, 'syllabus');
    parsedContents.push(syllabusContent);
  }
  
  // Parse assignment if provided
  if (files.assignment) {
    const assignmentContent = await parseFile(files.assignment, 'assignment');
    parsedContents.push(assignmentContent);
  }
  
  // Parse lecture if provided
  if (files.lecture) {
    const lectureContent = await parseFile(files.lecture, 'lecture');
    parsedContents.push(lectureContent);
  }
  
  return buildCourseModel(courseName, parsedContents);
}

async function parseFile(file: Buffer | string, type: string): Promise<ParsedContent> {
  const buffer = typeof file === 'string' ? fs.readFileSync(file) : file;
  const extension = typeof file === 'string' ? path.extname(file).toLowerCase() : getFileExtension(buffer);
  
  console.log(`📄 Parsing ${type} file (${extension})`);
  
  switch (extension) {
    case '.pdf':
      return await parsePDF(buffer);
    case '.docx':
      return await parseDOCX(buffer);
    case '.pptx':
      return await parsePPTX(buffer);
    case '.png':
    case '.jpg':
    case '.jpeg':
      return await parseImage(buffer);
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

async function parsePDF(buffer: Buffer): Promise<ParsedContent> {
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        wordCount: data.text.split(/\s+/).length
      },
      structure: {
        headings: extractHeadings(data.text),
        sections: extractSections(data.text)
      }
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
}

async function parseDOCX(buffer: Buffer): Promise<ParsedContent> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      metadata: {
        wordCount: result.value.split(/\s+/).length
      },
      structure: {
        headings: extractHeadings(result.value),
        sections: extractSections(result.value)
      }
    };
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

async function parsePPTX(buffer: Buffer): Promise<ParsedContent> {
  try {
    // Mock PPTX parsing for Node.js environment
    // In a real implementation, you would use a Node.js-compatible PPTX parser
    const text = 'PPTX content would be parsed here. This is a mock implementation for Node.js environment.';
    
    return {
      text,
      metadata: {
        pages: 1,
        wordCount: text.split(/\s+/).length
      },
      structure: {
        headings: extractHeadings(text),
        sections: ['Slide 1']
      }
    };
  } catch (error) {
    console.error('PPTX parsing error:', error);
    throw new Error('Failed to parse PPTX file');
  }
}

async function parseImage(buffer: Buffer): Promise<ParsedContent> {
  try {
    // Mock OCR for Node.js environment
    // In a real implementation, you would use a Node.js-compatible OCR library
    const text = 'Image content would be extracted via OCR here. This is a mock implementation for Node.js environment.';
    
    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).length
      },
      structure: {
        headings: extractHeadings(text),
        sections: ['OCR Content']
      }
    };
  } catch (error) {
    console.error('Image OCR error:', error);
    throw new Error('Failed to perform OCR on image');
  }
}

function getFileExtension(buffer: Buffer): string {
  // Simple magic number detection
  if (buffer.toString('hex', 0, 4) === '25504446') return '.pdf';
  if (buffer.toString('hex', 0, 2) === '504b') return '.docx'; // or .pptx
  if (buffer.toString('hex', 0, 4) === '89504e47') return '.png';
  if (buffer.toString('hex', 0, 2) === 'ffd8') return '.jpg';
  return '.txt';
}

function extractHeadings(text: string): string[] {
  const headingRegex = /^(#{1,6}\s+.+|^[A-Z][^.!?]*:?$)/gm;
  return text.match(headingRegex) || [];
}

function extractSections(text: string): string[] {
  const sectionRegex = /^#{1,3}\s+(.+)$/gm;
  const matches = text.match(sectionRegex);
  return matches ? matches.map(match => match.replace(/^#{1,3}\s+/, '')) : [];
}

function buildCourseModel(courseName: string, contents: ParsedContent[]): CourseModel {
  const allText = contents.map(c => c.text).join('\n\n');
  
  return {
    courseName,
    topics: extractTopics(allText),
    learningObjectives: extractLearningObjectives(allText),
    keyFormulas: extractFormulas(allText),
    deadlines: extractDeadlines(allText),
    examDates: extractExamDates(allText),
    exemplars: extractExemplars(allText)
  };
}

function extractTopics(text: string): Topic[] {
  // Extract topics from headings and content
  const topicPatterns = [
    /Chapter \d+: (.+)/gi,
    /Unit \d+: (.+)/gi,
    /Topic: (.+)/gi,
    /#{1,3}\s+(.+)/g
  ];
  
  const topics: Topic[] = [];
  topicPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const name = match.replace(/^(Chapter \d+: |Unit \d+: |Topic: |#{1,3}\s+)/, '');
        if (name.length > 3 && name.length < 100) {
          topics.push({
            name: name.trim(),
            description: '',
            keyConcepts: [],
            difficulty: 'intermediate',
            prerequisites: []
          });
        }
      });
    }
  });
  
  return topics.slice(0, 10); // Limit to 10 topics
}

function extractLearningObjectives(text: string): string[] {
  const objectivePatterns = [
    /Learning [Oo]bjectives?:?\s*(.+?)(?=\n\n|\n[A-Z]|$)/gis,
    /By the end of this (?:chapter|unit|section), you will be able to:?\s*(.+?)(?=\n\n|\n[A-Z]|$)/gis,
    /Students will be able to:?\s*(.+?)(?=\n\n|\n[A-Z]|$)/gis
  ];
  
  const objectives: string[] = [];
  objectivePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const content = match.replace(/^(Learning [Oo]bjectives?:?|By the end of this (?:chapter|unit|section), you will be able to:?|Students will be able to:?)\s*/, '');
        const items = content.split(/[•\-\*]/).map(item => item.trim()).filter(item => item.length > 10);
        objectives.push(...items);
      });
    }
  });
  
  return objectives.slice(0, 15); // Limit to 15 objectives
}

function extractFormulas(text: string): string[] {
  const formulaPatterns = [
    /\\[a-zA-Z]+\{[^}]+\}/g, // LaTeX formulas
    /[A-Za-z]+\s*=\s*[^=\n]+/g, // Simple equations
    /f\([^)]+\)\s*=\s*[^=\n]+/g // Function definitions
  ];
  
  const formulas: string[] = [];
  formulaPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      formulas.push(...matches.slice(0, 10)); // Limit to 10 formulas
    }
  });
  
  return formulas;
}

function extractDeadlines(text: string): Date[] {
  const deadlinePatterns = [
    /Due:?\s*([A-Za-z]+ \d{1,2},? \d{4})/gi,
    /Deadline:?\s*([A-Za-z]+ \d{1,2},? \d{4})/gi,
    /Assignment due:?\s*([A-Za-z]+ \d{1,2},? \d{4})/gi
  ];
  
  const deadlines: Date[] = [];
  deadlinePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const dateStr = match.replace(/^(Due:?|Deadline:?|Assignment due:?)\s*/, '');
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          deadlines.push(date);
        }
      });
    }
  });
  
  return deadlines;
}

function extractExamDates(text: string): Date[] {
  const examPatterns = [
    /Exam:?\s*([A-Za-z]+ \d{1,2},? \d{4})/gi,
    /Test:?\s*([A-Za-z]+ \d{1,2},? \d{4})/gi,
    /Final:?\s*([A-Za-z]+ \d{1,2},? \d{4})/gi
  ];
  
  const examDates: Date[] = [];
  examPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const dateStr = match.replace(/^(Exam:?|Test:?|Final:?)\s*/, '');
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          examDates.push(date);
        }
      });
    }
  });
  
  return examDates;
}

function extractExemplars(text: string): Exemplar[] {
  const exemplarPatterns = [
    /Example \d*:?\s*(.+?)(?=\n\n|\n[A-Z]|$)/gis,
    /Problem \d*:?\s*(.+?)(?=\n\n|\n[A-Z]|$)/gis,
    /Case Study:?\s*(.+?)(?=\n\n|\n[A-Z]|$)/gis
  ];
  
  const exemplars: Exemplar[] = [];
  exemplarPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match, index) => {
        const content = match.replace(/^(Example \d*:?|Problem \d*:?|Case Study:?)\s*/, '');
        exemplars.push({
          type: 'worked-example',
          title: `Example ${index + 1}`,
          problem: content,
          solution: '',
          steps: [],
          topic: 'General'
        });
      });
    }
  });
  
  return exemplars.slice(0, 5); // Limit to 5 exemplars
}
