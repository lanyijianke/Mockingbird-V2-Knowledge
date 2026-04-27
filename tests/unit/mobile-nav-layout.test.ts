import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCssPath = path.resolve(
    __dirname,
    '../../app/globals.css'
);

describe('mobile navigation layout', () => {
    it('keeps the mobile nav scrollable instead of shrinking link text indefinitely', () => {
        const css = fs.readFileSync(globalsCssPath, 'utf-8');
        const mobileNavBlock = css.match(/\/\* ═══ Nav Mobile ═══ \*\/[\s\S]*?\.main-content \{/);

        expect(mobileNavBlock?.[0]).toContain('.top-nav');
        expect(mobileNavBlock?.[0]).toContain('overflow-x: auto;');
        expect(mobileNavBlock?.[0]).toContain('.nav-right');
        expect(mobileNavBlock?.[0]).toContain('white-space: nowrap;');
        expect(mobileNavBlock?.[0]).toContain('.nav-mobile-rankings-menu');
        expect(mobileNavBlock?.[0]).toContain('position: fixed;');
    });

    it('gives the mobile rankings trigger a reliable touch target', () => {
        const css = fs.readFileSync(globalsCssPath, 'utf-8');
        const triggerBlock = css.match(/\.nav-mobile-rankings-trigger\s*\{[\s\S]*?\}/);

        expect(triggerBlock?.[0]).toContain('min-height: 44px;');
        expect(triggerBlock?.[0]).toContain('padding: 0 0.35rem;');
        expect(triggerBlock?.[0]).toContain('touch-action: manipulation;');
    });
});
