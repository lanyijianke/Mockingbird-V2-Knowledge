import dns from 'node:dns/promises';
import net from 'node:net';

export interface OutboundUrlValidationResult {
    ok: boolean;
    reason?: string;
    url?: URL;
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const LOCAL_HOSTNAMES = new Set(['localhost', 'ip6-localhost', 'ip6-loopback']);

function isPrivateIpv4(ip: string): boolean {
    const segments = ip.split('.').map(v => Number.parseInt(v, 10));
    if (segments.length !== 4 || segments.some(Number.isNaN)) return true;

    const [a, b] = segments;

    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 0) return true;

    return false;
}

function isPrivateIpv6(ip: string): boolean {
    const lower = ip.toLowerCase();

    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:')) return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

    if (lower.startsWith('::ffff:')) {
        const mappedIpv4 = lower.slice('::ffff:'.length);
        if (net.isIP(mappedIpv4) === 4) {
            return isPrivateIpv4(mappedIpv4);
        }
    }

    return false;
}

function isPrivateIp(ip: string): boolean {
    const ipVersion = net.isIP(ip);
    if (ipVersion === 4) return isPrivateIpv4(ip);
    if (ipVersion === 6) return isPrivateIpv6(ip);
    return true;
}

async function hostnameResolvesToPublicIp(hostname: string): Promise<boolean> {
    try {
        const records = await dns.lookup(hostname, { all: true, verbatim: true });
        if (!records.length) return false;
        return records.every(record => !isPrivateIp(record.address));
    } catch {
        return false;
    }
}

export async function validateOutboundUrl(rawUrl: string): Promise<OutboundUrlValidationResult> {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        return { ok: false, reason: 'Malformed URL' };
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
        return { ok: false, reason: `Unsupported protocol: ${parsed.protocol}` };
    }

    if (parsed.username || parsed.password) {
        return { ok: false, reason: 'Credentialed URL is not allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname) {
        return { ok: false, reason: 'Missing hostname' };
    }

    if (LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
        return { ok: false, reason: 'Local hostname is not allowed' };
    }

    const hostIpVersion = net.isIP(hostname);
    if (hostIpVersion > 0) {
        if (isPrivateIp(hostname)) {
            return { ok: false, reason: 'Private or loopback IP is not allowed' };
        }
        return { ok: true, url: parsed };
    }

    const isPublic = await hostnameResolvesToPublicIp(hostname);
    if (!isPublic) {
        return { ok: false, reason: 'Hostname does not resolve to public IP' };
    }

    return { ok: true, url: parsed };
}
