import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/logo - Serve the institution logo from /public/logo.png
 * Returns the image or 404 if not found.
 */
export async function GET() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');

  if (!fs.existsSync(logoPath)) {
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  }

  try {
    const buffer = fs.readFileSync(logoPath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Error reading logo' }, { status: 500 });
  }
}
