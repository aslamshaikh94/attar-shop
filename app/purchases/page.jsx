'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import Layout from '@/components/Layout';
import PurchaseDialog from '@/components/PurchaseDialog';
import { Box, Search, Store, Trash2, Truck } from 'lucide-react';
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
export default function Purchases() {
    const supabase = useMemo(() => createClient(), []);
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const load = useCallback(async () => {
        const { data, error: loadError } = await supabase
            .from('purchases')
            .select('*, products(name, unit)')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });
        if (loadError) {
            setError(loadError.message);
        }
        else {
            setPurchases((data || []));
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
    const periodPurchases = purchases;
    const totalSpend = periodPurchases.reduce((sum, purchase) => sum + Number(purchase.total_price), 0);
    const unitsBought = periodPurchases.reduce((sum, purchase) => sum + Number(purchase.qty), 0);
    const suppliersCount = new Set(periodPurchases.map((purchase) => purchase.supplier?.trim()).filter((supplier) => Boolean(supplier))).size;
    const filteredPurchases = periodPurchases.filter((purchase) => `${purchase.products?.name || ''} ${purchase.supplier || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()));
    async function removePurchase(purchase) {
        if (!confirm(`Delete this purchase of ${purchase.products?.name || 'product'}? Stock will be reduced.`))
            return;
        const response = await fetch(`/api/purchases?id=${purchase.id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) {
            setError(result.error || 'Unable to delete purchase');
            return;
        }
        await load();
    }
    if (loading) {
        return <Layout><div className="py-20 text-center text-[#aeb8c6]">Loading purchases…</div></Layout>;
    }
    return (<Layout>
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#f4f0ea]">Purchases</h1>
            <p className="mt-1 text-sm text-[#aeb8c6]">
              Stock bought from distillers and suppliers. Each purchase adds to product stock.
            </p>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#d4b063] px-4 py-2.5 text-sm font-semibold text-[#101018] transition hover:brightness-110">
            <Truck className="h-4 w-4"/> New purchase
          </button>
        </div>

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: 'Total spend', value: currency(totalSpend), icon: Truck, style: 'border-[#4b2940] bg-[#211522] text-[#d8618e]' },
            { label: 'Units bought', value: unitsBought.toLocaleString('en-IN', { maximumFractionDigits: 2 }), icon: Box, style: 'border-[#59471f] bg-[#17171a] text-[#c0bdb7]' },
            { label: 'Suppliers', value: String(suppliersCount), icon: Store, style: 'border-[#59471f] bg-[#211b10] text-[#d4b063]' },
        ].map((stat) => {
            const Icon = stat.icon;
            return (<div key={stat.label} className={`rounded-2xl border bg-[#111318] p-4 ${stat.style.split(' ')[0]}`}>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#aaa69f]">{stat.label}</div>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border border-current/20 ${stat.style.split(' ').slice(1).join(' ')}`}>
                    <Icon className="h-4 w-4"/>
                  </div>
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-[#f3efe9]">{stat.value}</div>
              </div>);
        })}
        </div>

        <section className="rounded-2xl border border-[#242833] bg-[#111318] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl text-[#f2eee7]">Purchase register</h2>
            <label className="flex w-full items-center gap-2 rounded-xl border border-[#2b3040] bg-[#1a1b24] px-3 py-2 text-[#8f929d] sm:max-w-[300px]">
              <Search className="h-4 w-4 shrink-0"/>
              <input aria-label="Search purchases" className="w-full bg-transparent text-sm text-[#f4f0ea] outline-none placeholder:text-[#96939a]" placeholder="Product or supplier…" value={search} onChange={(event) => setSearch(event.target.value)}/>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#252832] text-[11px] text-[#d6d0c7]">
                  <th className="px-2 py-3 font-medium">Date</th>
                  <th className="px-2 py-3 font-medium">Product</th>
                  <th className="px-2 py-3 font-medium">Supplier</th>
                  <th className="px-2 py-3 text-right font-medium">Qty</th>
                  <th className="px-2 py-3 text-right font-medium">Unit cost</th>
                  <th className="px-2 py-3 text-right font-medium">Total</th>
                  <th className="w-9 px-2 py-3"/>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => (<tr key={purchase.id} className="border-b border-[#20232b] text-sm last:border-0 hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-2 py-3 font-mono text-xs text-[#a4a3a0]">{formatDate(purchase.date)}</td>
                    <td className="px-2 py-3">
                      <div className="text-[#eeeae4]">{purchase.products?.name || 'Deleted product'}</div>
                      {purchase.products?.unit && <div className="text-[10px] text-[#8c8c92]">{purchase.products.unit}</div>}
                    </td>
                    <td className="px-2 py-3 text-[#bbb7b1]">{purchase.supplier || '—'}</td>
                    <td className="px-2 py-3 text-right text-[#e5e0d9]">+{Number(purchase.qty).toLocaleString('en-IN')}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right text-[#c9c4bd]">{currency(Number(purchase.unit_price))}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right font-medium text-[#eae5de]">{currency(Number(purchase.total_price))}</td>
                    <td className="px-2 py-3 text-right">
                      <button type="button" aria-label={`Delete purchase of ${purchase.products?.name || 'product'}`} onClick={() => void removePurchase(purchase)} className="rounded p-1 text-[#8c8c92] transition hover:bg-white/5 hover:text-[#ee665c]">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </td>
                  </tr>))}
                {filteredPurchases.length === 0 && (<tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-[#9ca9bc]">
                      {purchases.length ? 'No purchases match your search.' : 'No purchases recorded yet.'}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <PurchaseDialog open={open} onClose={() => setOpen(false)} onSaved={load}/>
    </Layout>);
}
