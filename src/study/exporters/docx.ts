// gunnchAI3k Study Copilot v2 - Word Document Generator
// Creates comprehensive study notes with academic integrity headers

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { CourseModel } from '../ingest';
import { StudyPlan, RetrievalPrompt, PracticeSet } from '../plan';

export interface DocSpec {
  title: string;
  sections: DocSection[];
  metadata: {
    author: string;
    created: Date;
    course: string;
  };
}

export interface DocSection {
  title: string;
  content: Paragraph[];
  level: number;
}

export async function toDOCX(
  courseModel: CourseModel,
  studyPlan: StudyPlan,
  courseName: string
): Promise<Buffer> {
  console.log(`📝 Generating Word document for ${courseName}`);
  
  const sections: DocSection[] = [];
  
  // Add academic integrity notice
  sections.push(createAcademicIntegritySection());
  
  // Add course overview
  sections.push(createCourseOverviewSection(courseModel));
  
  // Add study plan
  sections.push(createStudyPlanSection(studyPlan));
  
  // Add retrieval prompts
  sections.push(createRetrievalSection(studyPlan.retrievalPrompts));
  
  // Add practice sets
  sections.push(createPracticeSection(studyPlan.practiceSets));
  
  // Add worked examples
  sections.push(createWorkedExamplesSection(courseModel));
  
  // Add summary
  sections.push(createSummarySection(courseName));
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections.flatMap(section => section.content)
    }]
  });
  
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

function createAcademicIntegritySection(): DocSection {
  const content = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Study pack for learning only. Follow your course\'s policy—do not submit generated content as your own.',
          bold: true,
          color: 'FF0000',
          size: 24
        })
      ],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'gunnchAI3k Study Pack',
          bold: true,
          size: 32,
          color: '4ECDC4'
        })
      ],
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString()}`,
          size: 14,
          color: '7F8C8D'
        })
      ],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({ text: '' }) // Empty line
  ];
  
  return {
    title: 'Academic Integrity Notice',
    content,
    level: 0
  };
}

function createCourseOverviewSection(courseModel: CourseModel): DocSection {
  const content = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Course Overview',
          bold: true,
          size: 20,
          color: '2C3E50'
        })
      ],
      heading: HeadingLevel.HEADING_1
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Topics Covered:',
          bold: true,
          size: 16,
          color: '34495E'
        })
      ]
    })
  ];
  
  // Add topics
  courseModel.topics.forEach((topic, index) => {
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${index + 1}. ${topic.name}`,
            size: 12,
            color: '2C3E50'
          })
        ],
        indent: { left: 400 }
      })
    );
    
    if (topic.description) {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `   ${topic.description}`,
              size: 11,
              color: '7F8C8D',
              italics: true
            })
          ],
          indent: { left: 600 }
        })
      );
    }
  });
  
  // Add learning objectives
  content.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Learning Objectives:',
          bold: true,
          size: 16,
          color: '34495E'
        })
      ]
    })
  );
  
  courseModel.learningObjectives.forEach((objective, index) => {
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `• ${objective}`,
            size: 12,
            color: '2C3E50'
          })
        ],
        indent: { left: 400 }
      })
    );
  });
  
  return {
    title: 'Course Overview',
    content,
    level: 1
  };
}

function createStudyPlanSection(studyPlan: StudyPlan): DocSection {
  const content = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Study Plan',
          bold: true,
          size: 20,
          color: '2C3E50'
        })
      ],
      heading: HeadingLevel.HEADING_1
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Today's Focus (30 minutes):",
          bold: true,
          size: 16,
          color: 'E74C3C'
        })
      ]
    })
  ];
  
  // Add today's plan
  studyPlan.todayPlan.blocks.forEach(block => {
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `• ${block.duration}min ${block.activity}: ${block.description}`,
            size: 12,
            color: '2C3E50'
          })
        ],
        indent: { left: 400 }
      })
    );
  });
  
  // Add week plan
  content.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Weekly Schedule:',
          bold: true,
          size: 16,
          color: '27AE60'
        })
      ]
    })
  );
  
  studyPlan.weekPlan.forEach(day => {
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${day.day}: ${day.focus}`,
            bold: true,
            size: 14,
            color: '2C3E50'
          })
        ]
      })
    );
    
    day.timeBlocks.forEach(block => {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `  - ${block.duration}min ${block.activity}: ${block.description}`,
              size: 11,
              color: '7F8C8D'
            })
          ],
          indent: { left: 400 }
        })
      );
    });
  });
  
  return {
    title: 'Study Plan',
    content,
    level: 1
  };
}

function createRetrievalSection(retrievalPrompts: RetrievalPrompt[]): DocSection {
  const content = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Retrieval Practice',
          bold: true,
          size: 20,
          color: '2C3E50'
        })
      ],
      heading: HeadingLevel.HEADING_1
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Test your memory on these topics. Try to answer without looking at the solutions first.',
          size: 12,
          color: '7F8C8D',
          italics: true
        })
      ]
    })
  ];
  
  retrievalPrompts.slice(0, 10).forEach((prompt, index) => {
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Practice ${index + 1}: ${prompt.topic}`,
            bold: true,
            size: 14,
            color: '8E44AD'
          })
        ]
      })
    );
    
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Question:',
            bold: true,
            size: 12,
            color: '2C3E50'
          })
        ]
      })
    );
    
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: prompt.question,
            size: 12,
            color: '2C3E50'
          })
        ],
        indent: { left: 400 }
      })
    );
    
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Answer:',
            bold: true,
            size: 12,
            color: 'E67E22'
          })
        ]
      })
    );
    
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: prompt.answer,
            size: 11,
            color: '7F8C8D'
          })
        ],
        indent: { left: 400 }
      })
    );
    
    content.push(new Paragraph({ text: '' })); // Empty line
  });
  
  return {
    title: 'Retrieval Practice',
    content,
    level: 1
  };
}

function createPracticeSection(practiceSets: PracticeSet[]): DocSection {
  const content = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Practice Problems',
          bold: true,
          size: 20,
          color: '2C3E50'
        })
      ],
      heading: HeadingLevel.HEADING_1
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Work through these problems step by step. Use the hints if you get stuck.',
          size: 12,
          color: '7F8C8D',
          italics: true
        })
      ]
    })
  ];
  
  practiceSets.slice(0, 5).forEach((set, index) => {
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Practice Set ${index + 1}: ${set.topic}`,
            bold: true,
            size: 16,
            color: '27AE60'
          })
        ]
      })
    );
    
    set.problems.forEach((problem, probIndex) => {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Problem ${probIndex + 1}:`,
              bold: true,
              size: 14,
              color: '2C3E50'
            })
          ]
        })
      );
      
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: problem.problem,
              size: 12,
              color: '2C3E50'
            })
          ],
          indent: { left: 400 }
        })
      );
      
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Solution Steps:',
              bold: true,
              size: 12,
              color: 'E67E22'
            })
          ]
        })
      );
      
      problem.steps.forEach(step => {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${step}`,
                size: 11,
                color: '7F8C8D'
              })
            ],
            indent: { left: 600 }
          })
        );
      });
      
      content.push(new Paragraph({ text: '' })); // Empty line
    });
    
    // Add hints
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Hints:',
            bold: true,
            size: 12,
            color: 'E67E22'
          })
        ]
      })
    );
    
    set.hints.forEach(hint => {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${hint}`,
              size: 11,
              color: '7F8C8D'
            })
          ],
          indent: { left: 400 }
        })
      );
    });
    
    content.push(new Paragraph({ text: '' })); // Empty line
  });
  
  return {
    title: 'Practice Problems',
    content,
    level: 1
  };
}

function createWorkedExamplesSection(courseModel: CourseModel): DocSection {
  const content = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Worked Examples',
          bold: true,
          size: 20,
          color: '2C3E50'
        })
      ],
      heading: HeadingLevel.HEADING_1
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Study these examples to understand the problem-solving process.',
          size: 12,
          color: '7F8C8D',
          italics: true
        })
      ]
    })
  ];
  
  courseModel.exemplars.forEach((exemplar, index) => {
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Example ${index + 1}: ${exemplar.title}`,
            bold: true,
            size: 14,
            color: '8E44AD'
          })
        ]
      })
    );
    
    content.push(
      new Paragraph({
        children: [
          new TextRun({
          text: exemplar.problem,
          size: 12,
          color: '2C3E50'
        })
      ],
      indent: { left: 400 }
    })
    );
    
    if (exemplar.solution) {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Solution:',
              bold: true,
              size: 12,
              color: 'E67E22'
            })
          ]
        })
      );
      
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exemplar.solution,
              size: 11,
              color: '7F8C8D'
            })
          ],
          indent: { left: 400 }
        })
      );
    }
    
    content.push(new Paragraph({ text: '' })); // Empty line
  });
  
  return {
    title: 'Worked Examples',
    content,
    level: 1
  };
}

function createSummarySection(courseName: string): DocSection {
  const content = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Study Summary',
          bold: true,
          size: 20,
          color: '2C3E50'
        })
      ],
      heading: HeadingLevel.HEADING_1
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Key Study Strategies:',
          bold: true,
          size: 16,
          color: 'E74C3C'
        })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '• Use spaced retrieval - test yourself regularly',
          size: 12,
          color: '2C3E50'
        })
      ],
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '• Practice interleaving - mix different topics',
          size: 12,
          color: '2C3E50'
        })
      ],
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '• Work through examples before attempting problems',
          size: 12,
          color: '2C3E50'
        })
      ],
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '• Review material at increasing intervals',
          size: 12,
          color: '2C3E50'
        })
      ],
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '• Focus on understanding, not memorization',
          size: 12,
          color: '2C3E50'
        })
      ],
      indent: { left: 400 }
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Remember: This is for learning only. Follow your course\'s academic integrity policy.',
          bold: true,
          size: 12,
          color: 'E74C3C'
        })
      ],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generated by gunnchAI3k Study Copilot v2',
          size: 10,
          color: '7F8C8D'
        })
      ],
      alignment: AlignmentType.CENTER
    })
  ];
  
  return {
    title: 'Study Summary',
    content,
    level: 1
  };
}

