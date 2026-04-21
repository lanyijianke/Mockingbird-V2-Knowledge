import type { Metadata } from 'next';
import { getSkillsShRankings } from '@/lib/services/ranking-cache';
import { buildCollectionPageJsonLd, buildItemListJsonLd, JsonLdScript } from '@/lib/utils/json-ld';

export const metadata: Metadata = {
    title: 'Skills Hot — 排行榜',
    description: '当下最火热的 AI 技能排行，发现社区最受欢迎的工具。',
    alternates: { canonical: '/rankings/skills-hot' },
};

export const revalidate = 600;
const PAGE_URL = 'https://aigcclub.com.cn/rankings/skills-hot';

function sanitizeExternalUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
        return null;
    }
}

export default async function SkillsHotPage() {
    const rankings = await getSkillsShRankings('hot');
    const itemList = rankings.map((item) => ({
        name: item.skillName,
        url: sanitizeExternalUrl(item.skillUrl),
    }));

    return (
        <div className="zone-skills">
            <JsonLdScript data={[
                buildCollectionPageJsonLd('Skills.sh Hot 排行榜', '当下最火热的 AI 技能排行。', PAGE_URL),
                buildItemListJsonLd('Skills.sh Hot 排行榜', '当下最火热的 AI 技能排行。', PAGE_URL, itemList),
            ]} />
            <div className="zone-header">
                <h1 className="zone-title zone-title-hot">
                    <i className="bi bi-lightning-charge" /> Skills.sh Hot
                </h1>
                <p className="zone-subtitle">
                    当下最火热的 AI 技能排行，发现社区最受欢迎的工具。
                </p>
            </div>

            {rankings.length > 0 ? (
                <div className="skills-grid">
                    {rankings.map((item, index) => (
                        <div key={item.id} className="skills-hot-card">
                            <div className={`rank-badge ${index < 3 ? 'rank-top rank-hot' : ''}`}>
                                #{index + 1}
                            </div>
                            <div className="skills-hot-body">
                                <h3 className="skills-hot-name">
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
                                {item.installCount && (
                                    <div className="skills-hot-installs">
                                        <i className="bi bi-download" /> {item.installCount} 安装
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
                    <p>暂无 Hot 数据，请稍后再试。</p>
                </div>
            )}
        </div>
    );
}
