# gunnchAI3k Study Copilot v2 📚

A calm, one-message-at-a-time tutor that creates comprehensive study materials using evidence-based learning science principles.

## 🎯 Mission

Make gunnchAI3k a calm, one-message-at-a-time tutor that:
1. **Collects** course name, syllabus, one assignment, and latest lecture slide
2. **Builds** a concise study plan with spaced retrieval, interleaving, and worked examples
3. **Returns** one clean Discord reply with:
   - An at-a-glance plan
   - PPTX, DOCX, and PDF study materials
   - Optional practice sets and self-checks
4. **Converts** any uploaded assignment into a guided lesson with hints and step-by-step solutions

## 🧠 Learning Science Guardrails

- **Retrieval Practice**: Testing as learning boosts retention
- **Spacing/Interleaving**: Improves long-term transfer
- **Worked Examples**: Reduces cognitive load for new skills

## 🚀 Features

### Core Functionality
- **File Ingestion**: PDF, DOCX, PPTX, and image parsing
- **Study Planning**: Spaced retrieval and interleaving schedules
- **Material Generation**: PPTX slides, DOCX notes, and PDF guides
- **Academic Integrity**: Clear disclaimers on all generated content

### Discord Commands
- `/study start` - Begin a new study session
- `/study make-notes` - Regenerate study materials
- `/study quiz [topic] [#items]` - Generate topic-specific quizzes
- `/study explain [concept]` - Get concept explanations
- `/study plan [days] [hours]` - Create custom study plans
- `/study assignment-mode` - Convert assignments to guided lessons

## 📁 Project Structure

```
src/study/
├── index.ts           # Main exports and utilities
├── ingest.ts          # File parsing pipeline
├── plan.ts            # Study planning with spaced retrieval
├── bot.ts             # Discord integration
├── storage.ts         # File storage handling
├── exporters/
│   ├── pptx.ts        # PowerPoint generation
│   ├── docx.ts        # Word document generation
│   └── pdf.ts         # PDF generation
└── test.ts            # Test suite
```

## 🔧 Installation

```bash
# Install dependencies
npm install

# Run tests
npx tsx src/study/test.ts

# Start the bot
npm run dev
```

## 📊 Usage Examples

### Basic Study Session
```
/study start
# Bot asks for: course name, syllabus, assignment, lecture slide
# Returns: study plan + PPTX/DOCX/PDF materials
```

### Quiz Generation
```
/study quiz topic:"Machine Learning" items:5
# Returns: 5 quiz questions with answers
```

### Concept Explanation
```
/study explain concept:"Neural Networks"
# Returns: detailed explanation with examples
```

### Custom Study Plan
```
/study plan days:14 hours:2
# Returns: 14-day plan with 2 hours per day
```

## 🎓 Learning Science Integration

### Spaced Retrieval
- **Day 1**: Initial learning
- **Day 3**: First review
- **Day 7**: Second review
- **Day 14**: Third review
- **Day 30**: Final review

### Interleaving
- Mix different topics in practice sessions
- Alternate between related concepts
- Improve discrimination and transfer

### Worked Examples
- Complete solutions before independent practice
- Step-by-step problem-solving process
- Reduced cognitive load for new skills

## 📝 Generated Materials

### PowerPoint (PPTX)
- Academic integrity header
- Course overview slides
- Study plan visualization
- Retrieval practice slides
- Practice problem sets
- Worked examples

### Word Document (DOCX)
- Comprehensive study notes
- Learning objectives
- Practice problems with solutions
- Retrieval prompts
- Study strategies guide

### PDF
- Portable study guide
- All content from DOCX
- Print-friendly format
- Academic integrity notice

## 🔒 Academic Integrity

All generated materials include:
- **Header**: "Study pack for learning only. Follow your course's policy—do not submit generated content as your own."
- **Purpose**: Learning and understanding, not submission
- **Guidance**: Step-by-step learning process

## 🛠️ Technical Implementation

### File Parsing
- **PDF**: pdf-parse library
- **DOCX**: mammoth library
- **PPTX**: Mock implementation (Node.js compatible)
- **Images**: Mock OCR implementation

### Study Planning
- Spaced retrieval intervals: 1, 3, 7, 14, 30 days
- Interleaving patterns for mixed practice
- Worked example integration
- Customizable time blocks

### Material Generation
- **PPTX**: PptxGenJS for slide creation
- **DOCX**: docx library for Word documents
- **PDF**: PDFKit for PDF generation
- **Storage**: AWS S3 for large files

## 📚 Research References

- **Testing Effect**: Roediger & Karpicke (2006)
- **Spacing Effect**: Cepeda et al. (2006)
- **Interleaving**: Rohrer & Taylor (2007)
- **Worked Examples**: Sweller & Cooper (1985)

## 🎯 Key Benefits

1. **Evidence-Based**: Built on proven learning science principles
2. **Comprehensive**: Generates multiple material formats
3. **Academic Integrity**: Clear disclaimers and learning focus
4. **Customizable**: Adapts to different study schedules
5. **Discord Integration**: Seamless workflow in Discord

## 🚀 Getting Started

1. **Start a Study Session**:
   ```
   /study start
   ```

2. **Upload Materials**:
   - Course name
   - Syllabus (file or URL)
   - Assignment (file)
   - Lecture slide (file)

3. **Receive Study Pack**:
   - Study plan
   - PPTX slides
   - DOCX notes
   - PDF guide

4. **Practice and Learn**:
   - Use retrieval prompts
   - Work through practice problems
   - Follow spaced review schedule

## 🔧 Configuration

### Environment Variables
```bash
# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id

# Storage (Optional)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_S3_REGION=your_region
```

### File Size Limits
- **Discord Non-Nitro**: 10 MB per file
- **Discord Nitro**: 25 MB per file
- **Recommended Maximum**: 50 MB per file

## 🧪 Testing

```bash
# Run the test suite
npx tsx src/study/test.ts

# Expected output:
# ✅ All tests completed successfully!
# 🎉 gunnchAI3k Study Copilot v2 is ready for use!
```

## 📈 Future Enhancements

- **AI Integration**: GPT-4 for content generation
- **Real OCR**: Tesseract.js for image processing
- **Advanced Parsing**: Better PPTX support
- **Analytics**: Study progress tracking
- **Mobile Support**: React Native integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Learning science research community
- Discord.js for bot framework
- Open source libraries for file processing
- Educational technology community

---

**gunnchAI3k Study Copilot v2** - Making learning more effective with evidence-based study strategies! 🎓✨

