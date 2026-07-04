/**
 * Self-hosted Plausible-compatible analytics endpoint.
 * Captures page views and custom events.
 * No third-party tracking, 100% user-controlled.
 *
 * POST /api/v2/analytics/event — Track event
 * GET  /api/v2/analytics/stats — Get stats summary
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/server/db';

export const dynamic = 'force-dynamic';

// ─── Track Event ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, url, referrer, props, sessionId } = body;

    if (!event || !url) {
      return NextResponse.json({ error: 'event and url required' }, { status: 400 });
    }

    // Extract metadata from headers
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    // Parse user-agent for browser/OS/device
    const browser = parseBrowser(userAgent);
    const os = parseOS(userAgent);
    const device = parseDevice(userAgent);

    await prisma.analyticsEvent.create({
      data: {
        domain: 'swacana',
        event,
        url,
        referrer: referrer || null,
        props: props || undefined,
        sessionId: sessionId || 'anonymous',
        userAgent,
        ipAddress: ip,
        browser,
        os,
        device,
        screenWidth: body.screenWidth || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Get Stats ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    const event = searchParams.get('event') || 'pageview';

    const now = new Date();
    const rangeMs: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    const since = new Date(now.getTime() - (rangeMs[range] || rangeMs['7d']));

    const [
      totalVisits,
      uniqueVisitors,
      topPages,
      browserStats,
      osStats,
      deviceStats,
      dailyVisits,
    ] = await Promise.all([
      prisma.analyticsEvent.count({
        where: { event, createdAt: { gte: since } },
      }),
      prisma.analyticsEvent.groupBy({
        by: ['sessionId'],
        where: { event, createdAt: { gte: since } },
        _count: true,
      }),
      prisma.analyticsEvent.groupBy({
        by: ['url'],
        where: { event, createdAt: { gte: since } },
        _count: { url: true },
        orderBy: { _count: { url: 'desc' } },
        take: 10,
      }),
      prisma.analyticsEvent.groupBy({
        by: ['browser'],
        where: { event, createdAt: { gte: since } },
        _count: { browser: true },
        orderBy: { _count: { browser: 'desc' } },
      }),
      prisma.analyticsEvent.groupBy({
        by: ['os'],
        where: { event, createdAt: { gte: since } },
        _count: { os: true },
        orderBy: { _count: { os: 'desc' } },
      }),
      prisma.analyticsEvent.groupBy({
        by: ['device'],
        where: { event, createdAt: { gte: since } },
        _count: { device: true },
        orderBy: { _count: { device: 'desc' } },
      }),
      // Daily visits for chart
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as visits
        FROM analytics_events
        WHERE event = ${event} AND created_at >= ${since}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ]);

    return NextResponse.json({
      range,
      totalVisits,
      uniqueVisitors: uniqueVisitors.length,
      topPages: topPages.map((p) => ({ url: p.url, visits: p._count.url })),
      browsers: browserStats.map((b) => ({ name: b.browser || 'Unknown', count: b._count.browser })),
      operatingSystems: osStats.map((o) => ({ name: o.os || 'Unknown', count: o._count.os })),
      devices: deviceStats.map((d) => ({ name: d.device || 'Unknown', count: d._count.device })),
      dailyVisits: dailyVisits as { date: string; visits: number }[],
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── User-Agent Parsers ─────────────────────────────────────────────────────

function parseBrowser(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/')) return 'Opera';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
}

function parseOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

function parseDevice(ua: string): string {
  if (ua.includes('Mobile') || ua.includes('Android')) return 'Mobile';
  if (ua.includes('iPad') || ua.includes('Tablet')) return 'Tablet';
  return 'Desktop';
}
