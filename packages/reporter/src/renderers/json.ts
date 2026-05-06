import type { VibeReport } from '../types.js';

export function renderJson(report: VibeReport): string {
  // Serialize the report, converting the Map to an object
  const serializable = {
    ...report,
    correlated: {
      rootCauses: report.correlated.rootCauses,
      standalone: report.correlated.standalone,
      contributingMap: Object.fromEntries(report.correlated.contributingMap),
    },
  };

  return JSON.stringify(serializable, null, 2);
}
