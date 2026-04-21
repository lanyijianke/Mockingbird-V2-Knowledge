import { GitHubTrending, ProductHuntRanking, SkillsShRanking } from '@/lib/types';
import { scrapeGitHubTrending, scrapeProductHunt, scrapeSkillsSh } from './ranking-scrapers';
import { MemoryCache } from '@/lib/utils/memory-cache';
import { logger } from '@/lib/utils/logger';

// ════════════════════════════════════════════════════════════════
// 排行榜共享缓存 — 直采模式
// 直接从源站抓取数据，2h TTL 统一 MemoryCache
// ════════════════════════════════════════════════════════════════

const cache = new MemoryCache(2 * 60 * 60 * 1000); // 2 小时 TTL

// ════════════════════════════════════════════════════════════════
// GitHub Trending
// ════════════════════════════════════════════════════════════════

export async function getGitHubTrendings(): Promise<GitHubTrending[]> {
    const cacheKey = 'github-trending';
    const cached = cache.get(cacheKey) as GitHubTrending[] | null;
    if (cached) return cached;

    try {
        const result = await scrapeGitHubTrending();
        if (result.length === 0) {
            logger.warn('RankingCache', 'GitHub Trending 直采未获取到数据');
            return [];
        }

        cache.set(cacheKey, result);
        logger.info('RankingCache', `✅ GitHub Trending 直采成功: ${result.length} 条`);
        return result;
    } catch (err) {
        logger.error('RankingCache', 'GitHub Trending 抓取失败', err);
        return [];
    }
}

// ════════════════════════════════════════════════════════════════
// ProductHunt
// ════════════════════════════════════════════════════════════════

export async function getProductHuntRankings(): Promise<ProductHuntRanking[]> {
    const cacheKey = 'producthunt';
    const cached = cache.get(cacheKey) as ProductHuntRanking[] | null;
    if (cached) return cached;

    try {
        const result = await scrapeProductHunt();
        if (result.length === 0) {
            logger.warn('RankingCache', 'ProductHunt 直采未获取到数据');
            return [];
        }

        cache.set(cacheKey, result);
        logger.info('RankingCache', `✅ ProductHunt 直采成功: ${result.length} 条`);
        return result;
    } catch (err) {
        logger.error('RankingCache', 'ProductHunt 抓取失败', err);
        return [];
    }
}

// ════════════════════════════════════════════════════════════════
// Skills.sh
// ════════════════════════════════════════════════════════════════

export async function getSkillsShRankings(listType: string = 'trending'): Promise<SkillsShRanking[]> {
    const cacheKey = `skillssh-${listType}`;
    const cached = cache.get(cacheKey) as SkillsShRanking[] | null;
    if (cached) return cached;

    const validType = listType === 'hot' ? 'hot' : 'trending';
    try {
        const result = await scrapeSkillsSh(validType);
        if (result.length === 0) {
            logger.warn('RankingCache', `Skills.sh ${listType} 直采未获取到数据`);
            return [];
        }

        cache.set(cacheKey, result);
        logger.info('RankingCache', `✅ Skills.sh ${listType} 直采成功: ${result.length} 条`);
        return result;
    } catch (err) {
        logger.error('RankingCache', `Skills.sh ${listType} 抓取失败`, err);
        return [];
    }
}

// ════════════════════════════════════════════════════════════════
// 主动刷新（供定时任务调用）
// ════════════════════════════════════════════════════════════════

/**
 * 强制刷新所有排行榜缓存（无论是否过期）
 * 供定时任务 RankingSyncJob 调用
 */
export async function refreshAllRankings(): Promise<void> {
    logger.info('RankingCache', '🔄 开始刷新所有排行榜...');

    const tasks = [
        { name: 'GitHub Trending', fn: async () => { const r = await scrapeGitHubTrending(); cache.set('github-trending', r); return r.length; } },
        { name: 'ProductHunt', fn: async () => { const r = await scrapeProductHunt(); cache.set('producthunt', r); return r.length; } },
        { name: 'Skills.sh Trending', fn: async () => { const r = await scrapeSkillsSh('trending'); cache.set('skillssh-trending', r); return r.length; } },
        { name: 'Skills.sh Hot', fn: async () => { const r = await scrapeSkillsSh('hot'); cache.set('skillssh-hot', r); return r.length; } },
    ];

    for (const task of tasks) {
        try {
            const count = await task.fn();
            logger.info('RankingCache', `  ✅ ${task.name}: ${count} 条`);
        } catch (err) {
            logger.error('RankingCache', `  ❌ ${task.name} 失败:`, err);
        }
    }

    logger.info('RankingCache', '🔄 排行榜刷新完毕');
}
