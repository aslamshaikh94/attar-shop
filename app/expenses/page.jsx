'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import Layout from '@/components/Layout';
import ExpenseDialog from '@/components/ExpenseDialog';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
function currency(value) {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
function formatDate(value) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}
export default function Expenses() {
    const supabase = useMemo(() => createClient(), []);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(async () => {
        const { data, error: loadError } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });
        if (loadError) {
            setError(loadError.message);
        }
        else {
            setExpenses((data || []));
            setError('');
        }
        setLoading(false);
    }, [supabase]);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => {
        const refresh = () => { void load(); };
        window.addEventListener('ledger:data-changed', refresh);
        return () => window.removeEventListener('ledger:data-changed', refresh);
    }, [load]);
    const periodExpenses = expenses;
    const totalExpenses = periodExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const totalsByCategory = periodExpenses.reduce((totals, expense) => {
        const category = expense.category?.trim() || 'Uncategorized';
        totals[category] = (totals[category] || 0) + Number(expense.amount);
        return totals;
    }, {});
    const categories = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]);
    const maxCategoryTotal = categories[0]?.[1] || 0;
    async function removeExpense(expense) {
        if (!confirm(`Delete expense "${expense.title}"?`))
            return;
        const { error: deleteError } = await supabase.from('expenses').delete().eq('id', expense.id);
        if (deleteError) {
            setError(deleteError.message);
            return;
        }
        await load();
    }
    if (loading) {
        return <Layout><div className="py-20 text-center text-[#aeb8c6]">Loading expenses…</div></Layout>;
    }
    return (<Layout>
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-[#d4b063]">Operations</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#f4f0ea]">Expenses</h1>
            <p className="mt-1 text-sm text-[#aeb8c6]">Shop running costs, kept in their own ledger.</p>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#d4b063] px-4 py-2.5 text-sm font-semibold text-[#101018] transition hover:brightness-110">
            <Plus className="h-4 w-4"/> Add expense
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[#644013] bg-[#21170e] px-4 py-3 text-sm text-[#e2c59d]">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#de761a]"/>
          <span>Expenses are calculated separately. They are not deducted from the gross profit that is shared between Riyaz and Heena.</span>
        </div>

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_2fr]">
          <section className="rounded-2xl border border-[#242833] bg-[#111318] p-5">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#e07819]">Total expenses</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-[#f3efe9]">{currency(totalExpenses)}</div>

            {categories.length > 0 ? (<div className="mt-5 space-y-3">
                {categories.map(([category, amount]) => (<div key={category}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate text-[#d5d0c8]">{category}</span>
                      <span className="shrink-0 text-[#a6a29a]">{currency(amount)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#0a0b0f]">
                      <div className="h-full rounded-full bg-[#e07819]" style={{ width: `${maxCategoryTotal ? Math.max(3, amount / maxCategoryTotal * 100) : 0}%` }}/>
                    </div>
                  </div>))}
              </div>) : (<p className="mt-5 text-sm text-[#9699a2]">Expense categories will appear here.</p>)}
          </section>

          <section className="rounded-2xl border border-[#242833] bg-[#111318] p-4 sm:p-5">
            <h2 className="mb-2 text-xl text-[#f2eee7]">Expense ledger</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#252832] text-[11px] text-[#d6d0c7]">
                    <th className="px-2 py-3 font-medium">Date</th>
                    <th className="px-2 py-3 font-medium">Category</th>
                    <th className="px-2 py-3 font-medium">Note</th>
                    <th className="px-2 py-3 text-right font-medium">Amount</th>
                    <th className="w-9 px-2 py-3"/>
                  </tr>
                </thead>
                <tbody>
                  {periodExpenses.map((expense) => (<tr key={expense.id} className="border-b border-[#20232b] text-sm last:border-0 hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-2 py-3 font-mono text-xs text-[#a4a3a0]">{formatDate(expense.date)}</td>
                      <td className="px-2 py-3 text-[#e1dcd5]">{expense.category || expense.title}</td>
                      <td className="px-2 py-3 text-[#aaa69f]">{expense.note || expense.title}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right font-medium text-[#eae5de]">{currency(Number(expense.amount))}</td>
                      <td className="px-2 py-3 text-right">
                        <button type="button" aria-label={`Delete expense ${expense.title}`} onClick={() => void removeExpense(expense)} className="rounded p-1 text-[#8c8c92] transition hover:bg-white/5 hover:text-[#ee665c]">
                          <Trash2 className="h-4 w-4"/>
                        </button>
                      </td>
                    </tr>))}
                  {periodExpenses.length === 0 && (<tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-[#9ca9bc]">No expenses recorded yet.</td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
      <ExpenseDialog open={open} onClose={() => setOpen(false)} onSaved={load}/>
    </Layout>);
}
