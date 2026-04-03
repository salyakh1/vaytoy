"use client";

import { useState } from "react";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError("Неверный пароль");
        setLoading(false);
        return;
      }
      window.location.href = "/invites";
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-[15px] outline-none ring-0 placeholder:text-white/30 focus:border-white/20"
        placeholder="Email"
        type="email"
        autoComplete="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-[15px] outline-none ring-0 placeholder:text-white/30 focus:border-white/20"
        placeholder="Пароль"
        type="password"
        autoComplete="current-password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <div className="text-xs font-semibold text-[rgba(255,106,61,0.95)]">{error}</div> : null}
      <button
        className="h-11 rounded-xl bg-white text-[15px] font-semibold text-black hover:bg-white/90 active:bg-white/80 disabled:opacity-60"
        type="submit"
        disabled={loading}
      >
        {loading ? "..." : "Войти"}
      </button>
    </form>
  );
}

