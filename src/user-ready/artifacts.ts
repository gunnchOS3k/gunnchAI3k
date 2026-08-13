/**
 * First-class artifact outputs (Claude Artifacts / Canvas deliverable class).
 * Writes files; does not claim a visual Canvas UI.
 */

import * as fs from 'node:fs';
import { ArtifactCreator, type ArtifactRecord } from '../phase_xiv/artifacts/creator';

export interface ArtifactAssistResult {
  record: ArtifactRecord;
  exists: boolean;
  kind: ArtifactRecord['kind'];
}

export class ArtifactAssist {
  readonly creator: ArtifactCreator;

  constructor(rootDir: string) {
    this.creator = new ArtifactCreator(rootDir);
  }

  async fromRequest(kind: ArtifactRecord['kind'], title: string, body: string): Promise<ArtifactAssistResult> {
    let record: ArtifactRecord;
    switch (kind) {
      case 'docx':
        record = await this.creator.createDocx(title, body.split('\n'));
        break;
      case 'pdf':
        record = await this.creator.createPdf(title, body.split('\n'));
        break;
      case 'code':
        record = this.creator.createCode(title, `${slug(title)}.ts`, body);
        break;
      case 'website':
        record = this.creator.createWebsite(title, body);
        break;
      case 'notebook':
        record = this.creator.createNotebook(title, [{ cell_type: 'markdown', source: body }]);
        break;
      case 'svg':
        record = this.creator.createSvg(title, body);
        break;
      case 'xlsx':
        record = this.creator.createXlsx(title, body.split('\n').map((line) => line.split(',')));
        break;
      case 'pptx':
        record = await this.creator.createPptx(title, body.split('\n').filter(Boolean));
        break;
      default:
        throw new Error(`UNSUPPORTED_ARTIFACT_KIND:${kind}`);
    }
    const latest = record.versions[record.versions.length - 1];
    return {
      record,
      exists: fs.existsSync(latest.path),
      kind: record.kind,
    };
  }

  targetedEdit(id: string, marker: string, replacement: string): ArtifactAssistResult {
    const record = this.creator.targetedEdit(id, marker, replacement);
    const latest = record.versions[record.versions.length - 1];
    const probe = latest.editable_path || latest.path;
    return {
      record,
      exists: fs.existsSync(probe),
      kind: record.kind,
    };
  }
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artifact';
}
