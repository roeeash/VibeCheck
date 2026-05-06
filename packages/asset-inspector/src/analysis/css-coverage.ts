import type { StylesheetInfo } from '../types.js';

/**
 * Processes CDP CSS coverage results into per-stylesheet used/total bytes.
 */
export interface CSSCoverageData {
  url: string;
  usedBytes: number;
  totalBytes: number;
}

/**
 * Extracts coverage metrics from CDP CSS coverage response.
 * @param coverage - CDP CSS coverage response from CSS.stopRuleUsageTracking
 * @returns Array of coverage data per stylesheet
 */
export function processCSSCoverage(coverage: any[]): CSSCoverageData[] {
  const result: CSSCoverageData[] = [];

  for (const entry of coverage) {
    if (!entry.styleSheetId) continue;

    let usedBytes = 0;
    let totalBytes = entry.text?.length ?? 0;

    // If CDP provided range data, calculate used bytes
    if (entry.ranges && Array.isArray(entry.ranges)) {
      for (const range of entry.ranges) {
        if (range.start !== undefined && range.end !== undefined) {
          usedBytes += range.end - range.start;
        }
      }
    }

    result.push({
      url: entry.sourceURL || `stylesheet-${entry.styleSheetId}`,
      usedBytes,
      totalBytes,
    });
  }

  return result;
}
