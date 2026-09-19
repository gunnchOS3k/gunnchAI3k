import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface PairingMaterial {
  code: string;
  expires_at: number;
  hash: string;
}

export interface SessionRecord {
  token: string;
  token_hash: string;
  created_at: number;
  expires_at: number;
  client_label: string;
}

function storeDir(): string {
  const d = path.join(os.homedir(), '.gunnchai', 'nearby_edge');
  fs.mkdirSync(d, { recursive: true, mode: 0o700 });
  return d;
}

function hashSecret(value: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(value).digest('hex');
}

export class PairingService {
  private pairing: PairingMaterial | null = null;
  private readonly salt: string;
  private readonly ttlMs: number;

  constructor(opts?: { ttlMs?: number; salt?: string }) {
    this.ttlMs = opts?.ttlMs ?? 120_000;
    const saltPath = path.join(storeDir(), 'pairing_salt');
    if (opts?.salt) {
      this.salt = opts.salt;
    } else if (fs.existsSync(saltPath)) {
      this.salt = fs.readFileSync(saltPath, 'utf8').trim();
    } else {
      this.salt = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(saltPath, this.salt, { mode: 0o600 });
    }
  }

  /** Owner-mediated one-time code — never commit plaintext. */
  mintPairingCode(): { code: string; expires_at: number } {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expires_at = Date.now() + this.ttlMs;
    this.pairing = { code, expires_at, hash: hashSecret(code, this.salt) };
    return { code, expires_at };
  }

  consumePairingCode(code: string): boolean {
    if (!this.pairing) return false;
    if (Date.now() > this.pairing.expires_at) {
      this.pairing = null;
      return false;
    }
    const ok = hashSecret(code.trim().toUpperCase(), this.salt) === this.pairing.hash;
    if (ok) this.pairing = null;
    return ok;
  }
}

export class SessionAuth {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly salt: string;
  private readonly sessionTtlMs: number;

  constructor(opts?: { salt?: string; sessionTtlMs?: number }) {
    this.sessionTtlMs = opts?.sessionTtlMs ?? 3_600_000;
    this.salt = opts?.salt ?? crypto.randomBytes(32).toString('hex');
  }

  createSession(client_label: string): SessionRecord {
    const token = crypto.randomBytes(24).toString('base64url');
    const rec: SessionRecord = {
      token,
      token_hash: hashSecret(token, this.salt),
      created_at: Date.now(),
      expires_at: Date.now() + this.sessionTtlMs,
      client_label,
    };
    this.sessions.set(rec.token_hash, rec);
    return rec;
  }

  validate(bearer: string | undefined): SessionRecord | null {
    if (!bearer) return null;
    const token = bearer.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    const hash = hashSecret(token, this.salt);
    const rec = this.sessions.get(hash);
    if (!rec) return null;
    if (Date.now() > rec.expires_at) {
      this.sessions.delete(hash);
      return null;
    }
    return rec;
  }

  revoke(bearer: string | undefined): boolean {
    const rec = this.validate(bearer);
    if (!rec) return false;
    this.sessions.delete(rec.token_hash);
    return true;
  }

  clearAll(): void {
    this.sessions.clear();
  }

  size(): number {
    return this.sessions.size;
  }
}
