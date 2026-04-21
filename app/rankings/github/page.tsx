import type { Metadata } from 'next';
import { getGitHubTrendings } from '@/lib/services/ranking-cache';
import { buildCollectionPageJsonLd, buildItemListJsonLd, JsonLdScript } from '@/lib/utils/json-ld';

export const metadata: Metadata = {
    title: 'GitHub Trending — 排行榜',
    description: '追踪 GitHub 全球最热门的开源项目，每 6 小时自动更新。',
    alternates: { canonical: '/rankings/github' },
};

export const revalidate = 600;
const PAGE_URL = 'https://aigcclub.com.cn/rankings/github';

function sanitizeExternalUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
        return null;
    }
}

function formatNumber(num: number): string {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
}

const LANGUAGE_COLORS: Record<string, string> = {
    python: '#3572A5', javascript: '#f1e05a', typescript: '#3178c6',
    java: '#b07219', 'c#': '#178600', 'c++': '#f34b7d', c: '#555555',
    go: '#00ADD8', rust: '#dea584', ruby: '#701516', swift: '#F05138',
    kotlin: '#A97BFF', dart: '#00B4AB', php: '#4F5D95', html: '#e34c26',
    css: '#563d7c', shell: '#89e051', lua: '#000080', vue: '#41b883',
    'jupyter notebook': '#DA5B0B', zig: '#ec915c', elixir: '#6e4a7e',
};

export default async function GitHubTrendingPage() {
    const trendings = await getGitHubTrendings();
    const itemList = trendings.map((item) => ({
        name: item.repoFullName,
        url: sanitizeExternalUrl(item.repoUrl || `https://github.com/${item.repoFullName}`),
    }));

    return (
        <div className="zone-github">
            <JsonLdScript data={[
                buildCollectionPageJsonLd('GitHub Trending 排行榜', '追踪 GitHub 全球最热门的开源项目。', PAGE_URL),
                buildItemListJsonLd('GitHub Trending 排行榜', '追踪 GitHub 全球最热门的开源项目。', PAGE_URL, itemList),
            ]} />
            <div className="zone-header">
                <h1 className="zone-title zone-title-gh">
                    <i className="bi bi-github" /> GitHub Trending
                </h1>
                <p className="zone-subtitle">
                    追踪 GitHub 全球最热门的开源项目，每 6 小时自动更新。
                </p>
            </div>

            {trendings.length > 0 ? (
                <div className="trending-list">
                    {trendings.map((item, index) => (
                        <div key={item.id} className="trending-card">
                            <div className={`rank-badge ${index < 3 ? 'rank-top rank-gh' : ''}`}>
                                #{index + 1}
                            </div>
                            <div className="trending-body">
                                <div className="repo-header">
                                    <h3 className="repo-name">
                                        <i className="bi bi-journal-bookmark-fill repo-icon" />
                                        {item.repoFullName}
                                    </h3>
                                    {item.language && (
                                        <span className="lang-tag">
                                            <span
                                                className="lang-dot"
                                                style={{ background: LANGUAGE_COLORS[item.language.toLowerCase()] || '#8b949e' }}
                                            />
                                            {item.language}
                                        </span>
                                    )}
                                </div>
                                <p className="repo-desc">
                                    {item.description || '暂无描述'}
                                </p>
                                <div className="card-footer">
                                    <div className="repo-stats">
                                        <span className="stat-item" title="Total Stars">
                                            <i className="bi bi-star-fill" /> {formatNumber(item.starsCount)}
                                        </span>
                                        <span className="stat-item" title="Forks">
                                            <i className="bi bi-diagram-2-fill" /> {formatNumber(item.forksCount)}
                                        </span>
                                        {item.todayStars > 0 && (
                                            <span className="stat-item stat-today" title="Stars Today">
                                                <i className="bi bi-graph-up-arrow" /> +{formatNumber(item.todayStars)} today
                                            </span>
                                        )}
                                    </div>
                                    {(() => {
                                        const safeRepoUrl = sanitizeExternalUrl(item.repoUrl || `https://github.com/${item.repoFullName}`);
                                        if (!safeRepoUrl) {
                                            return <span className="btn-visit btn-visit-gh">链接无效</span>;
                                        }
                                        return (
                                            <a href={safeRepoUrl} target="_blank" rel="noopener noreferrer" className="btn-visit btn-visit-gh">
                                                查看仓库 <i className="bi bi-box-arrow-up-right" />
                                            </a>
                                        );
                                    })()}
                                </div>
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
