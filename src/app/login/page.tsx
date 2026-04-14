"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
} from "@heroicons/react/20/solid";

/**
 * Login rediseñado con la identidad visual de Horilla:
 *  - Fondo suave + card centrada con borde fino (estilo oh-auth-card)
 *  - Input con label encima, padding generoso (oh-input)
 *  - Botón primary: negro (#212121) con shadow sutil (oh-btn--primary)
 *  - Texto "Secure Sign-in" con ícono
 *  - Logo UniSinú abajo con opacidad leve
 */
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Credenciales incorrectas");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Error de conexión. Intente nuevamente.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[hsl(213,22%,97%)]">
      <main className="flex flex-col items-center w-full max-w-sm mx-4">
        {/* Auth Card */}
        <div className="w-full bg-white border border-[hsl(213,22%,84%)] rounded-lg shadow-sm px-7 py-8 mb-4">
          <h1 className="text-center text-3xl font-bold text-[#212121] mt-1 mb-2">
            Sign In
          </h1>
          <p className="text-center text-sm text-zinc-500 mb-6">
            Por favor inicie sesión para acceder al SIGAA.
          </p>

          {/* Alert */}
          {error && (
            <div className="mb-4 p-3 bg-[hsl(1,64%,97%)] border border-[hsl(1,64%,85%)] rounded-md flex items-start gap-2">
              <ExclamationTriangleIcon className="size-5 text-[#CC3D35] shrink-0 mt-0.5" />
              <p className="text-sm text-[#8f2a24]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-bold text-[#212121] mb-1.5"
              >
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="ej: admin"
                className="block w-full rounded-md border border-[hsl(213,22%,84%)] bg-white px-3 py-2.5 text-sm text-[#212121] placeholder:text-zinc-400 focus:outline-none focus:border-[#212121] focus:ring-1 focus:ring-[#212121]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-[#212121] mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Caracteres alfanuméricos"
                  className="block w-full rounded-md border border-[hsl(213,22%,84%)] bg-white px-3 py-2.5 pr-10 text-sm text-[#212121] placeholder:text-zinc-400 focus:outline-none focus:border-[#212121] focus:ring-1 focus:ring-[#212121]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="size-5" />
                  ) : (
                    <EyeIcon className="size-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 inline-flex items-center justify-center gap-2 py-2.5 bg-[#E54F38] text-white text-sm font-semibold rounded-md hover:bg-[hsl(8,77%,46%)] focus:outline-none focus:ring-2 focus:ring-[#E54F38] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Ingresando…
                </>
              ) : (
                <>
                  <LockClosedIcon className="size-4" />
                  Secure Sign-in
                </>
              )}
            </button>
          </form>
        </div>

        {/* Brand strip below the card */}
        <div className="flex flex-col items-center opacity-80">
          <img
            src="/logos/unisinu-logo.png"
            alt="Universidad del Sinú"
            className="h-16 w-auto object-contain"
            draggable={false}
          />
          <p className="mt-2 text-sm text-zinc-500">Universidad del Sinú</p>
          <p className="mt-0.5 text-xs text-zinc-400">SIGAA v1.0</p>
        </div>
      </main>
    </div>
  );
}
