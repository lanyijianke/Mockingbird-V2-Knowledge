import type { Metadata } from 'next';
import Image from 'next/image';
import { getProductHuntRankings } from '@/lib/services/ranking-cache';
import { buildCollectionPageJsonLd, buildItemListJsonLd, JsonLdScript } from '@/lib/utils/json-ld';

export const metadata: Metadata = {
    title: 'ProductHunt 每日热榜 — 排行榜',
    description: '聚合 ProductHunt 全球最热门的新产品与工具，每 6 小时自动更新。',
    alternates: { canonical: '/rankings/producthunt' },
};

export const revalidate = 600;
const PAGE_URL = 'https://aigcclub.com.cn/rankings/producthunt';

function sanitizeExternalUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
        return null;
    }
}

export default async function ProductHuntPage() {
    const rankings = await getProductHuntRankings();
    const itemList = rankings.map((item) => ({
        name: item.title,
        url: sanitizeExternalUrl(item.productUrl),
    }));

    return (
        <div className="zone-producthunt">
            <JsonLdScript data={[
                buildCollectionPageJsonLd('ProductHunt 每日热榜', '聚合 ProductHunt 全球最热门的新产品与工具。', PAGE_URL),
                buildItemListJsonLd('ProductHunt 每日热榜', '聚合 ProductHunt 全球最热门的新产品与工具。', PAGE_URL, itemList),
            ]} />
            <div className="zone-header">
                <h1 className="zone-title zone-title-ph">
                    <i className="bi bi-rocket-takeoff" /> ProductHunt 每日热榜
                </h1>
                <p className="zone-subtitle">
                    聚合 ProductHunt 全球最热门的新产品与工具，每 6 小时自动更新。
                </p>
            </div>

            {rankings.length > 0 ? (
                <div className="ph-grid">
                    {rankings.map((item, index) => (
                        <div key={item.id} className="ph-card">
                            <div className={`rank-badge ${index < 3 ? 'rank-top rank-ph' : ''}`}>
                                #{index + 1}
                            </div>
                            <div className="ph-card-body">
                                <div className="ph-header">
                                    {item.thumbnailUrl ? (
                                        <Image src={item.thumbnailUrl} alt={item.title} width={48} height={48} className="ph-thumb" style={{ objectFit: 'cover' }} />
                                    ) : (
                                        <div className="ph-thumb-placeholder">
                                            <i className="bi bi-box-seam" />
                                        </div>
                                    )}
                                    <div className="ph-title-group">
                                        <h3 className="product-title">{item.title}</h3>
                                        <p className="ph-tagline">{item.tagline || '暂无描述'}</p>
                                    </div>
                                </div>
                                <div className="card-footer">
                                    <div className="ph-votes">
                                        <i className="bi bi-caret-up-fill" />
                                        <span className="score-value">{item.votesCount}</span>
                                        <span className="score-label">VOTES</span>
                                    </div>
                                    {(() => {
                                        const safeProductUrl = sanitizeExternalUrl(item.productUrl);
                                        if (!safeProductUrl) {
                                            return <span className="btn-visit btn-visit-ph">链接无效</span>;
                                        }
                                        return (
                                            <a href={safeProductUrl} target="_blank" rel="noopener noreferrer" className="btn-visit btn-visit-ph">
                                                查看产品 <i className="bi bi-box-arrow-up-right" />
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
                    <p>暂无热榜数据，请稍后再试。</p>
                </div>
            )}
        </div>
    );
}
