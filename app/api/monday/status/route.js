import { buildReadoutSummary, buildStatusSnapshot } from '../../../../lib/status-registry.js'

export async function GET(request) {
  const url = new URL(request.url)
  const source = url.searchParams.get('source') || 'overall'
  const snapshot = buildStatusSnapshot()
  return Response.json({
    ...snapshot,
    readoutText: buildReadoutSummary(snapshot, source),
    readoutSource: source,
  })
}
