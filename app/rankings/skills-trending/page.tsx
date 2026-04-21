import type { Metadata } from 'next';
import { getSkillsShRankings } from '@/lib/services/ranking-cache';
import { buildCollectionPageJsonLd, buildItemListJsonLd, JsonLdScript } from '@/lib/utils/json-ld';

export const metadata: Metadata = {
    title: 'Skills Trending — 排行榜',
    description: '最受社区关注的 AI 技能与工具，实时追踪趋势变化。',
    alternates: { canonical: '/rankings/skills-trending' },
};

export const revalidate = 600;
const PAGE_URL = 'https://aigcclub.com.cn/rankings/skills-trending';

function sanitizeExternalUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
        return null;
    }
}

export default async function SkillsTrendingPage() {
    const rankings = await getSkillsShRankings('trending');
    const itemList = rankings.map((item) => ({
        name: item.skillName,
        url: sanitizeExternalUrl(item.skillUrl),
    }));

    return (
        <div className="zone-skills">
            <JsonLdScript data={[
                buildCollectionPageJsonLd('Skills.sh Trending 排行榜', '最受社区关注的 AI 技能与工具。', PAGE_URL),
                buildItemListJsonLd('Skills.sh Trending 排行榜', '最受社区关注的 AI 技能与工具。', PAGE_URL, itemList),
            ]} />
            <div className="zone-header">
                <h1 className="zone-title zone-title-skills">
                    <i className="bi bi-fire" /> Skills.sh Trending
                </h1>
                <p className="zone-subtitle">
                    最受社区关注的 AI 技能与工具，实时追踪趋势变化。
                </p>
            </div>

            {rankings.length > 0 ? (
                <div className="skills-list">
                    {rankings.map((item, index) => (
                        <div key={item.id} className="skills-card">
                            <div className={`rank-badge ${index < 3 ? 'rank-top rank-skills' : ''}`}>
                                #{index + 1}
                            </div>
                            <div className="skills-body">
                                <div className="skills-header">
                                    <h3 className="skills-name">
                                        <i className="bi bi-cpu" />
                                        {(() => {
                                            const safeSkillUrl = sanitizeExternalUrl(item.skillUrl);
                                            if (!safeSkillUrl) return <span>{item.skillName}</span>;
                                            return (
                                                <a href={safeSkillUrl} target="_blank" rel="noopener noreferrer">
                                                    {item.skillName}
                                                </a>
                                            );
                                        })()}
                                    </h3>
                                    {item.installCount && (
                                        <span className="install-count">
                                            <i className="bi bi-download" /> {item.installCount}
                                        </span>
                                    )}
                                </div>
                                {item.repoFullName && (
                                    <div className="skills-repo">
                                        <i className="bi bi-github" />
                                        {(() => {
                                            const safeRepoUrl = sanitizeExternalUrl(`https://github.com/${item.repoFullName}`);
                                            if (!safeRepoUrl) return <span>{item.repoFullName}</span>;
                                            return (
                                                <a href={safeRepoUrl} target="_blank" rel="noopener noreferrer">
                                                    {item.repoFullName}
                                                </a>
                                            );
                                        })()}
                                    </div>
                                )}
                                {item.description && (
                                    <p className="skills-description">{item.description}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <i className="bi bi-cloud-slash" />
                    <p>暂无 Trending 数据，请稍后再试。</p>
                </div>
            )}
        </div>
    );
}
