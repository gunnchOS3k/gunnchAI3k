// gunnchAI3k Study Copilot v2 - PowerPoint Generator
// Creates study slides with academic integrity headers

import * as PptxGenJS from 'pptxgenjs';
import { CourseModel } from '../ingest';
import { StudyPlan, RetrievalPrompt, PracticeSet } from '../plan';

export interface SlideSpec {
  title: string;
  content: string[];
  type: 'title' | 'content' | 'retrieval' | 'practice' | 'summary';
  notes?: string;
  images?: string[];
}

export async function toPPTX(
  courseModel: CourseModel,
  studyPlan: StudyPlan,
  courseName: string
): Promise<Buffer> {
  console.log(`📊 Generating PowerPoint for ${courseName}`);
  
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.defineLayout({ name: 'STUDY_LAYOUT', width: 10, height: 7.5 });
  pptx.layout = 'STUDY_LAYOUT';
  
  // Add title slide with academic integrity notice
  addTitleSlide(pptx, courseName, courseModel);
  
  // Add course overview
  addCourseOverview(pptx, courseModel);
  
  // Add study plan slides
  addStudyPlanSlides(pptx, studyPlan);
  
  // Add retrieval practice slides
  addRetrievalSlides(pptx, studyPlan.retrievalPrompts);
  
  // Add practice slides
  addPracticeSlides(pptx, studyPlan.practiceSets);
  
  // Add summary slide
  addSummarySlide(pptx, courseName);
  
  // Generate buffer
  const buffer = await pptx.write('nodebuffer');
  return buffer;
}

function addTitleSlide(pptx: PptxGenJS, courseName: string, courseModel: CourseModel) {
  const slide = pptx.addSlide();
  
  // Academic integrity header
  slide.addText('Study pack for learning only. Follow your course\'s policy—do not submit generated content as your own.', {
    x: 0.5,
    y: 0.2,
    w: 9,
    h: 0.3,
    fontSize: 10,
    color: 'FF0000',
    bold: true,
    align: 'center'
  });
  
  // Main title
  slide.addText(`gunnchAI3k Study Pack`, {
    x: 1,
    y: 1,
    w: 8,
    h: 1,
    fontSize: 32,
    color: '4ECDC4',
    bold: true,
    align: 'center'
  });
  
  slide.addText(courseName, {
    x: 1,
    y: 2.2,
    w: 8,
    h: 0.8,
    fontSize: 24,
    color: '2C3E50',
    align: 'center'
  });
  
  // Course info
  slide.addText(`Generated: ${new Date().toLocaleDateString()}`, {
    x: 1,
    y: 3.5,
    w: 8,
    h: 0.5,
    fontSize: 14,
    color: '7F8C8D',
    align: 'center'
  });
  
  slide.addText(`Topics: ${courseModel.topics.length} | Objectives: ${courseModel.learningObjectives.length}`, {
    x: 1,
    y: 4.2,
    w: 8,
    h: 0.5,
    fontSize: 12,
    color: '7F8C8D',
    align: 'center'
  });
}

function addCourseOverview(pptx: PptxGenJS, courseModel: CourseModel) {
  const slide = pptx.addSlide();
  
  slide.addText('Course Overview', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 24,
    color: '2C3E50',
    bold: true
  });
  
  // Topics
  slide.addText('Topics Covered:', {
    x: 0.5,
    y: 1.5,
    w: 4,
    h: 0.5,
    fontSize: 16,
    color: '34495E',
    bold: true
  });
  
  const topicList = courseModel.topics.map((topic, index) => 
    `${index + 1}. ${topic.name}`
  ).join('\n');
  
  slide.addText(topicList, {
    x: 0.5,
    y: 2,
    w: 4,
    h: 3,
    fontSize: 12,
    color: '2C3E50'
  });
  
  // Learning Objectives
  slide.addText('Learning Objectives:', {
    x: 5,
    y: 1.5,
    w: 4,
    h: 0.5,
    fontSize: 16,
    color: '34495E',
    bold: true
  });
  
  const objectiveList = courseModel.learningObjectives.slice(0, 8).map((obj, index) => 
    `• ${obj}`
  ).join('\n');
  
  slide.addText(objectiveList, {
    x: 5,
    y: 2,
    w: 4,
    h: 3,
    fontSize: 10,
    color: '2C3E50'
  });
}

function addStudyPlanSlides(pptx: PptxGenJS, studyPlan: StudyPlan) {
  const slide = pptx.addSlide();
  
  slide.addText('Weekly Study Plan', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 24,
    color: '2C3E50',
    bold: true
  });
  
  // Today's plan
  slide.addText("Today's Focus (30 minutes):", {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 0.5,
    fontSize: 16,
    color: 'E74C3C',
    bold: true
  });
  
  const todayBlocks = studyPlan.todayPlan.blocks.map(block => 
    `• ${block.duration}min ${block.activity}: ${block.description}`
  ).join('\n');
  
  slide.addText(todayBlocks, {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1.5,
    fontSize: 12,
    color: '2C3E50'
  });
  
  // Week overview
  slide.addText('Week Overview:', {
    x: 0.5,
    y: 4,
    w: 9,
    h: 0.5,
    fontSize: 16,
    color: '27AE60',
    bold: true
  });
  
  const weekOverview = studyPlan.weekPlan.slice(0, 5).map(day => 
    `${day.day}: ${day.focus} (${day.retrievalHits} retrieval hits)`
  ).join('\n');
  
  slide.addText(weekOverview, {
    x: 0.5,
    y: 4.5,
    w: 9,
    h: 2,
    fontSize: 11,
    color: '2C3E50'
  });
}

function addRetrievalSlides(pptx: PptxGenJS, retrievalPrompts: RetrievalPrompt[]) {
  retrievalPrompts.slice(0, 5).forEach((prompt, index) => {
    const slide = pptx.addSlide();
    
    slide.addText(`Retrieval Practice ${index + 1}`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 20,
      color: '8E44AD',
      bold: true
    });
    
    slide.addText(`Topic: ${prompt.topic}`, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: '7F8C8D'
    });
    
    slide.addText('Question:', {
      x: 0.5,
      y: 2.2,
      w: 9,
      h: 0.5,
      fontSize: 16,
      color: '2C3E50',
      bold: true
    });
    
    slide.addText(prompt.question, {
      x: 0.5,
      y: 2.7,
      w: 9,
      h: 1.5,
      fontSize: 14,
      color: '2C3E50'
    });
    
    slide.addText('Answer (reveal after attempting):', {
      x: 0.5,
      y: 4.5,
      w: 9,
      h: 0.5,
      fontSize: 12,
      color: 'E67E22',
      bold: true
    });
    
    slide.addText(prompt.answer, {
      x: 0.5,
      y: 5,
      w: 9,
      h: 1.5,
      fontSize: 12,
      color: '7F8C8D'
    });
  });
}

function addPracticeSlides(pptx: PptxGenJS, practiceSets: PracticeSet[]) {
  practiceSets.slice(0, 3).forEach((set, index) => {
    const slide = pptx.addSlide();
    
    slide.addText(`Practice Set: ${set.topic}`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 20,
      color: '27AE60',
      bold: true
    });
    
    set.problems.slice(0, 2).forEach((problem, probIndex) => {
      slide.addText(`Problem ${probIndex + 1}:`, {
        x: 0.5,
        y: 1.5 + (probIndex * 2),
        w: 9,
        h: 0.5,
        fontSize: 14,
        color: '2C3E50',
        bold: true
      });
      
      slide.addText(problem.problem, {
        x: 0.5,
        y: 2 + (probIndex * 2),
        w: 9,
        h: 1,
        fontSize: 12,
        color: '2C3E50'
      });
    });
    
    slide.addText('Hints:', {
      x: 0.5,
      y: 5.5,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: 'E67E22',
      bold: true
    });
    
    const hints = set.hints.slice(0, 2).map(hint => `• ${hint}`).join('\n');
    slide.addText(hints, {
      x: 0.5,
      y: 6,
      w: 9,
      h: 1,
      fontSize: 11,
      color: '7F8C8D'
    });
  });
}

function addSummarySlide(pptx: PptxGenJS, courseName: string) {
  const slide = pptx.addSlide();
  
  slide.addText('Study Summary', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 24,
    color: '2C3E50',
    bold: true
  });
  
  slide.addText('Key Study Strategies:', {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 0.5,
    fontSize: 16,
    color: 'E74C3C',
    bold: true
  });
  
  const strategies = [
    '• Use spaced retrieval - test yourself regularly',
    '• Practice interleaving - mix different topics',
    '• Work through examples before attempting problems',
    '• Review material at increasing intervals',
    '• Focus on understanding, not memorization'
  ].join('\n');
  
  slide.addText(strategies, {
    x: 0.5,
    y: 2,
    w: 9,
    h: 2.5,
    fontSize: 12,
    color: '2C3E50'
  });
  
  slide.addText('Remember: This is for learning only. Follow your course\'s academic integrity policy.', {
    x: 0.5,
    y: 5,
    w: 9,
    h: 0.8,
    fontSize: 10,
    color: 'E74C3C',
    bold: true,
    align: 'center'
  });
  
  slide.addText(`Generated by gunnchAI3k Study Copilot v2`, {
    x: 0.5,
    y: 6.5,
    w: 9,
    h: 0.5,
    fontSize: 10,
    color: '7F8C8D',
    align: 'center'
  });
}

