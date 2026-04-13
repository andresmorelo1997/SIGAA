"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from "@heroicons/react/20/solid";

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
      setError("Error de conexi\u00f3n. Intente nuevamente.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
      {/* Card */}
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-zinc-950/5 px-7 py-8 dark:bg-zinc-900 dark:ring-white/10">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">
              SIGAA
            </h1>
            <p className="text-sm/6 text-zinc-500 mt-1">
              {"Sistema Integrado de Gesti\u00f3n Acad\u00e9mica"}
            </p>
            <p className="text-sm/6 font-medium text-zinc-500 mt-1">
              {"Universidad del Sin\u00fa"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/20 rounded-lg flex items-start gap-2">
              <ExclamationTriangleIcon className="size-5 text-red-500 shrink-0" />
              <p className="text-sm/6 text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-1"
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
                placeholder="Ingrese su usuario"
                className="block w-full rounded-lg border border-zinc-950/10 bg-transparent px-3 py-2 text-base/6 sm:text-sm/6 text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-1"
              >
                {"Contrase\u00f1a"}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder={"Ingrese su contrase\u00f1a"}
                  className="block w-full rounded-lg border border-zinc-950/10 bg-transparent px-3 py-2 pr-10 text-base/6 sm:text-sm/6 text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
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
              className="w-full py-2.5 bg-zinc-900 text-white text-sm/6 font-semibold rounded-lg hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
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
                  Ingresando...
                </span>
              ) : (
                "Iniciar Sesi\u00f3n"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-zinc-950/5 dark:border-white/5 text-center">
            <p className="text-xs text-zinc-400">
              {"SIGAA v1.0 \u2014 Universidad del Sin\u00fa"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
