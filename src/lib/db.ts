import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { CompanyProfile, Fact, SourceRecord, ResearchHistoryRecord, HistoryChange } from './types';
import {
  isSupabaseServerConfigured,
  getSupabaseServerClient,
} from './supabase/server';
import {
  getCompanyByOrgNumberFromSupabase,
  saveCompanyProfileToSupabase,
  getDashboardStatsFromSupabase,
  getCompaniesListFromSupabase,
} from './supabase/db';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = process.env.DATABASE_URL
    ? path.resolve(process.cwd(), process.env.DATABASE_URL)
    : path.join(dbDir, 'signalpost.sqlite');

  const db = new DatabaseSync(dbPath);

  // Enable WAL mode and pragmas for performance
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS companies (
      organization_number TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      legal_form TEXT,
      registration_date TEXT,
      founding_date TEXT,
      industry_code TEXT,
      industry_desc TEXT,
      street TEXT,
      postal_code TEXT,
      city TEXT,
      country TEXT,
      website TEXT,
      phone TEXT,
      employees_count INTEGER,
      employees_date TEXT,
      business_description TEXT,
      executive_summary TEXT,
      financials_json TEXT,
      key_people_json TEXT,
      historical_names_json TEXT,
      last_researched_at TEXT NOT NULL,
      is_demo_mode INTEGER DEFAULT 0,
      profile_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS facts (
      id TEXT PRIMARY KEY,
      organization_number TEXT NOT NULL,
      field TEXT NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_title TEXT NOT NULL,
      source_date TEXT,
      retrieved_at TEXT NOT NULL,
      evidence TEXT NOT NULL,
      confidence REAL NOT NULL,
      first_seen TEXT,
      last_verified TEXT,
      verified INTEGER DEFAULT 1,
      rejected INTEGER DEFAULT 0,
      rejection_reason TEXT,
      FOREIGN KEY (organization_number) REFERENCES companies(organization_number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      organization_number TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      domain TEXT NOT NULL,
      source_type TEXT NOT NULL,
      published_date TEXT,
      retrieved_date TEXT NOT NULL,
      facts_count INTEGER DEFAULT 0,
      verification_status TEXT NOT NULL,
      rejection_reason TEXT,
      match_score REAL NOT NULL,
      match_breakdown_json TEXT,
      FOREIGN KEY (organization_number) REFERENCES companies(organization_number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS research_history (
      id TEXT PRIMARY KEY,
      organization_number TEXT NOT NULL,
      researched_at TEXT NOT NULL,
      facts_count INTEGER NOT NULL,
      sources_count INTEGER NOT NULL,
      average_confidence REAL NOT NULL,
      changes_json TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      FOREIGN KEY (organization_number) REFERENCES companies(organization_number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS http_cache (
      url_key TEXT PRIMARY KEY,
      response_data TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      cached_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS company_people (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      valid_from TEXT,
      valid_to TEXT,
      source_id TEXT,
      confidence REAL DEFAULT 95.0,
      FOREIGN KEY (company_id) REFERENCES companies(organization_number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_financials (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      financial_year TEXT NOT NULL,
      currency TEXT DEFAULT 'NOK',
      revenue REAL,
      operating_profit REAL,
      profit_loss REAL,
      assets REAL,
      equity REAL,
      liabilities REAL,
      employees INTEGER,
      source_id TEXT,
      retrieved_at TEXT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(organization_number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_events (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      event_date TEXT,
      source_id TEXT,
      confidence REAL DEFAULT 90.0,
      FOREIGN KEY (company_id) REFERENCES companies(organization_number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_snapshots (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      snapshot_date TEXT NOT NULL,
      profile_json TEXT NOT NULL,
      profile_hash TEXT,
      FOREIGN KEY (company_id) REFERENCES companies(organization_number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS research_runs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL,
      request_count INTEGER DEFAULT 0,
      source_count INTEGER DEFAULT 0,
      facts_found INTEGER DEFAULT 0,
      facts_verified INTEGER DEFAULT 0,
      errors TEXT,
      FOREIGN KEY (company_id) REFERENCES companies(organization_number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS request_logs (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      status_code INTEGER,
      response_time REAL,
      requested_at TEXT NOT NULL,
      cached INTEGER DEFAULT 0,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_facts_org ON facts(organization_number);
    CREATE INDEX IF NOT EXISTS idx_sources_org ON sources(organization_number);
    CREATE INDEX IF NOT EXISTS idx_history_org ON research_history(organization_number);
    CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
    CREATE INDEX IF NOT EXISTS idx_companies_last_researched ON companies(last_researched_at);
    CREATE INDEX IF NOT EXISTS idx_companies_industry_code ON companies(industry_code);
    CREATE INDEX IF NOT EXISTS idx_request_logs_company ON request_logs(company_id);
    CREATE INDEX IF NOT EXISTS idx_research_runs_company ON research_runs(company_id);
  `);

  dbInstance = db;
  return db;
}

// HTTP Response Caching (Aggressive caching to respect outbound limit)
export function getCachedHttp(url: string): { data: any; statusCode: number } | null {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT response_data, status_code, expires_at FROM http_cache WHERE url_key = ?');
    const row = stmt.get(url) as { response_data: string; status_code: number; expires_at: string } | undefined;

    if (!row) return null;

    if (new Date(row.expires_at).getTime() < Date.now()) {
      db.prepare('DELETE FROM http_cache WHERE url_key = ?').run(url);
      return null;
    }

    return {
      data: JSON.parse(row.response_data),
      statusCode: row.status_code,
    };
  } catch {
    return null;
  }
}

export function setCachedHttp(url: string, data: any, statusCode: number = 200, ttlSeconds: number = 86400): void {
  try {
    const db = getDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO http_cache (url_key, response_data, status_code, cached_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(url, JSON.stringify(data), statusCode, now.toISOString(), expiresAt);
  } catch (err) {
    console.error('Failed to write HTTP cache:', err);
  }
}

// Company Storage Operations

/**
 * Saves company profile, facts, sources, and delta history to Supabase (primary) and local store.
 */
export async function saveCompanyProfile(
  profile: CompanyProfile,
  facts: Fact[],
  sources: SourceRecord[],
  changes: HistoryChange[] = [],
  diagnostics?: { elapsedSeconds?: number; estimatedCostUsd?: number }
): Promise<void> {
  const org = profile.organizationNumber;
  const now = new Date().toISOString();

  // 1. Primary: Save to Supabase if configured
  if (isSupabaseServerConfigured()) {
    try {
      await saveCompanyProfileToSupabase(profile, facts, sources, changes, diagnostics);
    } catch (err) {
      console.error('Failed to save to Supabase, continuing to local store:', err);
    }
  }

  // 2. Synchronize local store
  try {
    const db = getDatabase();

    // Save company record
    db.prepare(`
      INSERT OR REPLACE INTO companies (
        organization_number, name, status, legal_form, registration_date, founding_date,
        industry_code, industry_desc, street, postal_code, city, country,
        website, phone, employees_count, employees_date, business_description,
        executive_summary, financials_json, key_people_json, historical_names_json,
        last_researched_at, is_demo_mode, profile_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      org,
      profile.name,
      profile.status,
      profile.legalForm,
      profile.registrationDate || null,
      profile.foundingDate || null,
      profile.industry?.code || null,
      profile.industry?.description || null,
      profile.businessAddress?.street || null,
      profile.businessAddress?.postalCode || null,
      profile.businessAddress?.city || null,
      profile.businessAddress?.country || 'Norway',
      profile.website || null,
      profile.phone || null,
      profile.employees?.count ?? null,
      profile.employees?.registrationDate || null,
      profile.businessDescription || null,
      profile.executiveSummary || null,
      profile.financials ? JSON.stringify(profile.financials) : null,
      JSON.stringify(profile.keyPeople || []),
      JSON.stringify(profile.historicalNames || []),
      now,
      profile.isDemoMode ? 1 : 0,
      JSON.stringify(profile)
    );

    // Clear existing facts and sources for fresh insert
    db.prepare('DELETE FROM facts WHERE organization_number = ?').run(org);
    db.prepare('DELETE FROM sources WHERE organization_number = ?').run(org);

    // Insert Facts
    const insertFact = db.prepare(`
      INSERT INTO facts (
        id, organization_number, field, label, value, category,
        source_url, source_title, source_date, retrieved_at, evidence,
        confidence, first_seen, last_verified, verified, rejected, rejection_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const f of facts) {
      const factId = f.id || `${org}-${f.field}-${Math.random().toString(36).substring(2, 7)}`;
      insertFact.run(
        factId,
        org,
        f.field,
        f.label,
        f.value,
        f.category,
        f.source_url,
        f.source_title,
        f.source_date || null,
        f.retrieved_at,
        f.evidence,
        f.confidence,
        f.first_seen || f.retrieved_at,
        f.last_verified || f.retrieved_at,
        f.verified ? 1 : 0,
        f.rejected ? 1 : 0,
        f.rejection_reason || null
      );
    }

    // Insert Sources
    const insertSource = db.prepare(`
      INSERT INTO sources (
        id, organization_number, url, title, domain, source_type,
        published_date, retrieved_date, facts_count, verification_status,
        rejection_reason, match_score, match_breakdown_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of sources) {
      insertSource.run(
        s.id,
        org,
        s.url,
        s.title,
        s.domain,
        s.sourceType,
        s.publishedDate || null,
        s.retrievedDate,
        s.factsExtractedCount,
        s.verificationStatus,
        s.rejectionReason || null,
        s.matchScore,
        s.matchBreakdown ? JSON.stringify(s.matchBreakdown) : null
      );
    }

    // Save history snapshot
    const avgConfidence = facts.length > 0
      ? facts.reduce((acc, f) => acc + f.confidence, 0) / facts.length
      : 0;

    const historyId = `hist-${org}-${Date.now()}`;
    db.prepare(`
      INSERT INTO research_history (
        id, organization_number, researched_at, facts_count, sources_count,
        average_confidence, changes_json, snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      historyId,
      org,
      now,
      facts.length,
      sources.length,
      avgConfidence,
      JSON.stringify(changes),
      JSON.stringify({
        employees: profile.employees?.count,
        revenue: profile.financials?.operatingRevenueFormatted,
        status: profile.status,
        website: profile.website,
        factsCount: facts.length,
      })
    );

    // Save into company_people
    db.prepare('DELETE FROM company_people WHERE company_id = ?').run(org);
    const insertPerson = db.prepare(`
      INSERT INTO company_people (id, company_id, name, role, valid_from, source_id, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of profile.keyPeople || []) {
      insertPerson.run(
        `p-${org}-${Math.random().toString(36).substring(2, 7)}`,
        org,
        p.name,
        p.role,
        p.appointedDate || null,
        p.sourceUrl || null,
        95.0
      );
    }

    // Save into company_financials
    if (profile.financials) {
      db.prepare('DELETE FROM company_financials WHERE company_id = ?').run(org);
      db.prepare(`
        INSERT INTO company_financials (
          id, company_id, financial_year, currency, revenue, operating_profit,
          profit_loss, assets, equity, liabilities, employees, source_id, retrieved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `fin-${org}-${profile.financials.year}`,
        org,
        profile.financials.year,
        profile.financials.currency || 'NOK',
        profile.financials.operatingRevenue ?? null,
        profile.financials.operatingProfit ?? null,
        profile.financials.netProfit ?? null,
        profile.financials.totalAssets ?? null,
        profile.financials.totalEquity ?? null,
        null,
        profile.employees?.count ?? null,
        profile.financials.sourceUrl || null,
        profile.financials.retrievedAt || now
      );
    }

    // Save into company_snapshots
    db.prepare(`
      INSERT INTO company_snapshots (id, company_id, snapshot_date, profile_json, profile_hash)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `snap-${org}-${Date.now()}`,
      org,
      now,
      JSON.stringify(profile),
      null
    );

    // Save into research_runs
    db.prepare(`
      INSERT INTO research_runs (
        id, company_id, started_at, completed_at, status,
        request_count, source_count, facts_found, facts_verified, errors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `run-${org}-${Date.now()}`,
      org,
      now,
      now,
      'completed',
      sources.length,
      sources.length,
      facts.length,
      facts.filter((f) => f.verified !== false).length,
      null
    );
  } catch (err) {
    console.error('Failed to write to local SQLite store:', err);
  }
}

/**
 * Logs outbound and cached HTTP requests for audit trail and daily request budget compliance
 */
export function logRequestRecord(entry: {
  companyId?: string;
  url: string;
  source: string;
  statusCode?: number;
  responseTimeMs?: number;
  cached?: boolean;
  error?: string;
}): void {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO request_logs (id, company_id, url, source, status_code, response_time, requested_at, cached, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entry.companyId || null,
      entry.url,
      entry.source,
      entry.statusCode ?? 200,
      entry.responseTimeMs ?? 0,
      new Date().toISOString(),
      entry.cached ? 1 : 0,
      entry.error || null
    );
  } catch {
    // Non-blocking logger
  }
}

/**
 * Retrieves company profile by organization number from Supabase or fallback store
 */
export async function getCompanyByOrgNumber(orgnr: string): Promise<CompanyProfile | null> {
  // 1. Try Supabase
  if (isSupabaseServerConfigured()) {
    try {
      const res = await getCompanyByOrgNumberFromSupabase(orgnr);
      if (res && res.company) {
        return res.company;
      }
    } catch (err) {
      console.warn('Supabase query error, falling back to local store:', err);
    }
  }

  // 2. Fallback to local store
  return getCompanyByOrgNumberSync(orgnr);
}

export function getCompanyByOrgNumberSync(orgnr: string): CompanyProfile | null {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT profile_json FROM companies WHERE organization_number = ?').get(orgnr) as
      | { profile_json: string }
      | undefined;

    if (!row) return null;
    return JSON.parse(row.profile_json);
  } catch (err) {
    console.error('Error fetching company:', err);
    return null;
  }
}

export async function getCompanyFacts(orgnr: string): Promise<Fact[]> {
  if (isSupabaseServerConfigured()) {
    try {
      const res = await getCompanyByOrgNumberFromSupabase(orgnr);
      if (res && res.facts) {
        return res.facts;
      }
    } catch {
      // fallback
    }
  }

  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM facts WHERE organization_number = ?').all(orgnr) as any[];
    return rows.map(r => ({
      id: r.id,
      field: r.field,
      label: r.label,
      value: r.value,
      category: r.category,
      source_url: r.source_url,
      source_title: r.source_title,
      source_date: r.source_date,
      retrieved_at: r.retrieved_at,
      evidence: r.evidence,
      confidence: Number(r.confidence),
      first_seen: r.first_seen,
      last_verified: r.last_verified,
      verified: Boolean(r.verified),
      rejected: Boolean(r.rejected),
      rejection_reason: r.rejection_reason,
    }));
  } catch {
    return [];
  }
}

export async function getCompanySources(orgnr: string): Promise<SourceRecord[]> {
  if (isSupabaseServerConfigured()) {
    try {
      const res = await getCompanyByOrgNumberFromSupabase(orgnr);
      if (res && res.sources) {
        return res.sources;
      }
    } catch {
      // fallback
    }
  }

  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM sources WHERE organization_number = ?').all(orgnr) as any[];
    return rows.map(r => ({
      id: r.id,
      url: r.url,
      title: r.title,
      domain: r.domain,
      sourceType: r.source_type,
      publishedDate: r.published_date,
      retrievedDate: r.retrieved_date,
      factsExtractedCount: r.facts_count,
      verificationStatus: r.verification_status,
      rejectionReason: r.rejection_reason,
      matchScore: Number(r.match_score),
      matchBreakdown: r.match_breakdown_json ? JSON.parse(r.match_breakdown_json) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function getCompanyHistory(orgnr: string): Promise<ResearchHistoryRecord[]> {
  if (isSupabaseServerConfigured()) {
    try {
      const res = await getCompanyByOrgNumberFromSupabase(orgnr);
      if (res && res.history) {
        return res.history;
      }
    } catch {
      // fallback
    }
  }

  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM research_history WHERE organization_number = ? ORDER BY researched_at DESC').all(orgnr) as any[];
    return rows.map(r => ({
      id: r.id,
      organizationNumber: r.organization_number,
      researchedAt: r.researched_at,
      factsCount: r.facts_count,
      sourcesCount: r.sources_count,
      averageConfidence: Number(r.average_confidence),
      changes: JSON.parse(r.changes_json || '[]'),
      snapshot: JSON.parse(r.snapshot_json || '{}'),
    }));
  } catch {
    return [];
  }
}

// Dashboard Statistics
export interface DashboardStats {
  companiesCount: number;
  verifiedFactsCount: number;
  sourcesCount: number;
  averageConfidence: number;
  rejectedSourcesCount: number;
  lastResearchedAt: string | null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (isSupabaseServerConfigured()) {
    try {
      const stats = await getDashboardStatsFromSupabase();
      if (stats && stats.companiesCount > 0) {
        return stats;
      }
    } catch (err) {
      console.warn('Supabase dashboard stats failed, using fallback:', err);
    }
  }

  return getDashboardStatsSync();
}

export function getDashboardStatsSync(): DashboardStats {
  try {
    const db = getDatabase();
    const compCount = (db.prepare('SELECT COUNT(*) as count FROM companies').get() as any)?.count || 0;
    const factsCount = (db.prepare('SELECT COUNT(*) as count FROM facts WHERE verified = 1 AND rejected = 0').get() as any)?.count || 0;
    const sourcesCount = (db.prepare('SELECT COUNT(*) as count FROM sources').get() as any)?.count || 0;
    const rejectedCount = (db.prepare("SELECT COUNT(*) as count FROM sources WHERE verification_status = 'rejected'").get() as any)?.count || 0;
    const avgConf = (db.prepare('SELECT AVG(confidence) as avg FROM facts WHERE verified = 1').get() as any)?.avg || 0;
    const lastTime = (db.prepare('SELECT MAX(last_researched_at) as lastTime FROM companies').get() as any)?.lastTime || null;

    return {
      companiesCount: compCount,
      verifiedFactsCount: factsCount,
      sourcesCount: sourcesCount,
      averageConfidence: Math.round(avgConf || 96),
      rejectedSourcesCount: rejectedCount,
      lastResearchedAt: lastTime,
    };
  } catch {
    return {
      companiesCount: 0,
      verifiedFactsCount: 0,
      sourcesCount: 0,
      averageConfidence: 0,
      rejectedSourcesCount: 0,
      lastResearchedAt: null,
    };
  }
}

// Paginated company listing for dashboard table
export async function getCompaniesList(options: {
  search?: string;
  sortBy?: 'name' | 'last_researched_at' | 'status' | 'confidence';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{ companies: any[]; total: number }> {
  if (isSupabaseServerConfigured()) {
    try {
      const supaList = await getCompaniesListFromSupabase(options);
      if (supaList) {
        return supaList;
      }
    } catch (err) {
      console.warn('Supabase getCompaniesList failed, using fallback:', err);
    }
  }

  return getCompaniesListSync(options);
}

export function getCompaniesListSync(options: {
  search?: string;
  sortBy?: 'name' | 'last_researched_at' | 'status' | 'confidence';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): { companies: any[]; total: number } {
  try {
    const db = getDatabase();
    const { search = '', sortBy = 'last_researched_at', sortOrder = 'desc', limit = 20, offset = 0 } = options;

    let whereClause = '';
    const params: any[] = [];

    if (search.trim()) {
      whereClause = 'WHERE name LIKE ? OR organization_number LIKE ? OR industry_desc LIKE ?';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const total = (db.prepare(`SELECT COUNT(*) as count FROM companies ${whereClause}`).get(...params) as any)?.count || 0;

    let orderField = 'last_researched_at';
    if (sortBy === 'name') orderField = 'name';
    if (sortBy === 'status') orderField = 'status';

    const sql = `
      SELECT organization_number, name, status, legal_form, industry_desc,
             employees_count, last_researched_at, is_demo_mode
      FROM companies
      ${whereClause}
      ORDER BY ${orderField} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(sql).all(...params, limit, offset) as any[];

    // Enrich rows with facts count and average confidence
    const enriched = rows.map(r => {
      const stats = db.prepare(`
        SELECT COUNT(*) as factsCount, AVG(confidence) as avgConf
        FROM facts WHERE organization_number = ?
      `).get(r.organization_number) as any;

      return {
        ...r,
        factsCount: stats?.factsCount || 0,
        averageConfidence: Math.round(stats?.avgConf || 95),
      };
    });

    return { companies: enriched, total };
  } catch (err) {
    console.error('Failed to list companies:', err);
    return { companies: [], total: 0 };
  }
}
