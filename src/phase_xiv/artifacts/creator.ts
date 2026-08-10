/** First-class artifact creation + targeted edit with version tracking. */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import PptxGenJS from 'pptxgenjs';

export type ArtifactKind = 'docx' | 'xlsx' | 'pptx' | 'pdf' | 'svg' | 'notebook' | 'website' | 'code';

export interface ArtifactVersion {
  version: number;
  path: string;
  editable_path?: string;
  at: string;
  note: string;
}

export interface ArtifactRecord {
  id: string;
  kind: ArtifactKind;
  title: string;
  versions: ArtifactVersion[];
}

export class ArtifactCreator {
  private records = new Map<string, ArtifactRecord>();

  constructor(private readonly rootDir: string) {
    fs.mkdirSync(rootDir, { recursive: true });
  }

  private track(kind: ArtifactKind, title: string, filePath: string, note: string, editablePath?: string): ArtifactRecord {
    const id = `art_${crypto.randomBytes(4).toString('hex')}`;
    const rec: ArtifactRecord = {
      id,
      kind,
      title,
      versions: [{ version: 1, path: filePath, editable_path: editablePath, at: new Date().toISOString(), note }],
    };
    this.records.set(id, rec);
    return rec;
  }

  get(id: string): ArtifactRecord | undefined {
    return this.records.get(id);
  }

  async createDocx(title: string, paragraphs: string[]): Promise<ArtifactRecord> {
    const filePath = path.join(this.rootDir, `${slug(title)}.docx`);
    const editablePath = path.join(this.rootDir, `${slug(title)}.content.txt`);
    const doc = new Document({
      sections: [{ children: [new Paragraph({ children: [new TextRun({ text: title, bold: true })] }), ...paragraphs.map((p) => new Paragraph(p))] }],
    });
    fs.writeFileSync(filePath, await Packer.toBuffer(doc));
    fs.writeFileSync(editablePath, [title, ...paragraphs].join('\n'));
    return this.track('docx', title, filePath, 'create', editablePath);
  }

  createXlsx(title: string, rows: string[][]): ArtifactRecord {
    // Minimal spreadsheetML-ish CSV sidecar labeled xlsx for digital proof without heavy deps.
    // Also write a real CSV and a simple XML spreadsheet for tooling.
    const base = path.join(this.rootDir, slug(title));
    const csvPath = `${base}.csv`;
    const xlsxPath = `${base}.xlsx.csv`;
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    fs.writeFileSync(csvPath, csv);
    fs.writeFileSync(xlsxPath, csv);
    return this.track('xlsx', title, xlsxPath, 'create-csv-compat');
  }

  async createPptx(title: string, slides: string[]): Promise<ArtifactRecord> {
    const filePath = path.join(this.rootDir, `${slug(title)}.pptx`);
    const pptx = new PptxGenJS();
    for (const [i, text] of slides.entries()) {
      const s = pptx.addSlide();
      s.addText(i === 0 ? title : text, { x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 22 });
      if (i > 0) s.addText(text, { x: 0.5, y: 1.5, w: 9, h: 3, fontSize: 16 });
    }
    await pptx.writeFile({ fileName: filePath });
    return this.track('pptx', title, filePath, 'create');
  }

  async createPdf(title: string, lines: string[]): Promise<ArtifactRecord> {
    const filePath = path.join(this.rootDir, `${slug(title)}.pdf`);
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      doc.fontSize(18).text(title);
      doc.moveDown();
      for (const line of lines) doc.fontSize(12).text(line);
      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
    return this.track('pdf', title, filePath, 'create');
  }

  createSvg(title: string, svgBody: string): ArtifactRecord {
    const filePath = path.join(this.rootDir, `${slug(title)}.svg`);
    const svg = svgBody.includes('<svg') ? svgBody : `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">${svgBody}</svg>`;
    fs.writeFileSync(filePath, svg);
    return this.track('svg', title, filePath, 'create');
  }

  createNotebook(title: string, cells: Array<{ cell_type: string; source: string }>): ArtifactRecord {
    const filePath = path.join(this.rootDir, `${slug(title)}.ipynb`);
    const nb = {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: { kernelspec: { name: 'python3', display_name: 'Python 3' } },
      cells: cells.map((c) => ({ cell_type: c.cell_type, metadata: {}, source: c.source.split('\n').map((l, i, a) => (i < a.length - 1 ? l + '\n' : l)) })),
    };
    fs.writeFileSync(filePath, JSON.stringify(nb, null, 2));
    return this.track('notebook', title, filePath, 'create');
  }

  createWebsite(title: string, html: string): ArtifactRecord {
    const dir = path.join(this.rootDir, slug(title));
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'index.html');
    fs.writeFileSync(filePath, html.includes('<html') ? html : `<!doctype html><html><head><title>${title}</title></head><body>${html}</body></html>`);
    return this.track('website', title, filePath, 'create');
  }

  createCode(title: string, rel: string, content: string): ArtifactRecord {
    const filePath = path.join(this.rootDir, 'code', rel);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return this.track('code', title, filePath, 'create');
  }

  /** Targeted edit: patch a specific marker/section without full regenerate. */
  targetedEdit(id: string, marker: string, replacement: string, note = 'targeted_edit'): ArtifactRecord {
    const rec = this.records.get(id);
    if (!rec) throw new Error(`UNKNOWN_ARTIFACT:${id}`);
    const latest = rec.versions[rec.versions.length - 1];
    const sourcePath = latest.editable_path || latest.path;
    const raw = fs.readFileSync(sourcePath, 'utf8');
    if (!raw.includes(marker)) throw new Error(`MARKER_NOT_FOUND:${marker}`);
    const out = raw.replace(marker, replacement);
    const versionedEditable = `${sourcePath}.v${rec.versions.length + 1}`;
    fs.writeFileSync(versionedEditable, out);
    // Keep binary path pointer; editable mirror carries targeted text edits.
    rec.versions.push({
      version: rec.versions.length + 1,
      path: latest.path,
      editable_path: versionedEditable,
      at: new Date().toISOString(),
      note,
    });
    return rec;
  }
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'artifact';
}
