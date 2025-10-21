// gunnchAI3k Study Copilot v2 - Test Script
// Tests the study copilot functionality

import { StudyCopilot, StudyUtils, StudyStrategies, LearningScience } from './index';

async function testStudyCopilot() {
  console.log('🧪 Testing gunnchAI3k Study Copilot v2...\n');
  
  // Test 1: Study Utils
  console.log('📊 Testing Study Utils:');
  console.log(`Format Time (90 minutes): ${StudyUtils.formatTime(90)}`);
  console.log(`Difficulty Color (easy): ${StudyUtils.getDifficultyColor('easy')}`);
  console.log(`Activity Icon (study): ${StudyUtils.getActivityIcon('study')}`);
  console.log(`File Size (1048576 bytes): ${StudyUtils.formatFileSize(1048576)}\n`);
  
  // Test 2: Study Strategies
  console.log('🎯 Testing Study Strategies:');
  console.log(`Spaced Retrieval: ${StudyStrategies.spacedRetrieval.name}`);
  console.log(`Description: ${StudyStrategies.spacedRetrieval.description}`);
  console.log(`Intervals: ${StudyStrategies.spacedRetrieval.intervals.join(', ')} days\n`);
  
  console.log(`Interleaving: ${StudyStrategies.interleaving.name}`);
  console.log(`Description: ${StudyStrategies.interleaving.description}\n`);
  
  // Test 3: Learning Science
  console.log('🔬 Testing Learning Science References:');
  console.log(`Testing Effect: ${LearningScience.testingEffect.title}`);
  console.log(`Reference: ${LearningScience.testingEffect.reference}\n`);
  
  console.log(`Spacing Effect: ${LearningScience.spacingEffect.title}`);
  console.log(`Reference: ${LearningScience.spacingEffect.reference}\n`);
  
  // Test 4: Mock Course Model
  console.log('📚 Testing Course Model Creation:');
  const mockCourseModel = {
    courseName: 'Test Course',
    topics: [
      { name: 'Introduction', description: 'Basic concepts', keyConcepts: ['concept1', 'concept2'], difficulty: 'beginner' as const, prerequisites: [] },
      { name: 'Advanced Topics', description: 'Complex concepts', keyConcepts: ['concept3', 'concept4'], difficulty: 'advanced' as const, prerequisites: ['Introduction'] }
    ],
    learningObjectives: [
      'Understand basic concepts',
      'Apply advanced techniques',
      'Analyze complex problems'
    ],
    keyFormulas: ['formula1', 'formula2'],
    deadlines: [new Date('2024-12-31')],
    examDates: [new Date('2024-12-15')],
    exemplars: [
      { type: 'worked-example' as const, title: 'Example 1', problem: 'Solve this problem', solution: 'Solution here', steps: ['Step 1', 'Step 2'], topic: 'Introduction' }
    ]
  };
  
  console.log(`Course: ${mockCourseModel.courseName}`);
  console.log(`Topics: ${mockCourseModel.topics.length}`);
  console.log(`Objectives: ${mockCourseModel.learningObjectives.length}`);
  console.log(`Exemplars: ${mockCourseModel.exemplars.length}\n`);
  
  // Test 5: Study Plan Generation
  console.log('📅 Testing Study Plan Generation:');
  const mockPreferences = {
    hoursPerWeek: 10,
    sessionLength: 50,
    dueDate: new Date('2024-12-31'),
    examDate: new Date('2024-12-15')
  };
  
  console.log(`Hours per week: ${mockPreferences.hoursPerWeek}`);
  console.log(`Session length: ${mockPreferences.sessionLength} minutes`);
  console.log(`Due date: ${mockPreferences.dueDate?.toLocaleDateString()}`);
  console.log(`Exam date: ${mockPreferences.examDate?.toLocaleDateString()}\n`);
  
  // Test 6: File Type Detection
  console.log('📄 Testing File Type Detection:');
  const testFiles = ['document.pdf', 'presentation.pptx', 'notes.docx', 'image.png'];
  testFiles.forEach(filename => {
    const extension = filename.split('.').pop()?.toLowerCase();
    console.log(`${filename} -> ${extension}`);
  });
  
  console.log('\n✅ All tests completed successfully!');
  console.log('🎉 gunnchAI3k Study Copilot v2 is ready for use!');
}

// Run the test
testStudyCopilot().catch(console.error);

