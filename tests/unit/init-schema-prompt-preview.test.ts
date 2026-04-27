import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { initDatabase } from '@/lib/init-schema';

describe('initDatabase prompt preview migration', () => {
    const databases: Database.Database[] = [];

    afterEach(() => {
        for (const db of databases) {
            db.close();
        }
        databases.length = 0;
    });

    it('adds CardPreviewVideoUrl to an existing Prompts table without dropping data', () => {
        const db = new Database(':memory:');
        databases.push(db);

        db.exec(`
            CREATE TABLE Prompts (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Title TEXT NOT NULL DEFAULT '',
                VideoPreviewUrl TEXT DEFAULT NULL
            );
            INSERT INTO Prompts (Title, VideoPreviewUrl) VALUES ('existing prompt', '/content/prompts/media/full.mp4');
        `);

        initDatabase(db);

        const columns = db.prepare('PRAGMA table_info(Prompts)').all() as Array<{ name: string }>;
        const row = db.prepare('SELECT Title, VideoPreviewUrl, CardPreviewVideoUrl FROM Prompts').get() as {
            Title: string;
            VideoPreviewUrl: string | null;
            CardPreviewVideoUrl: string | null;
        };

        expect(columns.map((column) => column.name)).toContain('CardPreviewVideoUrl');
        expect(row).toEqual({
            Title: 'existing prompt',
            VideoPreviewUrl: '/content/prompts/media/full.mp4',
            CardPreviewVideoUrl: null,
        });
    });
});
