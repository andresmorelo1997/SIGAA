'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Modal,
  PageHeader,
  Avatar,
  ToastContainer,
  useToast,
} from '@/components/ui';
import { formatDateTime } from '@/lib/format';

interface UserRow {
  id: number;
  username: string;
  nombre: string;
  rol: 'admin' | 'editor' | 'viewer' | string;
  created_at: string | null;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador — acceso total' },
  { value: 'editor', label: 'Editor — puede crear y modificar' },
  { value: 'viewer', label: 'Consulta — solo lectura' },
];

const ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: 'bg-unisinu-50', text: 'text-unisinu-800', label: 'Admin' },
  editor: { bg: 'bg-sky-50', text: 'text-sky-800', label: 'Editor' },
  viewer: { bg: 'bg-zinc-100', text: 'text-zinc-700', label: 'Consulta' },
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const { toasts, addToast, removeToast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const [formUsername, setFormUsername] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formRol, setFormRol] = useState('viewer');
  const [formPassword, setFormPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/usuarios');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setUsers(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openCreate() {
    setFormUsername('');
    setFormNombre('');
    setFormRol('viewer');
    setFormPassword('');
    setShowCreate(true);
  }

  function openEdit(u: UserRow) {
    setEditUser(u);
    setFormNombre(u.nombre);
    setFormRol(u.rol);
    setFormPassword('');
  }

  async function handleCreate() {
    if (!formUsername.trim() || !formNombre.trim() || formPassword.length < 6) {
      addToast('error', 'Completa usuario, nombre y contraseña (mín. 6 caracteres)');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formUsername,
          nombre: formNombre,
          rol: formRol,
          password: formPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      addToast('success', `Usuario "${formUsername}" creado`);
      setShowCreate(false);
      fetchUsers();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editUser) return;
    if (!formNombre.trim()) {
      addToast('error', 'Nombre requerido');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        id: editUser.id,
        nombre: formNombre,
        rol: formRol,
      };
      if (formPassword.length > 0) {
        if (formPassword.length < 6) {
          addToast('error', 'La contraseña debe tener al menos 6 caracteres');
          setSaving(false);
          return;
        }
        payload.password = formPassword;
      }
      const res = await fetch('/api/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      addToast('success', `Usuario actualizado`);
      setEditUser(null);
      fetchUsers();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/usuarios?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Error');
      addToast('success', `Usuario eliminado`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  const filtered = users.filter(
    (u) =>
      !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-5xl mx-auto w-full">
      <PageHeader
        title="Gestión de Usuarios"
        description="Crear, editar y administrar cuentas de acceso al SIGAA"
        color="primary"
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        }
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-unisinu-600 hover:bg-unisinu-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo Usuario
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mb-4">
        <Input
          placeholder="Buscar por usuario o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          }
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600">Creado</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No hay usuarios {search && 'que coincidan con la búsqueda'}
                </td></tr>
              ) : (
                filtered.map((u) => {
                  const badge = ROLE_BADGE[u.rol] ?? ROLE_BADGE.viewer;
                  return (
                    <tr key={u.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.nombre} size="sm" />
                          <span className="font-mono font-medium text-zinc-900">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-800">{u.nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ring-current/20 ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {formatDateTime(u.created_at) || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 text-zinc-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => !saving && setShowCreate(false)}
        title="Nuevo Usuario"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate} loading={saving}>
              Crear Usuario
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nombre de usuario"
            placeholder="ej. j.perez"
            value={formUsername}
            onChange={(e) => setFormUsername(e.target.value)}
            helperText="Este será el identificador para iniciar sesión"
          />
          <Input
            label="Nombre completo"
            placeholder="Juan Pérez"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
          />
          <Select
            label="Rol"
            value={formRol}
            onChange={(e) => setFormRol(e.target.value)}
            options={ROLE_OPTIONS}
          />
          <Input
            label="Contraseña inicial"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            helperText="El usuario podrá cambiarla después"
          />
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editUser !== null}
        onClose={() => !saving && setEditUser(null)}
        title={`Editar ${editUser?.username ?? ''}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditUser(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleUpdate} loading={saving}>
              Guardar Cambios
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nombre completo"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
          />
          <Select
            label="Rol"
            value={formRol}
            onChange={(e) => setFormRol(e.target.value)}
            options={ROLE_OPTIONS}
          />
          <Input
            label="Nueva contraseña (opcional)"
            type="password"
            placeholder="Dejar vacío para no cambiarla"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
          />
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => !saving && setDeleteTarget(null)}
        title="Eliminar usuario"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={saving}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-700">
          ¿Eliminar el usuario <strong>{deleteTarget?.username}</strong>? Esta acción no se puede deshacer.
        </p>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
