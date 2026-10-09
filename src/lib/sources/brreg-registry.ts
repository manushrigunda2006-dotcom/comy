import { SourceProvider, SourceFetchResult, SourceIdentitySignals } from './types';
import { Fact, SourceRecord } from '../types';
import { getCachedHttp, setCachedHttp } from '../db';

export class BrregRegistryProvider implements SourceProvider {
  id = 'brreg-enhetsregisteret';
  name = 'Brønnøysundregistrene (Enhetsregisteret)';
  sourceType: SourceRecord['sourceType'] = 'official_registry';
  isPermittedPublicSource = true;

  async fetchSource(orgNumber: string): Promise<SourceFetchResult> {
    const url = `https://data.brreg.no/enhetsregisteret/api/enheter/${orgNumber}`;
    const retrievedDate = new Date().toISOString();

    // Check cache
    const cached = getCachedHttp(url);
    let data: any = cached?.data;

    if (!data) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Cherry-Research-Agent/1.0 (+https://cherry.no)',
          },
        });

        if (response.status === 404) {
          return {
            sourceRecord: {
              id: `src-${this.id}-${orgNumber}`,
              url,
              title: 'Enhetsregisteret - Norwegian Central Coordinating Register',
              domain: 'data.brreg.no',
              sourceType: this.sourceType,
              retrievedDate,
              factsExtractedCount: 0,
              verificationStatus: 'rejected',
              rejectionReason: 'Organization not found in Enhetsregisteret (404)',
              matchScore: 0,
            },
            identitySignals: {},
            extractedFacts: [],
            success: false,
            error:
              'Cherry could not verify this organization as a Norwegian company from the available permitted public sources.',
          };
        }

        if (!response.ok) {
          throw new Error(`Enhetsregisteret API HTTP ${response.status}`);
        }

        data = await response.json();
        // Cache for 24 hours
        setCachedHttp(url, data, response.status, 86400);
      } catch (err: any) {
        return {
          sourceRecord: {
            id: `src-${this.id}-${orgNumber}`,
            url,
            title: 'Enhetsregisteret',
            domain: 'data.brreg.no',
            sourceType: this.sourceType,
            retrievedDate,
            factsExtractedCount: 0,
            verificationStatus: 'rejected',
            rejectionReason: `Network error: ${err.message}`,
            matchScore: 0,
          },
          identitySignals: {},
          extractedFacts: [],
          success: false,
          error: err.message,
        };
      }
    }

    const sourceRecord: SourceRecord = {
      id: `src-${this.id}-${orgNumber}`,
      url,
      title: 'Brønnøysundregistrene - Enhetsregisteret (Official Central Register)',
      domain: 'data.brreg.no',
      sourceType: this.sourceType,
      publishedDate: data.registreringsdatoEnhetsregisteret || null,
      retrievedDate,
      factsExtractedCount: 0,
      verificationStatus: 'verified',
      matchScore: 100,
      matchBreakdown: {
        orgNumberMatch: 50,
        nameMatch: 20,
        domainMatch: 10,
        addressMatch: 10,
        identifierMatch: 10,
        totalScore: 100,
        verified: true,
      },
    };

    const identitySignals = this.extractCompanyIdentity(data);
    const facts = this.extractFacts(data, orgNumber, sourceRecord);
    sourceRecord.factsExtractedCount = facts.length;

    return {
      sourceRecord,
      identitySignals,
      extractedFacts: facts,
      rawContent: JSON.stringify(data),
      success: true,
    };
  }

  extractCompanyIdentity(data: any): SourceIdentitySignals {
    const street = data.forretningsadresse?.adresse?.join(', ') || '';
    const postal = data.forretningsadresse?.postnummer || '';
    const city = data.forretningsadresse?.poststed || '';

    return {
      organizationNumber: data.organisasjonsnummer,
      companyName: data.navn,
      domain: data.hjemmeside ? data.hjemmeside.replace(/^https?:\/\//, '') : null,
      address: `${street} ${postal} ${city}`.trim(),
      rawText: `${data.navn} ${data.organisasjonsnummer} ${street} ${city} ${data.organisasjonsform?.beskrivelse || ''}`,
    };
  }

  extractFacts(data: any, orgNumber: string, source: SourceRecord): Fact[] {
    const facts: Fact[] = [];
    const now = source.retrievedDate;
    const pubDate = data.registreringsdatoEnhetsregisteret || null;

    // 1. Legal Company Name
    if (data.navn) {
      facts.push({
        id: `${orgNumber}-name`,
        field: 'legal_name',
        label: 'Legal Name',
        value: data.navn,
        category: 'overview',
        source_url: source.url,
        source_title: source.title,
        source_date: pubDate,
        retrieved_at: now,
        evidence: `Official registration record in Enhetsregisteret: legal name registered as "${data.navn}".`,
        confidence: 100,
        first_seen: pubDate || now,
        last_verified: now,
        verified: true,
      });
    }

    // 2. Organization Number
    if (data.organisasjonsnummer) {
      facts.push({
        id: `${orgNumber}-org-number`,
        field: 'organization_number',
        label: 'Organization Number',
        value: data.organisasjonsnummer,
        category: 'overview',
        source_url: source.url,
        source_title: source.title,
        source_date: pubDate,
        retrieved_at: now,
        evidence: `National 9-digit entity registration number assigned by Brønnøysundregistrene.`,
        confidence: 100,
        first_seen: pubDate || now,
        last_verified: now,
        verified: true,
      });
    }

    // 3. Legal Form
    if (data.organisasjonsform?.beskrivelse) {
      facts.push({
        id: `${orgNumber}-legal-form`,
        field: 'legal_form',
        label: 'Legal Form',
        value: `${data.organisasjonsform.beskrivelse} (${data.organisasjonsform.kode})`,
        category: 'overview',
        source_url: source.url,
        source_title: source.title,
        source_date: pubDate,
        retrieved_at: now,
        evidence: `Statutory organizational form registered under code ${data.organisasjonsform.kode}: ${data.organisasjonsform.beskrivelse}.`,
        confidence: 99,
        first_seen: pubDate || now,
        last_verified: now,
        verified: true,
      });
    }

    // 4. Status
    let statusText = 'Active';
    let statusEvidence = 'Entity is actively registered with no ongoing liquidation or bankruptcy proceedings.';
    if (data.konkurs) {
      statusText = 'Bankruptcy';
      statusEvidence = 'Official registry records state that bankruptcy proceedings (konkurs) have been opened.';
    } else if (data.underAvvikling) {
      statusText = 'Liquidation';
      statusEvidence = 'Official registry records entity as currently undergoing liquidation (under avvikling).';
    } else if (data.underTvangsavviklingEllerTvangsopplosning) {
      statusText = 'Compulsory Liquidation';
      statusEvidence = 'Official registry records compulsory liquidation or dissolution orders.';
    }

    facts.push({
      id: `${orgNumber}-status`,
      field: 'status',
      label: 'Status',
      value: statusText,
      category: 'overview',
      source_url: source.url,
      source_title: source.title,
      source_date: now,
      retrieved_at: now,
      evidence: statusEvidence,
      confidence: 100,
      first_seen: now,
      last_verified: now,
      verified: true,
    });

    // 5. Registration Date
    if (data.registreringsdatoEnhetsregisteret) {
      facts.push({
        id: `${orgNumber}-reg-date`,
        field: 'registration_date',
        label: 'Registration Date',
        value: data.registreringsdatoEnhetsregisteret,
        category: 'overview',
        source_url: source.url,
        source_title: source.title,
        source_date: data.registreringsdatoEnhetsregisteret,
        retrieved_at: now,
        evidence: `Formally recorded in the Central Coordinating Register for Legal Entities on ${data.registreringsdatoEnhetsregisteret}.`,
        confidence: 100,
        first_seen: data.registreringsdatoEnhetsregisteret,
        last_verified: now,
        verified: true,
      });
    }

    // 6. Founded Date
    if (data.stiftelsesdato) {
      facts.push({
        id: `${orgNumber}-founding-date`,
        field: 'founding_date',
        label: 'Founded Date',
        value: data.stiftelsesdato,
        category: 'overview',
        source_url: source.url,
        source_title: source.title,
        source_date: data.stiftelsesdato,
        retrieved_at: now,
        evidence: `Legal establishment date (stiftelsesdato) registered as ${data.stiftelsesdato}.`,
        confidence: 100,
        first_seen: data.stiftelsesdato,
        last_verified: now,
        verified: true,
      });
    }

    // 7. Industry / NACE Code
    if (data.naeringskode1?.beskrivelse) {
      facts.push({
        id: `${orgNumber}-industry`,
        field: 'industry',
        label: 'Primary Industry',
        value: `${data.naeringskode1.kode} - ${data.naeringskode1.beskrivelse}`,
        category: 'business',
        source_url: source.url,
        source_title: source.title,
        source_date: pubDate,
        retrieved_at: now,
        evidence: `Official NACE industry classification registered as code ${data.naeringskode1.kode}: "${data.naeringskode1.beskrivelse}".`,
        confidence: 99,
        first_seen: pubDate || now,
        last_verified: now,
        verified: true,
      });
    }

    // 8. Registered Business Address
    if (data.forretningsadresse) {
      const parts = [
        ...(data.forretningsadresse.adresse || []),
        `${data.forretningsadresse.postnummer || ''} ${data.forretningsadresse.poststed || ''}`.trim(),
        data.forretningsadresse.kommune ? `Kommune: ${data.forretningsadresse.kommune}` : '',
        data.forretningsadresse.land || 'Norge'
      ].filter(Boolean);

      facts.push({
        id: `${orgNumber}-address`,
        field: 'business_address',
        label: 'Business Address',
        value: parts.join(', '),
        category: 'overview',
        source_url: source.url,
        source_title: source.title,
        source_date: pubDate,
        retrieved_at: now,
        evidence: `Registered commercial headquarters address from official public records.`,
        confidence: 100,
        first_seen: pubDate || now,
        last_verified: now,
        verified: true,
      });
    }

    // 9. Employee Count (from NAV Aa-registeret via Enhetsregisteret)
    if (data.antallAnsatte !== undefined && data.antallAnsatte !== null) {
      const empDate = data.registreringsdatoAntallAnsatteEnhetsregisteret || data.registreringsdatoAntallAnsatteNAVAaregisteret || null;
      facts.push({
        id: `${orgNumber}-employees`,
        field: 'employees_count',
        label: 'Registered Employees',
        value: String(data.antallAnsatte),
        category: 'business',
        source_url: source.url,
        source_title: source.title,
        source_date: empDate,
        retrieved_at: now,
        evidence: `Official employee count reported to NAV State Employer/Employee Register (Aa-registeret), registered on ${empDate || 'latest report'}.`,
        confidence: 98,
        first_seen: empDate || now,
        last_verified: now,
        verified: true,
      });
    }

    // 10. Official Website
    if (data.hjemmeside) {
      facts.push({
        id: `${orgNumber}-website`,
        field: 'website',
        label: 'Official Website',
        value: data.hjemmeside.startsWith('http') ? data.hjemmeside : `https://${data.hjemmeside}`,
        category: 'overview',
        source_url: source.url,
        source_title: source.title,
        source_date: pubDate,
        retrieved_at: now,
        evidence: `Domain registered by entity in the official business registry: "${data.hjemmeside}".`,
        confidence: 97,
        first_seen: pubDate || now,
        last_verified: now,
        verified: true,
      });
    }

    // 11. Share Capital
    if (data.kapital?.belop) {
      const formattedAmount = `${new Intl.NumberFormat('no-NO').format(data.kapital.belop)} ${data.kapital.valuta || 'NOK'}`;
      facts.push({
        id: `${orgNumber}-share-capital`,
        field: 'share_capital',
        label: 'Share Capital',
        value: formattedAmount,
        category: 'financial',
        source_url: source.url,
        source_title: source.title,
        source_date: data.kapital.innfortDato || null,
        retrieved_at: now,
        evidence: `Official registered equity capital of ${formattedAmount} entered on ${data.kapital.innfortDato || 'registration'}.`,
        confidence: 99,
        first_seen: data.kapital.innfortDato || now,
        last_verified: now,
        verified: true,
      });
    }

    // 12. Corporate Purpose / Activity
    const purposeText = (data.vedtektsfestetFormaal || data.aktivitet || []).join(' ').trim();
    if (purposeText) {
      facts.push({
        id: `${orgNumber}-purpose`,
        field: 'business_purpose',
        label: 'Statutory Purpose',
        value: purposeText,
        category: 'business',
        source_url: source.url,
        source_title: source.title,
        source_date: data.vedtektsdato || pubDate,
        retrieved_at: now,
        evidence: `Articles of association corporate purpose (vedtektsfestet formål) registered on ${data.vedtektsdato || 'filing'}.`,
        confidence: 98,
        first_seen: data.vedtektsdato || now,
        last_verified: now,
        verified: true,
      });
    }

    return facts;
  }
}
