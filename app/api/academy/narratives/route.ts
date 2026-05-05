import { NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

const phaseMap: Record<number, string> = { 0: 'Emerging', 1: 'Rising', 2: 'Peak', 3: 'Cooling' };

function mapCategory(cat: string): { domain: string; categoryPath: string } {
    const c = (cat || 'ai').toLowerCase();
    if (c === 'ai') return { domain: 'ai', categoryPath: 'AI' };
    if (c === 'web3') return { domain: 'finance', categoryPath: 'Finance/Web3' };
    if (c === 'finance') return { domain: 'finance', categoryPath: 'Finance' };
    if (c === 'global') return { domain: 'global', categoryPath: 'Global' };
    return { domain: c, categoryPath: cat };
}

export async function GET() {
    try {
        const rows = await query<{
            Id: number;
            Title: string;
            Description: string;
            Category: string;
            Phase: number;
            SignalStrength: string;
            ObjectiveSignalStrength: number;
            CoreEntities: string;
            RelatedArticleCount: number;
            CreatedAt: string;
            LifecycleStatus: number;
        }>(
            `SELECT Id, Title, Description, Category, Phase, SignalStrength,
                    ObjectiveSignalStrength, CoreEntities, RelatedArticleCount, CreatedAt, LifecycleStatus
             FROM IntelligenceNarratives
             WHERE LifecycleStatus = 0
             ORDER BY ObjectiveSignalStrength DESC`
        );

        const narratives = rows.map((r, i) => {
            const { domain, categoryPath } = mapCategory(r.Category);
            return {
                id: r.Id,
                rank: i + 1,
                title: r.Title,
                summary: r.Description,
                category: (r.Category || 'ai').toLowerCase(),
                domain,
                categoryPath,
                phase: phaseMap[r.Phase] ?? 'Emerging',
                heatScore: r.ObjectiveSignalStrength ?? 0,
                articleCount: r.RelatedArticleCount ?? 0,
                signalStrength: r.SignalStrength || null,
                coreEntities: r.CoreEntities ? r.CoreEntities.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
                createdAt: r.CreatedAt,
            };
        });

        return NextResponse.json({ success: true, data: narratives });
    } catch (err) {
        console.error('[API /academy/narratives] Error:', err);
        return NextResponse.json({ success: false, error: '获取叙事列表失败' }, { status: 500 });
    }
}
