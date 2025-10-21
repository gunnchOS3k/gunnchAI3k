// gunnchAI3k Study Copilot v2 - PDF Generator
// Creates study materials as PDF with academic integrity headers

import * as PDFDocument from 'pdfkit';
import { CourseModel } from '../ingest';
import { StudyPlan, RetrievalPrompt, PracticeSet } from '../plan';

export async function toPDF(
  courseModel: CourseModel,
  studyPlan: StudyPlan,
  courseName: string
): Promise<Buffer> {
  console.log(`📄 Generating PDF for ${courseName}`);
  
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    }
  });
  
  const buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  
  // Add academic integrity header
  addAcademicIntegrityHeader(doc, courseName);
  
  // Add course overview
  addCourseOverview(doc, courseModel);
  
  // Add study plan
  addStudyPlan(doc, studyPlan);
  
  // Add retrieval practice
  addRetrievalPractice(doc, studyPlan.retrievalPrompts);
  
  // Add practice problems
  addPracticeProblems(doc, studyPlan.practiceSets);
  
  // Add worked examples
  addWorkedExamples(doc, courseModel);
  
  // Add summary
  addSummary(doc, courseName);
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    
    doc.on('error', reject);
  });
}

function addAcademicIntegrityHeader(doc: PDFDocument, courseName: string) {
  // Academic integrity notice
  doc.fontSize(10)
     .fillColor('red')
     .text('Study pack for learning only. Follow your course\'s policy—do not submit generated content as your own.', {
       align: 'center',
       lineGap: 5
     });
  
  doc.moveDown(2);
  
  // Main title
  doc.fontSize(24)
     .fillColor('#4ECDC4')
     .text('gunnchAI3k Study Pack', {
       align: 'center',
       lineGap: 10
     });
  
  doc.fontSize(18)
     .fillColor('#2C3E50')
     .text(courseName, {
       align: 'center',
       lineGap: 5
     });
  
  doc.fontSize(12)
     .fillColor('#7F8C8D')
     .text(`Generated: ${new Date().toLocaleDateString()}`, {
       align: 'center'
     });
  
  doc.moveDown(3);
}

function addCourseOverview(doc: PDFDocument, courseModel: CourseModel) {
  doc.fontSize(16)
     .fillColor('#2C3E50')
     .text('Course Overview', {
       underline: true,
       lineGap: 10
     });
  
  doc.moveDown(1);
  
  // Topics
  doc.fontSize(14)
     .fillColor('#34495E')
     .text('Topics Covered:', {
       lineGap: 5
     });
  
  courseModel.topics.forEach((topic, index) => {
    doc.fontSize(12)
       .fillColor('#2C3E50')
       .text(`${index + 1}. ${topic.name}`, {
         indent: 20,
         lineGap: 3
       });
    
    if (topic.description) {
      doc.fontSize(10)
         .fillColor('#7F8C8D')
         .text(`   ${topic.description}`, {
           indent: 40,
           lineGap: 2
         });
    }
  });
  
  doc.moveDown(1);
  
  // Learning Objectives
  doc.fontSize(14)
     .fillColor('#34495E')
     .text('Learning Objectives:', {
       lineGap: 5
     });
  
  courseModel.learningObjectives.forEach((objective, index) => {
    doc.fontSize(12)
       .fillColor('#2C3E50')
       .text(`• ${objective}`, {
         indent: 20,
         lineGap: 3
       });
  });
  
  doc.addPage();
}

function addStudyPlan(doc: PDFDocument, studyPlan: StudyPlan) {
  doc.fontSize(16)
     .fillColor('#2C3E50')
     .text('Study Plan', {
       underline: true,
       lineGap: 10
     });
  
  doc.moveDown(1);
  
  // Today's plan
  doc.fontSize(14)
     .fillColor('#E74C3C')
     .text("Today's Focus (30 minutes):", {
       lineGap: 5
     });
  
  studyPlan.todayPlan.blocks.forEach(block => {
    doc.fontSize(12)
       .fillColor('#2C3E50')
       .text(`• ${block.duration}min ${block.activity}: ${block.description}`, {
         indent: 20,
         lineGap: 3
       });
  });
  
  doc.moveDown(1);
  
  // Week plan
  doc.fontSize(14)
     .fillColor('#27AE60')
     .text('Weekly Schedule:', {
       lineGap: 5
     });
  
  studyPlan.weekPlan.forEach(day => {
    doc.fontSize(12)
       .fillColor('#2C3E50')
       .text(`${day.day}: ${day.focus}`, {
         indent: 20,
         lineGap: 3
       });
    
    day.timeBlocks.forEach(block => {
      doc.fontSize(10)
         .fillColor('#7F8C8D')
         .text(`  - ${block.duration}min ${block.activity}: ${block.description}`, {
           indent: 40,
           lineGap: 2
         });
    });
  });
  
  doc.addPage();
}

function addRetrievalPractice(doc: PDFDocument, retrievalPrompts: RetrievalPrompt[]) {
  doc.fontSize(16)
     .fillColor('#2C3E50')
     .text('Retrieval Practice', {
       underline: true,
       lineGap: 10
     });
  
  doc.fontSize(12)
     .fillColor('#7F8C8D')
     .text('Test your memory on these topics. Try to answer without looking at the solutions first.', {
       lineGap: 5,
       italics: true
     });
  
  doc.moveDown(1);
  
  retrievalPrompts.slice(0, 8).forEach((prompt, index) => {
    doc.fontSize(14)
       .fillColor('#8E44AD')
       .text(`Practice ${index + 1}: ${prompt.topic}`, {
         lineGap: 5
       });
    
    doc.fontSize(12)
       .fillColor('#2C3E50')
       .text('Question:', {
         lineGap: 3
       });
    
    doc.fontSize(11)
       .fillColor('#2C3E50')
       .text(prompt.question, {
         indent: 20,
         lineGap: 3
       });
    
    doc.fontSize(12)
       .fillColor('#E67E22')
       .text('Answer:', {
         lineGap: 3
       });
    
    doc.fontSize(10)
       .fillColor('#7F8C8D')
       .text(prompt.answer, {
         indent: 20,
         lineGap: 3
       });
    
    doc.moveDown(1);
  });
  
  doc.addPage();
}

function addPracticeProblems(doc: PDFDocument, practiceSets: PracticeSet[]) {
  doc.fontSize(16)
     .fillColor('#2C3E50')
     .text('Practice Problems', {
       underline: true,
       lineGap: 10
     });
  
  doc.fontSize(12)
     .fillColor('#7F8C8D')
     .text('Work through these problems step by step. Use the hints if you get stuck.', {
       lineGap: 5,
       italics: true
     });
  
  doc.moveDown(1);
  
  practiceSets.slice(0, 4).forEach((set, index) => {
    doc.fontSize(14)
       .fillColor('#27AE60')
       .text(`Practice Set ${index + 1}: ${set.topic}`, {
         lineGap: 5
       });
    
    set.problems.slice(0, 2).forEach((problem, probIndex) => {
      doc.fontSize(12)
         .fillColor('#2C3E50')
         .text(`Problem ${probIndex + 1}:`, {
           lineGap: 3
         });
      
      doc.fontSize(11)
         .fillColor('#2C3E50')
         .text(problem.problem, {
           indent: 20,
           lineGap: 3
         });
      
      doc.fontSize(12)
         .fillColor('#E67E22')
         .text('Solution Steps:', {
           lineGap: 3
         });
      
      problem.steps.forEach(step => {
        doc.fontSize(10)
           .fillColor('#7F8C8D')
           .text(`• ${step}`, {
             indent: 40,
             lineGap: 2
           });
      });
      
      doc.moveDown(0.5);
    });
    
    // Add hints
    doc.fontSize(12)
       .fillColor('#E67E22')
       .text('Hints:', {
         lineGap: 3
       });
    
    set.hints.forEach(hint => {
      doc.fontSize(10)
         .fillColor('#7F8C8D')
         .text(`• ${hint}`, {
           indent: 20,
           lineGap: 2
         });
    });
    
    doc.moveDown(1);
  });
  
  doc.addPage();
}

function addWorkedExamples(doc: PDFDocument, courseModel: CourseModel) {
  doc.fontSize(16)
     .fillColor('#2C3E50')
     .text('Worked Examples', {
       underline: true,
       lineGap: 10
     });
  
  doc.fontSize(12)
     .fillColor('#7F8C8D')
     .text('Study these examples to understand the problem-solving process.', {
       lineGap: 5,
       italics: true
     });
  
  doc.moveDown(1);
  
  courseModel.exemplars.forEach((exemplar, index) => {
    doc.fontSize(14)
       .fillColor('#8E44AD')
       .text(`Example ${index + 1}: ${exemplar.title}`, {
         lineGap: 5
       });
    
    doc.fontSize(11)
       .fillColor('#2C3E50')
       .text(exemplar.problem, {
         indent: 20,
         lineGap: 3
       });
    
    if (exemplar.solution) {
      doc.fontSize(12)
         .fillColor('#E67E22')
         .text('Solution:', {
           lineGap: 3
         });
      
      doc.fontSize(10)
         .fillColor('#7F8C8D')
         .text(exemplar.solution, {
           indent: 20,
           lineGap: 3
         });
    }
    
    doc.moveDown(1);
  });
  
  doc.addPage();
}

function addSummary(doc: PDFDocument, courseName: string) {
  doc.fontSize(16)
     .fillColor('#2C3E50')
     .text('Study Summary', {
       underline: true,
       lineGap: 10
     });
  
  doc.moveDown(1);
  
  doc.fontSize(14)
     .fillColor('#E74C3C')
     .text('Key Study Strategies:', {
       lineGap: 5
     });
  
  const strategies = [
    '• Use spaced retrieval - test yourself regularly',
    '• Practice interleaving - mix different topics',
    '• Work through examples before attempting problems',
    '• Review material at increasing intervals',
    '• Focus on understanding, not memorization'
  ];
  
  strategies.forEach(strategy => {
    doc.fontSize(12)
       .fillColor('#2C3E50')
       .text(strategy, {
         indent: 20,
         lineGap: 3
       });
  });
  
  doc.moveDown(2);
  
  doc.fontSize(12)
     .fillColor('#E74C3C')
     .text('Remember: This is for learning only. Follow your course\'s academic integrity policy.', {
       align: 'center',
       lineGap: 5
     });
  
  doc.fontSize(10)
     .fillColor('#7F8C8D')
     .text('Generated by gunnchAI3k Study Copilot v2', {
       align: 'center'
     });
}

