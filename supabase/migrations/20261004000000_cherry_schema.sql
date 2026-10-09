-- ====================================================================
-- CHERRY - NORWEGIAN COMPANY INTELLIGENCE AGENT
-- Supabase PostgreSQL Database Migration Schema
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. TABLE: companies
-- Primary registry for Norwegian companies identified by 9-digit org number
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_number TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    legal_form TEXT,
    status TEXT DEFAULT 'Active',
    registration_date DATE,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT DEFAULT 'Norway',
    website TEXT,
    industry TEXT,
    business_description TEXT,
    employee_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_verified_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes on companies
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_organization_number ON public.companies(organization_number);
CREATE INDEX IF NOT EXISTS idx_companies_company_name ON public.companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON public.companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_last_verified_at ON public.companies(last_verified_at DESC);

-- ====================================================================
-- 2. TABLE: sources
-- Public and statutory sources evaluated by Cherry
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    source_title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    domain TEXT NOT NULL,
    publication_date DATE,
    retrieved_at TIMESTAMPTZ DEFAULT now(),
    verification_status TEXT DEFAULT 'verified',
    company_match_score NUMERIC(5, 2) DEFAULT 100.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sources_company_id ON public.sources(company_id);
CREATE INDEX IF NOT EXISTS idx_sources_verification_status ON public.sources(verification_status);

-- ====================================================================
-- 3. TABLE: company_facts
-- Granular, verified facts supported by evidence and citation
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.company_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    fact_type TEXT NOT NULL,
    fact_name TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    confidence NUMERIC(5, 2) NOT NULL,
    verification_status TEXT DEFAULT 'verified',
    evidence TEXT,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    source_date DATE,
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_verified TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_facts_company_id ON public.company_facts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_facts_fact_type ON public.company_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_company_facts_confidence ON public.company_facts(confidence);

-- ====================================================================
-- 4. TABLE: financial_data
-- Audited, evidence-backed annual corporate statements (Regnskapsregisteret)
-- Never estimated or fabricated
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.financial_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    financial_year INTEGER NOT NULL,
    revenue NUMERIC(15, 2),
    profit NUMERIC(15, 2),
    currency TEXT DEFAULT 'NOK',
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    source_date DATE,
    verified BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_company_financial_year UNIQUE (company_id, financial_year)
);

CREATE INDEX IF NOT EXISTS idx_financial_data_company_id ON public.financial_data(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_data_year ON public.financial_data(financial_year DESC);

-- ====================================================================
-- 5. TABLE: research_history
-- Full audit trail of agent research passes and delta changes
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.research_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    research_date TIMESTAMPTZ DEFAULT now(),
    facts_found INTEGER DEFAULT 0,
    facts_verified INTEGER DEFAULT 0,
    sources_checked INTEGER DEFAULT 0,
    sources_rejected INTEGER DEFAULT 0,
    estimated_cost NUMERIC(8, 4) DEFAULT 0.0000,
    processing_time NUMERIC(8, 2) DEFAULT 0.00,
    changes_detected JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_history_company_id ON public.research_history(company_id);
CREATE INDEX IF NOT EXISTS idx_research_history_date ON public.research_history(research_date DESC);

-- ====================================================================
-- 6. TABLE: bulk_research_jobs
-- Controlled bulk research progression and budget compliance tracking
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bulk_research_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'pending',
    total_companies INTEGER DEFAULT 0,
    processed_companies INTEGER DEFAULT 0,
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    verified_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    outbound_requests_count INTEGER DEFAULT 0,
    cost_usd NUMERIC(8, 4) DEFAULT 0.0000,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- 7. TRIGGER: update updated_at on companies
-- ====================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_companies_updated_at ON public.companies;
CREATE TRIGGER trigger_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- Public read-only; server-side authenticated writes via service_role
-- ====================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_research_jobs ENABLE ROW LEVEL SECURITY;

-- Select policies (Public / Anon read access)
DROP POLICY IF EXISTS "Public can view companies" ON public.companies;
CREATE POLICY "Public can view companies" ON public.companies
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view company facts" ON public.company_facts;
CREATE POLICY "Public can view company facts" ON public.company_facts
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view sources" ON public.sources;
CREATE POLICY "Public can view sources" ON public.sources
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view financial data" ON public.financial_data;
CREATE POLICY "Public can view financial data" ON public.financial_data
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view research history" ON public.research_history;
CREATE POLICY "Public can view research history" ON public.research_history
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view bulk jobs" ON public.bulk_research_jobs;
CREATE POLICY "Public can view bulk jobs" ON public.bulk_research_jobs
    FOR SELECT TO public USING (true);

-- Mutation policies (Service Role only)
DROP POLICY IF EXISTS "Service role can mutate companies" ON public.companies;
CREATE POLICY "Service role can mutate companies" ON public.companies
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can mutate facts" ON public.company_facts;
CREATE POLICY "Service role can mutate facts" ON public.company_facts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can mutate sources" ON public.sources;
CREATE POLICY "Service role can mutate sources" ON public.sources
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can mutate financials" ON public.financial_data;
CREATE POLICY "Service role can mutate financials" ON public.financial_data
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can mutate history" ON public.research_history;
CREATE POLICY "Service role can mutate history" ON public.research_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can mutate bulk jobs" ON public.bulk_research_jobs;
CREATE POLICY "Service role can mutate bulk jobs" ON public.bulk_research_jobs
    FOR ALL TO service_role USING (true) WITH CHECK (true);
