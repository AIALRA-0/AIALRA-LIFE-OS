"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email")),
          password: String(formData.get("password"))
        })
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setMessage(result?.error ?? "登录失败。");
        return;
      }

      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <main className="wiki-grid grid min-h-svh place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded border border-white/10 bg-panel/90 p-6 shadow-glow backdrop-blur">
        <div className="grid h-11 w-11 place-items-center rounded border border-primary/30 bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-white">Aialra Life OS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          私人执行系统。请输入邮箱和密码。
        </p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm text-muted-foreground">
            邮箱
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-11 rounded border border-white/10 bg-black/24 px-3 text-white"
            />
          </label>
          <label className="grid gap-1 text-sm text-muted-foreground">
            密码
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-11 rounded border border-white/10 bg-black/24 px-3 text-white"
            />
          </label>
          {message ? <p className="text-sm text-danger">{message}</p> : null}
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded bg-primary text-sm font-semibold text-primary-foreground"
          >
            <LogIn className="h-4 w-4" />
            进入系统
          </button>
        </form>
      </section>
    </main>
  );
}
