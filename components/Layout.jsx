'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import SaleDialog from '@/components/SaleDialog';
import PurchaseDialog from '@/components/PurchaseDialog';
import ExpenseDialog from '@/components/ExpenseDialog';
import { LayoutDashboard, Package, ShoppingCart, CreditCard, FileText, Users, Database, ChevronDown, Plus, CircleDollarSign, LogOut, } from 'lucide-react';
const NAV = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Products & Stock', href: '/products', icon: Package },
    { label: 'Sales', href: '/sales', icon: CreditCard },
    { label: 'Purchases', href: '/purchases', icon: ShoppingCart },
    { label: 'Expenses', href: '/expenses', icon: FileText },
    { label: 'Partners', href: '/drawings', icon: Users },
    { label: 'Backup & Restore', href: '/backup', icon: Database },
];
function LayoutContent({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [saleDialogOpen, setSaleDialogOpen] = useState(false);
    const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    async function signOut() {
        setSigningOut(true);
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
            window.alert(`Unable to sign out: ${error.message}`);
            setSigningOut(false);
            return;
        }
        router.replace('/login');
        router.refresh();
    }
    return (<div className="min-h-screen bg-[#030b16] text-[#f5f0e8]">
      <div className="flex min-h-screen">
        <aside className="w-[270px] border-r border-[#1c2a3a] bg-[#040d1b] px-6 py-6">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d4b063]/70 bg-[#0d1727] text-lg font-bold text-[#d4b063]">
              A
            </div>
            <div>
              <div className="text-[1.1rem] font-semibold tracking-tight text-[#f0ede6]">Attar Ledger</div>
              <div className="text-[9px] uppercase tracking-[0.24em] text-[#8e99ad]">Perfume & Attar</div>
              <div className="text-[9px] uppercase tracking-[0.24em] text-[#8e99ad]">House</div>
            </div>
          </div>

          <nav className="space-y-2">
            {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (<Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition ${active
                    ? 'border-[#d4b063]/50 bg-[#1a2330] text-[#f1e8d5] shadow-[inset_0_0_0_1px_rgba(212,176,99,0.2)]'
                    : 'border-transparent bg-transparent text-[#b5bfce] hover:border-[#2a3646] hover:bg-[#0e1a2a] hover:text-[#edf2ff]'}`}>
                  <Icon className="h-4 w-4"/>
                  <span>{item.label}</span>
                </Link>);
        })}
          </nav>

          <div className="mt-10 rounded-2xl border border-[#222d3c] bg-[#0a1828] p-4">
            <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#bfa76d]">Profit Split</div>
            <div className="space-y-3">
              {[
            { name: 'Riyaz Shaikh', share: '50%' },
            { name: 'Heena Shaikh', share: '50%' },
        ].map((person, index) => (<div key={person.name} className="flex items-center justify-between rounded-xl border border-[#1d2a39] bg-[#0d1b2d] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${index === 0 ? 'bg-[#d4b063] text-[#101828]' : 'bg-[#d8618e] text-[#fae9f0]'}`}>
                      {person.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-sm text-[#f3efe8]">{person.name}</div>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-[#cfe0ff]">{person.share}</div>
                </div>))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#d4b063]/50 bg-[#0d1727] px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4b063] text-[#101828]">
                <CircleDollarSign className="h-4 w-4"/>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#d9c07c]">Owner</div>
                <div className="text-sm text-[#ecf3ff]">Riyaz Shaikh</div>
              </div>
            </div>
            <button type="button" title="Sign out" aria-label="Sign out" onClick={signOut} disabled={signingOut} className="rounded-md p-1 text-[#c9d2e6] transition hover:bg-white/5 hover:text-[#d4b063] disabled:opacity-50">
              {signingOut ? <ChevronDown className="h-4 w-4 animate-pulse"/> : <LogOut className="h-4 w-4"/>}
            </button>
          </div>
        </aside>

        <main className="flex-1 px-6 py-6">
          <header className="mb-7 flex items-center justify-between gap-4">
            <span />

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setSaleDialogOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#d4b063]/60 bg-[#d4b063] px-4 py-2.5 text-sm font-semibold text-[#0a1018] shadow-[0_0_18px_rgba(212,176,99,0.24)] transition hover:brightness-105">
                <Plus className="h-4 w-4"/>
                Sale
              </button>
              <button type="button" onClick={() => setPurchaseDialogOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#2a3446] bg-[#0b1624] px-4 py-2.5 text-sm font-semibold text-[#ecf4ff] transition hover:border-[#d4b063]/40 hover:text-white">
                <Plus className="h-4 w-4"/>
                Purchase
              </button>
              <button type="button" onClick={() => setExpenseDialogOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#2a3446] bg-[#0b1624] px-4 py-2.5 text-sm font-semibold text-[#ecf4ff] transition hover:border-[#d4b063]/40 hover:text-white">
                <Plus className="h-4 w-4"/>
                Expense
              </button>
            </div>
          </header>

          <div className="max-w-[1280px]">{children}</div>
        </main>
      </div>
      <SaleDialog open={saleDialogOpen} onClose={() => setSaleDialogOpen(false)}/>
      <PurchaseDialog open={purchaseDialogOpen} onClose={() => setPurchaseDialogOpen(false)}/>
      <ExpenseDialog open={expenseDialogOpen} onClose={() => setExpenseDialogOpen(false)}/>
    </div>);
}
export default function Layout({ children }) {
    return <LayoutContent>{children}</LayoutContent>;
}
