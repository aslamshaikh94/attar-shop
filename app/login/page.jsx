'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    async function signIn(event) {
        event.preventDefault();
        setLoading(true);
        setError('');
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
        }
        const next = new URLSearchParams(window.location.search).get('next');
        const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/';
        router.replace(destination);
        router.refresh();
    }
    return (<main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08090d] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,176,99,0.12),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(98,69,31,0.12),transparent_38%)]"/>

      <section className="relative w-full max-w-[440px] rounded-[26px] border border-[#292a32] bg-[#121318]/95 p-7 shadow-2xl shadow-black/40 sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d4b063]/50 bg-[#211b10] text-xl font-semibold text-[#d4b063]">
            <KeyRound className="h-5 w-5"/>
          </div>
          <div>
            <div className="text-xl font-semibold text-[#f2eee7]">Attar Ledger</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.24em] text-[#8f9098]">Perfume &amp; Attar House</div>
          </div>
        </div>

        <div className="mb-7">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#d4b063]">Welcome back</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#f4f0ea]">Sign in to your ledger</h1>
          <p className="mt-2 text-sm leading-6 text-[#a4a1a0]">Enter your account details to manage your shop.</p>
        </div>

        <form onSubmit={signIn} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#d2ccc3]">Email address</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl border border-[#2b3040] bg-[#1a1b24] px-4 text-sm text-[#f4f0ea] outline-none transition placeholder:text-[#777982] focus:border-[#d4b063]/70 focus:ring-2 focus:ring-[#d4b063]/10"/>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#d2ccc3]">Password</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#858792]"/>
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-[#2b3040] bg-[#1a1b24] px-11 pr-12 text-sm text-[#f4f0ea] outline-none transition placeholder:text-[#777982] focus:border-[#d4b063]/70 focus:ring-2 focus:ring-[#d4b063]/10"/>
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#92939b] transition hover:bg-white/5 hover:text-[#f4f0ea]">
                {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
              </button>
            </div>
          </div>

          {error && <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2.5 text-sm text-red-300">{error}</p>}

          <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d4b063] px-4 text-sm font-semibold text-[#17130a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
            {loading && <LoaderCircle className="h-4 w-4 animate-spin"/>}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-7 border-t border-[#25262d] pt-5 text-center text-xs text-[#85858c]">
          Your shop data is available only to signed-in users.
        </div>
      </section>
    </main>);
}
