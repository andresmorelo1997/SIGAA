import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface UserRow {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  created_at: string | null;
}

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('sigaa-token')?.value;
  if (!token) return { error: 'No autenticado', status: 401 as const };
  const payload = verifyToken(token);
  if (!payload) return { error: 'Sesión inválida', status: 401 as const };
  if (payload.rol !== 'admin') {
    return { error: 'Solo un administrador puede gestionar usuarios', status: 403 as const };
  }
  return { payload };
}

/** GET /api/usuarios — list all users */
export async function GET(req: NextRequest) {
  const gate = requireAdmin(req);
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const rows = db
    .prepare(
      `SELECT id, username, nombre, rol, created_at
         FROM users ORDER BY created_at DESC, id DESC`,
    )
    .all() as UserRow[];

  return NextResponse.json({ data: rows });
}

/** POST /api/usuarios — create a user */
export async function POST(req: NextRequest) {
  const gate = requireAdmin(req);
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: { username?: string; password?: string; nombre?: string; rol?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  const nombre = String(body.nombre ?? '').trim();
  const rol = (String(body.rol ?? 'viewer').trim() || 'viewer').toLowerCase();

  if (!username || !password || !nombre) {
    return NextResponse.json(
      { error: 'username, password y nombre son requeridos' },
      { status: 400 },
    );
  }
  if (!['admin', 'editor', 'viewer'].includes(rol)) {
    return NextResponse.json(
      { error: 'rol debe ser admin, editor o viewer' },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres' },
      { status: 400 },
    );
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(username) as { id: number } | undefined;
  if (existing) {
    return NextResponse.json(
      { error: `El usuario "${username}" ya existe` },
      { status: 409 },
    );
  }

  const hash = hashPassword(password);
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO users (username, password, nombre, rol, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(username, hash, nombre, rol, now);

  const newId = Number(result.lastInsertRowid);
  const user = db
    .prepare(
      `SELECT id, username, nombre, rol, created_at FROM users WHERE id = ?`,
    )
    .get(newId) as UserRow;

  return NextResponse.json({ data: user }, { status: 201 });
}

/** PUT /api/usuarios — update name, role or password */
export async function PUT(req: NextRequest) {
  const gate = requireAdmin(req);
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: {
    id?: number;
    nombre?: string;
    rol?: string;
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const updates: string[] = [];
  const params: (string | number)[] = [];
  if (body.nombre !== undefined) {
    updates.push('nombre = ?');
    params.push(String(body.nombre).trim());
  }
  if (body.rol !== undefined) {
    const rol = String(body.rol).toLowerCase();
    if (!['admin', 'editor', 'viewer'].includes(rol)) {
      return NextResponse.json(
        { error: 'rol debe ser admin, editor o viewer' },
        { status: 400 },
      );
    }
    updates.push('rol = ?');
    params.push(rol);
  }
  if (body.password !== undefined && body.password !== '') {
    if (String(body.password).length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 },
      );
    }
    updates.push('password = ?');
    params.push(hashPassword(String(body.password)));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
  }

  params.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db
    .prepare(
      `SELECT id, username, nombre, rol, created_at FROM users WHERE id = ?`,
    )
    .get(id) as UserRow;

  return NextResponse.json({ data: user });
}

/** DELETE /api/usuarios?id=N — delete a user (never the current one) */
export async function DELETE(req: NextRequest) {
  const gate = requireAdmin(req);
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const payload = gate.payload!;

  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  }
  if (id === payload.id) {
    return NextResponse.json(
      { error: 'No puedes eliminar tu propia cuenta' },
      { status: 400 },
    );
  }

  const res = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (res.changes === 0) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
