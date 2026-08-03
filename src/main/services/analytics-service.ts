import { getDatabase } from '../database'
import { audit } from './data-service'
import { sampleMetrics, stablePerformanceId } from './analytics-metrics'

export { sampleMetrics } from './analytics-metrics'

type SourceType = 'organic_post' | 'ad_campaign'
type DataSource = 'local_sample' | 'manual' | 'live'
type Snapshot = { sourceType: SourceType; sourceId: string; platform: string; label: string; impressions: number; reach: number; engagements: number; clicks: number; spendCents: number | null; conversions: number | null; revenueCents: number | null; capturedAt: number; dataSource: DataSource }

export function getAnalyticsOverview() {
  const raw = getDatabase().prepare(`SELECT source_type,source_id,platform,label,impressions,reach,engagements,clicks,spend_cents,conversions,revenue_cents,captured_at,data_source FROM performance_snapshots ORDER BY captured_at DESC, created_at DESC`).all() as Record<string, unknown>[]
  const seen = new Set<string>()
  const rows: Snapshot[] = []
  for (const item of raw) {
    const key = `${item.source_type}:${item.source_id}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({ sourceType: item.source_type as SourceType, sourceId: String(item.source_id), platform: String(item.platform), label: String(item.label), impressions: Number(item.impressions), reach: Number(item.reach), engagements: Number(item.engagements), clicks: Number(item.clicks), spendCents: item.spend_cents == null ? null : Number(item.spend_cents), conversions: item.conversions == null ? null : Number(item.conversions), revenueCents: item.revenue_cents == null ? null : Number(item.revenue_cents), capturedAt: Number(item.captured_at), dataSource: item.data_source as DataSource })
  }
  const totals = rows.reduce((sum, row) => ({ impressions: sum.impressions + row.impressions, reach: sum.reach + row.reach, engagements: sum.engagements + row.engagements, clicks: sum.clicks + row.clicks, spendCents: sum.spendCents + (row.spendCents ?? 0), conversions: sum.conversions + (row.conversions ?? 0), revenueCents: sum.revenueCents + (row.revenueCents ?? 0) }), { impressions: 0, reach: 0, engagements: 0, clicks: 0, spendCents: 0, conversions: 0, revenueCents: 0 })
  const withRates = rows.map((row) => ({ ...row, engagementRate: row.reach ? row.engagements / row.reach : 0, clickThroughRate: row.impressions ? row.clicks / row.impressions : 0 }))
  const latestCapturedAt = rows.length ? Math.max(...rows.map((row) => row.capturedAt)) : null
  return { summary: { ...totals, engagementRate: totals.reach ? totals.engagements / totals.reach : 0, clickThroughRate: totals.impressions ? totals.clicks / totals.impressions : 0, returnOnAdSpend: totals.spendCents ? totals.revenueCents / totals.spendCents : null }, rows: withRates, freshness: { generatedAt: Date.now(), latestCapturedAt, dataSources: [...new Set(rows.map((row) => row.dataSource))], hasData: rows.length > 0, message: rows.length ? 'Showing the latest snapshot for each published post and approved ad draft.' : 'Publish a post or approve an ad draft before generating local sample performance.' } }
}

export function generateSampleAnalytics() {
  const db = getDatabase()
  const organic = db.prepare(`SELECT pp.id source_id,cv.platform,ci.title label,pp.published_at captured_at FROM published_posts pp JOIN scheduled_posts sp ON sp.id=pp.scheduled_post_id JOIN content_variants cv ON cv.id=sp.content_variant_id JOIN content_items ci ON ci.id=cv.content_item_id`).all() as Record<string, unknown>[]
  const paid = db.prepare(`SELECT acd.id source_id,aa.provider platform,acd.name label,acd.approved_at captured_at,acd.budget_cents FROM ad_campaign_drafts acd JOIN ad_accounts aa ON aa.id=acd.ad_account_id WHERE acd.status='approved' AND acd.approved_at IS NOT NULL`).all() as Record<string, unknown>[]
  const insert = db.prepare(`INSERT OR IGNORE INTO performance_snapshots (id,source_type,source_id,platform,label,impressions,reach,engagements,clicks,spend_cents,conversions,revenue_cents,captured_at,data_source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'local_sample',?,?)`)
  let inserted = 0
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const row of organic) { const sourceId=String(row.source_id), metrics=sampleMetrics('organic_post',sourceId), now=Date.now(); const result=insert.run(stablePerformanceId('organic_post',sourceId),'organic_post',sourceId,String(row.platform),String(row.label),metrics.impressions,metrics.reach,metrics.engagements,metrics.clicks,null,null,null,Number(row.captured_at),now,now); inserted += Number(result.changes) }
    for (const row of paid) { const sourceId=String(row.source_id), metrics=sampleMetrics('ad_campaign',sourceId,Number(row.budget_cents)), now=Date.now(); const result=insert.run(stablePerformanceId('ad_campaign',sourceId),'ad_campaign',sourceId,String(row.platform),String(row.label),metrics.impressions,metrics.reach,metrics.engagements,metrics.clicks,metrics.spendCents,metrics.conversions,metrics.revenueCents,Number(row.captured_at),now,now); inserted += Number(result.changes) }
    db.exec('COMMIT')
  } catch (error) { db.exec('ROLLBACK'); throw error }
  audit('analytics.local_sample.generated','performance_snapshots',null,{ eligibleSources: organic.length + paid.length, inserted })
  return getAnalyticsOverview()
}
