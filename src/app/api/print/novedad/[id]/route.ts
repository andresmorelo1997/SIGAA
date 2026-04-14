import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/print/novedad/[id]
 *
 * Generates a real PDF of the novedad form (F-GC-002) using server-side
 * Chromium via Playwright. This avoids html2canvas limitations with
 * Tailwind v4 OKLCH colors and produces a pixel-accurate PDF that matches
 * what the user sees in the /print/novedad/[id] page.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Require auth — pass the same cookie so /print/novedad can load.
  const token = req.cookies.get('sigaa-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const origin = new URL(req.url).origin;
  const printUrl = `${origin}/print/novedad/${id}`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
    });

    // Inject the auth cookie so the target page renders authenticated.
    const hostname = new URL(req.url).hostname;
    await context.addCookies([
      {
        name: 'sigaa-token',
        value: token,
        domain: hostname,
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    const page = await context.newPage();
    await page.goto(printUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Hide toolbar (download / print buttons) and give fonts a moment.
    await page.addStyleTag({
      content: `
        .no-print, .toolbar { display: none !important; }
        body { margin: 0 !important; }
      `,
    });
    await page.waitForTimeout(500);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '6mm', bottom: '6mm', left: '6mm', right: '6mm' },
    });

    await browser.close();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Novedad_F-GC-002_${id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    const message = err instanceof Error ? err.message : 'Error generando PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
