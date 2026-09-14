// Older unsent business reports predate explicit archive collections.
export function isDemandReport(report) {
  return report?.type === 'business' &&
    (report.collection === 'demand' || (!report.collection && !report.sent));
}
