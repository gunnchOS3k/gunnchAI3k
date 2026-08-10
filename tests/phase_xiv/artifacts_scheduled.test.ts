import * as fs from 'node:fs';
import * as path from 'node:path';
import { ArtifactCreator, ScheduledTaskRunner } from '../../src/phase_xiv';

describe('phase_xiv artifacts + scheduled', () => {
  it('creates docx/xlsx/pptx/pdf/svg/notebook/website/code and targeted edits', async () => {
    const root = path.join(process.cwd(), 'artifacts', 'phase_xiv', 'eval', 'artifacts_out');
    fs.rmSync(root, { recursive: true, force: true });
    const creator = new ArtifactCreator(root);
    const doc = await creator.createDocx('Report', ['SECTION_ONE', 'body']);
    const edited = creator.targetedEdit(doc.id, 'SECTION_ONE', 'SECTION_ONE_CLEARER');
    expect(edited.versions.length).toBe(2);
    expect(fs.readFileSync(edited.versions[1].editable_path || edited.versions[1].path, 'utf8')).toContain('SECTION_ONE_CLEARER');
    expect(creator.createXlsx('Meas', [['d', 'snr'], ['1', '28']]).kind).toBe('xlsx');
    const pptx = await creator.createPptx('Demo', ['Title', 'Slide 2', 'Slide 3', 'Slide 4 draft']);
    expect(fs.existsSync(pptx.versions[0].path)).toBe(true);
    const pdf = await creator.createPdf('PdfRep', ['line']);
    expect(fs.existsSync(pdf.versions[0].path)).toBe(true);
    expect(creator.createSvg('Flow', '<rect width="10" height="10"/>').kind).toBe('svg');
    expect(creator.createNotebook('Nb', [{ cell_type: 'markdown', source: '# hi' }]).kind).toBe('notebook');
    expect(creator.createWebsite('Site', '<h1>hi</h1>').kind).toBe('website');
    expect(creator.createCode('Code', 'main.ts', 'export {};\n').kind).toBe('code');
  }, 30000);

  it('runs scheduled tasks and forbids high-impact actions', () => {
    const store = path.join(process.cwd(), 'artifacts', 'phase_xiv', 'eval', 'scheduled.json');
    fs.rmSync(store, { force: true });
    const runner = new ScheduledTaskRunner(store);
    expect(() => runner.add('bad', '0 8 * * 1-5', 'submit')).toThrow(/HIGH_IMPACT/);
    runner.add('morning', '0 8 * * 1-5', 'summarize_due', { items: ['hw1', 'lab'] });
    const ran = runner.runDue();
    expect(ran[0].last_result).toContain('summary:2');
  });
});
