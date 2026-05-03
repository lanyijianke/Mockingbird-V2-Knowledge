import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const narrativeId = parseInt(id, 10);
        if (isNaN(narrativeId)) {
            return NextResponse.json({ success: false, error: '无效的 ID' }, { status: 400 });
        }

        // 1. Narrative itself
        const narr = await query<{
            Id: number; Title: string; Description: string; Category: string;
            Phase: number; SignalStrength: string; ObjectiveSignalStrength: number;
            CoreEntities: string; RelatedArticleCount: number; ObjectiveSignalBreakdownJson: string;
        }>(
            `SELECT Id, Title, Description, Category, Phase, SignalStrength,
                    ObjectiveSignalStrength, CoreEntities, RelatedArticleCount, ObjectiveSignalBreakdownJson
             FROM IntelligenceNarratives WHERE Id = ?`, [narrativeId]
        );

        if (!narr.length) {
            return NextResponse.json({ success: false, error: '叙事不存在' }, { status: 404 });
        }

        const n = narr[0];
        const phaseMap: Record<number, string> = { 0: 'Emerging', 1: 'Rising', 2: 'Peak', 3: 'Cooling' };

        // 2. Insights
        const insights = await query<{
            Id: number; Type: number; Title: string; Content: string; ObjectivePriority: number;
        }>(
            `SELECT Id, Type, Title, Content, ObjectivePriority
             FROM IntelligenceInsights
             WHERE NarrativeId = ? AND LifecycleStatus = 0
             ORDER BY ObjectivePriority DESC`, [narrativeId]
        );

        const insightTypeMap: Record<number, 'risk' | 'opp'> = { 1: 'opp', 2: 'risk', 3: 'risk', 4: 'risk' };

        // 3. Inconsistency candidates (contradictions)
        const contradictions = await query<{
            Id: number; EntityName: string; StatementA: string; StatementB: string;
            MismatchKind: number; ReviewStatus: number;
        }>(
            `SELECT Id, EntityName, StatementA, StatementB, MismatchKind, ReviewStatus
             FROM IntelligenceInconsistencyCandidates
             WHERE NarrativeId = ? AND ReviewStatus IN (0, 1)
             ORDER BY CreatedAt DESC
             LIMIT 10`, [narrativeId]
        );

        const mismatchLevel = (m: number) => m <= 2 ? 'high' : m <= 3 ? 'med' : 'low';

        // 4. Events
        const events = await query<{
            Id: number; Name: string; EventType: string; Description: string;
            OccurredAt: string; ConfirmationStatus: number; SourceItemId: number;
        }>(
            `SELECT Id, Name, EventType, Description, OccurredAt, ConfirmationStatus, SourceItemId
             FROM IntelligenceEvents
             WHERE NarrativeId = ? AND LifecycleStatus = 0
             ORDER BY OccurredAt ASC`, [narrativeId]
        );

        // 4b. Event causal links
        const eventIds = events.map(e => e.Id);
        let causalLinks: { SourceEventId: number; TargetEventId: number; CausalType: string; Evidence: string }[] = [];
        if (eventIds.length > 1) {
            const placeholders = eventIds.map(() => '?').join(',');
            causalLinks = await query(
                `SELECT SourceEventId, TargetEventId, CausalType, Evidence
                 FROM IntelligenceEventCausalLinks
                 WHERE SourceEventId IN (${placeholders}) AND TargetEventId IN (${placeholders})
                 ORDER BY SourceEventId`,
                [...eventIds, ...eventIds]
            ) as typeof causalLinks;
        }

        // Build cause map: TargetEventId -> { label, evidence }
        const causeMap = new Map<number, { label: string; evidence: string }>();
        for (const cl of causalLinks) {
            const causalTypeLabel: Record<string, string> = {
                Triggers: '触发', EscalatedTo: '升级', ResponseTo: '响应',
                LeadTo: '传导', ResolvedBy: '解决',
            };
            if (!causeMap.has(cl.TargetEventId)) {
                causeMap.set(cl.TargetEventId, {
                    label: causalTypeLabel[cl.CausalType] || cl.CausalType,
                    evidence: cl.Evidence,
                });
            }
        }

        // 4c. Event participants (tags)
        const eventEntityMap = new Map<number, string[]>();
        if (eventIds.length > 0) {
            const placeholders = eventIds.map(() => '?').join(',');
            const participants = await query<{ EventId: number; EntityName: string }>(
                `SELECT ep.EventId, e.Name as EntityName
                 FROM IntelligenceEventParticipants ep
                 JOIN IntelligenceEntities e ON e.Id = ep.ParticipantEntityId
                 WHERE ep.EventId IN (${placeholders})`,
                eventIds
            );
            for (const p of participants) {
                if (!eventEntityMap.has(p.EventId)) eventEntityMap.set(p.EventId, []);
                eventEntityMap.get(p.EventId)!.push(p.EntityName);
            }
        }

        const eventTypeMap: Record<string, string> = {
            FundingRound: '融资', ProductLaunch: '发布', SecurityIncident: '安全',
            PolicyChange: '监管', Partnership: '合作', PersonnelMove: '人事', Other: '其他',
        };

        // 5. Related articles via IntelligenceObjectRelations
        const relatedItems = await query<{
            ItemId: number; Title: string; Content: string; Source: string;
            Author: string; PublishTime: string; AiSummary: string; AiReasoning: string; QualityScore: number;
        }>(
            `SELECT DISTINCT i.Id as ItemId, i.Title, i.Content, i.Source, i.ExtraData,
                    t.AiSummary, t.AiReasoning, t.QualityScore
             FROM IntelligenceObjectRelations r
             JOIN IntelligenceItems i ON i.Id = r.TargetId AND r.TargetType = 0
             LEFT JOIN IntelligenceTaggings t ON t.ItemId = i.Id
             WHERE r.SourceType = 2 AND r.SourceId = ?
             ORDER BY t.QualityScore DESC
             LIMIT 10`, [narrativeId]
        );

        // Parse ExtraData for author
        const articles = relatedItems.map((item, idx) => {
            let author = '';
            try {
                const extra = typeof item.ExtraData === 'string' ? JSON.parse(item.ExtraData) : item.ExtraData;
                author = extra?.author || '';
            } catch { /* ignore */ }

            const qs = item.QualityScore ? Number(item.QualityScore) : 50;
            return {
                id: item.ItemId,
                source: item.Source || '',
                quality: qs >= 80 ? 'high' : 'med',
                qualityScore: qs,
                title: item.Title || '',
                summary: (item.AiSummary || '').slice(0, 120) || (item.Content || '').slice(0, 120),
                publishedAt: item.PublishTime || '',
                author,
                reasoning: item.AiReasoning || '',
                content: item.Content || '',
            };
        });

        // Assemble result
        const result = {
            id: n.Id,
            title: n.Title,
            summary: n.Description,
            category: (n.Category || 'ai').toLowerCase(),
            phase: phaseMap[n.Phase] ?? 'Emerging',
            heatScore: n.ObjectiveSignalStrength ?? 0,
            articleCount: n.RelatedArticleCount ?? 0,
            signalStrength: n.SignalStrength || null,
            coreEntities: n.CoreEntities ? n.CoreEntities.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            body: n.Description,
            insights: insights.map(ins => ({
                type: insightTypeMap[ins.Type] || 'risk',
                score: ins.ObjectivePriority ?? 50,
                title: ins.Title,
                preview: (ins.Content || '').slice(0, 80),
                full: ins.Content || '',
            })),
            contradictions: contradictions.map(c => ({
                title: c.EntityName ? `${c.EntityName} 矛盾` : '矛盾信号',
                text: `${c.StatementA}\nvs\n${c.StatementB}`,
                level: mismatchLevel(c.MismatchKind),
                source: '系统检测',
                credLevel: c.ReviewStatus === 1 ? 'high' : 'med',
                credScore: c.ReviewStatus === 1 ? 80 : 60,
            })),
            events: events.map(e => ({
                date: (e.OccurredAt || '').toString().slice(0, 10),
                type: (e.EventType || 'Other').toLowerCase(),
                typeName: eventTypeMap[e.EventType] || e.EventType,
                name: e.Name,
                desc: e.Description || '',
                tags: eventEntityMap.get(e.Id) || [],
                sourceCount: e.SourceItemId ? 1 : 0,
                confidence: 85,
                ongoing: e.ConfirmationStatus === 0,
                cause: causeMap.get(e.Id)?.label,
            })),
            articles,
        };

        return NextResponse.json({ success: true, data: result });
    } catch (err) {
        console.error('[API /academy/narratives/[id]] Error:', err);
        return NextResponse.json({ success: false, error: '获取叙事详情失败' }, { status: 500 });
    }
}
