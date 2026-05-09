import { NextRequest } from 'next/server';

const ADMIN_TOKEN = process.env.KNOWLEDGE_ADMIN_TOKEN || process.env.ADMIN_API_TOKEN;

export function verifyAdminAuth(request: NextRequest): string | null {
    if (!ADMIN_TOKEN) return 'ADMIN_TOKEN not configured';
    const auth = request.headers.get('authorization');
    if (!auth) return 'Missing Authorization header';
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (!match) return 'Invalid Authorization format';
    if (match[1] !== ADMIN_TOKEN) return 'Invalid admin token';
    return null;
}
