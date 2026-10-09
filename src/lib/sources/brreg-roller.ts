import { SourceProvider, SourceFetchResult, SourceIdentitySignals } from './types';
import { Fact, KeyPerson, SourceRecord } from '../types';
import { getCachedHttp, setCachedHttp } from '../db';

export class BrregRollerProvider implements SourceProvider {
  id = 'brreg-roller';
  name = 'Brønnøysundregistrene (Roller og Verv)';
  sourceType: SourceRecord['sourceType'] = 'roles_register';
  isPermittedPublicSource = true;

  async fetchSource(orgNumber: string): Promise<SourceFetchResult & { keyPeople?: KeyPerson[] }> {
    const url = `https://data.brreg.no/enhetsregisteret/api/enheter/${orgNumber}/roller`;
    const retrievedDate = new Date().toISOString();

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

        if (response.status === 404 || response.status === 204) {
          return {
            sourceRecord: {
              id: `src-${this.id}-${orgNumber}`,
              url,
              title: 'Roller og Verv Register',
              domain: 'data.brreg.no',
              sourceType: this.sourceType,
              retrievedDate,
              factsExtractedCount: 0,
              verificationStatus: 'verified',
              matchScore: 100,
            },
            identitySignals: { organizationNumber: orgNumber },
            extractedFacts: [],
            keyPeople: [],
            success: true,
          };
        }

        if (!response.ok) {
          throw new Error(`Roller API HTTP ${response.status}`);
        }

        data = await response.json();
        setCachedHttp(url, data, response.status, 86400 * 3); // Cache roles for 3 days
      } catch (err: any) {
        return {
          sourceRecord: {
            id: `src-${this.id}-${orgNumber}`,
            url,
            title: 'Roller og Verv',
            domain: 'data.brreg.no',
            sourceType: this.sourceType,
            retrievedDate,
            factsExtractedCount: 0,
            verificationStatus: 'needs_verification',
            rejectionReason: `Could not retrieve roles: ${err.message}`,
            matchScore: 0,
          },
          identitySignals: {},
          extractedFacts: [],
          keyPeople: [],
          success: false,
          error: err.message,
        };
      }
    }

    const keyPeople: KeyPerson[] = [];
    const rollegrupper = data.rollegrupper || [];

    for (const group of rollegrupper) {
      const groupName = group.type?.beskrivelse || 'Roller';
      const roller = group.roller || [];

      for (const role of roller) {
        if (role.fratradt) continue; // Skip resigned persons

        let name = '';
        if (role.person?.navn) {
          const p = role.person.navn;
          name = `${p.fornavn || ''} ${p.mellomnavn ? p.mellomnavn + ' ' : ''}${p.etternavn || ''}`.trim();
        } else if (role.enhet?.navn) {
          name = Array.isArray(role.enhet.navn) ? role.enhet.navn.join(' ') : role.enhet.navn;
        }

        if (name) {
          keyPeople.push({
            name,
            role: role.type?.beskrivelse || groupName,
            roleCode: role.type?.kode,
            roleGroup: groupName,
            appointedDate: role.valgtAv || null,
            resigned: Boolean(role.fratradt),
            sourceUrl: url,
            sourceTitle: 'Brønnøysundregistrene - Roller og Verv',
          });
        }
      }
    }

    const sourceRecord: SourceRecord = {
      id: `src-${this.id}-${orgNumber}`,
      url,
      title: 'Brønnøysundregistrene (Registered Officers & Board)',
      domain: 'data.brreg.no',
      sourceType: this.sourceType,
      publishedDate: null,
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

    const facts = this.extractFacts(keyPeople, orgNumber, sourceRecord);
    sourceRecord.factsExtractedCount = facts.length;

    return {
      sourceRecord,
      identitySignals: { organizationNumber: orgNumber },
      extractedFacts: facts,
      keyPeople,
      rawContent: JSON.stringify(data),
      success: true,
    };
  }

  extractCompanyIdentity(data: any): SourceIdentitySignals {
    return {};
  }

  extractFacts(keyPeople: KeyPerson[], orgNumber: string, source: SourceRecord): Fact[] {
    const facts: Fact[] = [];
    const now = source.retrievedDate;

    // CEO / Daglig leder
    const ceo = keyPeople.find(p => p.roleGroup === 'Daglig leder' || p.role.toLowerCase().includes('daglig leder'));
    if (ceo) {
      facts.push({
        id: `${orgNumber}-ceo`,
        field: 'ceo',
        label: 'Managing Director (Daglig leder)',
        value: ceo.name,
        category: 'people',
        source_url: source.url,
        source_title: source.title,
        source_date: now,
        retrieved_at: now,
        evidence: `Official corporate officer registration: ${ceo.name} is registered as Daglig leder in the Register of Business Enterprises.`,
        confidence: 99,
        first_seen: now,
        last_verified: now,
        verified: true,
      });
    }

    // Chair of the Board / Styrets leder
    const chair = keyPeople.find(p => p.role.toLowerCase().includes('styrets leder') || p.role.toLowerCase().includes('leder'));
    if (chair) {
      facts.push({
        id: `${orgNumber}-board-chair`,
        field: 'board_chair',
        label: 'Chair of the Board (Styrets leder)',
        value: chair.name,
        category: 'people',
        source_url: source.url,
        source_title: source.title,
        source_date: now,
        retrieved_at: now,
        evidence: `Official board registration: ${chair.name} is elected and registered as Styrets leder.`,
        confidence: 99,
        first_seen: now,
        last_verified: now,
        verified: true,
      });
    }

    // Auditor / Revisor
    const auditor = keyPeople.find(p => p.roleGroup === 'Revisor' || p.role.toLowerCase().includes('revisor'));
    if (auditor) {
      facts.push({
        id: `${orgNumber}-auditor`,
        field: 'auditor',
        label: 'Elected Auditor',
        value: auditor.name,
        category: 'governance',
        source_url: source.url,
        source_title: source.title,
        source_date: now,
        retrieved_at: now,
        evidence: `Statutory auditor recorded in company register: ${auditor.name}.`,
        confidence: 99,
        first_seen: now,
        last_verified: now,
        verified: true,
      });
    }

    return facts;
  }
}
