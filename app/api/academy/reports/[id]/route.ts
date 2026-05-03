import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const reportId = parseInt(id, 10);
        if (isNaN(reportId)) {
            return NextResponse.json({ success: false, error: '无效的 ID' }, { status: 400 });
        }

        const rows = await query<{
            Id: number; Title: string; Category: string; Content: string;
            SourceArticleCount: number; NarrativeCount: number;
            CreatedAt: string; ExecutiveSummary: string;
            SignalSummaryJson: string; SectionsJson: string; TrendChangesJson: string;
        }>(
            `SELECT Id, Title, Category, Content, ExecutiveSummary,
                    SignalSummaryJson, SectionsJson, TrendChangesJson,
                    SourceArticleCount, NarrativeCount, CreatedAt
             FROM IntelligenceMarketReports
             WHERE Id = ? AND LifecycleStatus = 0`,
            [reportId]
        );

        if (!rows.length) {
            return NextResponse.json({ success: false, error: '研报不存在' }, { status: 404 });
        }

        const r = rows[0];

        // Content is JSON but may be truncated in the DB — extract fields via regex as fallback
        let parsed: {
            executiveSummary?: string;
            signalSummary?: { objectiveSignalStrength?: number; evidenceCount?: number; sourceDiversity?: number; description?: string };
            sections?: { title: string; body: string }[];
            trendChanges?: { metric: string; previous: string; current: string; direction: string; significance: string }[];
        } | null = null;

        if (r.Content) {
            try {
                parsed = JSON.parse(r.Content);
            } catch {
                // Content is truncated JSON — extract what we can with regex
                parsed = extractFromTruncatedJson(r.Content);
            }
        }

        // Fall back to individual JSON columns if Content parse failed
        const executiveSummary = parsed?.executiveSummary || r.ExecutiveSummary || '';
        const signalSummary = parsed?.signalSummary || (r.SignalSummaryJson ? safeParse(r.SignalSummaryJson) : null);
        const sections = parsed?.sections || (r.SectionsJson ? safeParse(r.SectionsJson) : null);
        const trendChanges = parsed?.trendChanges || (r.TrendChangesJson ? safeParse(r.TrendChangesJson) : null);

        return NextResponse.json({
            success: true,
            data: {
                id: r.Id,
                title: r.Title,
                category: (r.Category || 'ai').toLowerCase(),
                createdAt: r.CreatedAt,
                articleCount: r.SourceArticleCount ?? 0,
                narrativeCount: r.NarrativeCount ?? 0,
                executiveSummary,
                signalSummary,
                sections,
                trendChanges,
            },
        });
    } catch (err) {
        console.error('[API /academy/reports/[id]] Error:', err);
        return NextResponse.json({ success: false, error: '获取研报详情失败' }, { status: 500 });
    }
}

function safeParse(json: string): unknown | null {
    try { return JSON.parse(json); } catch { return null; }
}

function extractFromTruncatedJson(raw: string): {
    executiveSummary?: string;
    signalSummary?: { objectiveSignalStrength?: number; evidenceCount?: number; sourceDiversity?: number; description?: string };
    sections?: { title: string; body: string }[];
} | null {
    // Try to extract executiveSummary
    const execMatch = raw.match(/"executiveSummary"\s*:\s*"((?:[^"\\]|\\.|[\s\\n])*)"/);
    const executiveSummary = execMatch ? execMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : undefined;

    // Try to extract signalSummary
    let signalSummary: { objectiveSignalStrength?: number; evidenceCount?: number; sourceDiversity?: number; description?: string } | undefined;
    const signalMatch = raw.match(/"signalSummary"\s*:\s*\{/);
    if (signalMatch) {
        const strengthMatch = raw.match(/"objectiveSignalStrength"\s*:\s*(\d+)/);
        const evidenceMatch = raw.match(/"evidenceCount"\s*:\s*(\d+)/);
        const diversityMatch = raw.match(/"sourceDiversity"\s*:\s*(\d+)/);
        const descMatch = raw.match(/"description"\s*:\s*"((?:[^"\\]|\\.|[\s\\n])*)"/);
        signalSummary = {
            objectiveSignalStrength: strengthMatch ? Number(strengthMatch[1]) : undefined,
            evidenceCount: evidenceMatch ? Number(evidenceMatch[1]) : undefined,
            sourceDiversity: diversityMatch ? Number(diversityMatch[1]) : undefined,
            description: descMatch ? descMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : undefined,
        };
    }

    // Try to extract sections
    let sections: { title: string; body: string }[] | undefined;
    const sectionTitleMatches = [...raw.matchAll(/"title"\s*:\s*"((?:[^"\\]|\\.|[\s\\n])*)"\s*,\s*"body"\s*:\s*"((?:[^"\\]|\\.|[\s\\n])*)"/g)];
    if (sectionTitleMatches.length > 0) {
        sections = sectionTitleMatches.map(m => ({
            title: m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
            body: m[2].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
        }));
    }

    if (!executiveSummary && !signalSummary && !sections) return null;
    return { executiveSummary, signalSummary, sections };
}
