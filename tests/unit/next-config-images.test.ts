import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config';

describe('next image remote patterns', () => {
    it('allows ProductHunt imgix thumbnails across all paths', () => {
        const remotePatterns = nextConfig.images?.remotePatterns ?? [];
        const productHuntPattern = remotePatterns.find((pattern) => pattern.hostname === 'ph-files.imgix.net');

        expect(productHuntPattern).toBeDefined();
        expect(productHuntPattern).toMatchObject({
            protocol: 'https',
            hostname: 'ph-files.imgix.net',
            pathname: '/**',
        });
    });
});
