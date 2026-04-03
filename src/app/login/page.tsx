import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <main className="min-h-dvh w-full p-4 md:p-10">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur">
          <div className="mb-4 text-sm font-medium tracking-wide text-white/70">vaytoy</div>
          <LoginClient />
        </div>
      </div>
    </main>
  );
}

