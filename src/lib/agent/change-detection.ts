import { CompanyProfile, HistoryChange } from '../types';

export interface CompanySnapshotComparison {
  hasChanges: boolean;
  changes: HistoryChange[];
  summary: string;
}

export function detectCompanyChanges(
  current: CompanyProfile,
  previous?: Partial<CompanyProfile> | null
): CompanySnapshotComparison {
  const changes: HistoryChange[] = [];
  const now = new Date().toISOString();
  const primarySourceUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${current.organizationNumber}`;

  if (!previous) {
    return {
      hasChanges: false,
      changes: [],
      summary: 'Initial baseline profile created and verified with Brønnøysundregistrene.',
    };
  }

  // 1. Company Name Change
  if (previous.name && previous.name !== current.name) {
    changes.push({
      field: 'name',
      label: 'Legal Registered Name',
      oldValue: previous.name,
      newValue: current.name,
      detectedAt: now,
      sourceUrl: primarySourceUrl,
    });
  }

  // 2. Company Status Change
  if (previous.status && previous.status !== current.status) {
    changes.push({
      field: 'status',
      label: 'Company Status',
      oldValue: previous.status,
      newValue: current.status,
      detectedAt: now,
      sourceUrl: primarySourceUrl,
    });
  }

  // 3. Address Change
  const prevStreet = previous.businessAddress?.street;
  const currStreet = current.businessAddress?.street;
  const prevCity = previous.businessAddress?.city;
  const currCity = current.businessAddress?.city;

  if ((prevStreet && prevStreet !== currStreet) || (prevCity && prevCity !== currCity)) {
    changes.push({
      field: 'businessAddress',
      label: 'Registered Headquarters Address',
      oldValue: `${prevStreet || ''}, ${prevCity || ''}`.trim().replace(/^,|,$/g, ''),
      newValue: `${currStreet || ''}, ${currCity || ''}`.trim().replace(/^,|,$/g, ''),
      detectedAt: now,
      sourceUrl: primarySourceUrl,
    });
  }

  // 4. CEO / General Manager Change
  const prevCeo = previous.keyPeople?.find(
    (p) => p.role.toLowerCase().includes('daglig leder') || p.role.toLowerCase().includes('ceo')
  );
  const currCeo = current.keyPeople?.find(
    (p) => p.role.toLowerCase().includes('daglig leder') || p.role.toLowerCase().includes('ceo')
  );

  if (prevCeo && currCeo && prevCeo.name !== currCeo.name) {
    changes.push({
      field: 'ceo',
      label: 'General Manager (Daglig leder / CEO)',
      oldValue: prevCeo.name,
      newValue: currCeo.name,
      detectedAt: now,
      sourceUrl: currCeo.sourceUrl || primarySourceUrl,
    });
  }

  // 5. Board Chair Change
  const prevChair = previous.keyPeople?.find((p) => p.role.toLowerCase().includes('styreleder'));
  const currChair = current.keyPeople?.find((p) => p.role.toLowerCase().includes('styreleder'));

  if (prevChair && currChair && prevChair.name !== currChair.name) {
    changes.push({
      field: 'board_chair',
      label: 'Chairman of the Board (Styrets leder)',
      oldValue: prevChair.name,
      newValue: currChair.name,
      detectedAt: now,
      sourceUrl: currChair.sourceUrl || primarySourceUrl,
    });
  }

  // 6. Workforce / Employee Count Change
  const prevEmp = previous.employees?.count;
  const currEmp = current.employees?.count;

  if (prevEmp !== undefined && currEmp !== undefined && prevEmp !== currEmp && prevEmp !== null && currEmp !== null) {
    changes.push({
      field: 'employees',
      label: 'Reported Workforce (Aa-registeret)',
      oldValue: `${prevEmp} employees`,
      newValue: `${currEmp} employees`,
      detectedAt: now,
      sourceUrl: 'https://data.brreg.no/enhetsregisteret/api/enheter/' + current.organizationNumber,
    });
  }

  // 7. Website Change
  if (previous.website !== undefined && current.website !== undefined && previous.website !== current.website) {
    changes.push({
      field: 'website',
      label: 'Official Website Domain',
      oldValue: previous.website || 'None',
      newValue: current.website || 'None',
      detectedAt: now,
      sourceUrl: primarySourceUrl,
    });
  }

  // 8. Financial Year Update
  const prevYear = previous.financials?.year;
  const currYear = current.financials?.year;

  if (prevYear && currYear && prevYear !== currYear) {
    changes.push({
      field: 'financial_year',
      label: 'Audited Financials Period',
      oldValue: `FY ${prevYear} (${previous.financials?.operatingRevenueFormatted || 'N/A'})`,
      newValue: `FY ${currYear} (${current.financials?.operatingRevenueFormatted || 'N/A'})`,
      detectedAt: now,
      sourceUrl: current.financials?.sourceUrl || primarySourceUrl,
    });
  }

  const summary =
    changes.length > 0
      ? `Detected ${changes.length} verified updates since prior verification.`
      : 'No material changes detected; company identity and records remain verified.';

  return {
    hasChanges: changes.length > 0,
    changes,
    summary,
  };
}
