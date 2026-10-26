'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import Layout from '@/components/Layout';
import SaleDialog from '@/components/SaleDialog';
import { CreditCard, Gem, Search, ShoppingBag, Trash2, TrendingUp } from 'lucide-react';
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
export default function Sales() {
    const supabase = useMemo(() => createClient(), []);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saleOpen, setSaleOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const load = useCallback(async () => {
        const { data, error: loadError } = await supabase
            .from('sales')
            .select('*, products(name, unit, buying_price)')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });
        if (loadError) {
            setError(loadError.message);
        }
        else {
            setSales((data || []));
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
    const periodSales = sales;
    const revenue = periodSales.reduce((sum, sale) => sum + Number(sale.total_price), 0);
    const grossProfit = periodSales.reduce((sum, sale) => sum + Number(sale.total_price) - Number(sale.cost_price ?? sale.products?.buying_price ?? 0) * Number(sale.qty), 0);
    const unitsSold = periodSales.reduce((sum, sale) => sum + Number(sale.qty), 0);
    const filteredSales = periodSales.filter((sale) => `${sale.products?.name || ''} ${sale.customer || ''} ${sale.payment_method || 'Cash'}`
        .toLowerCase()
        .includes(search.toLowerCase()));
    async function removeSale(sale) {
        if (!confirm(`Delete this sale of ${sale.products?.name || 'product'}? Stock will be returned.`))
            return;
        const response = await fetch(`/api/sales?id=${sale.id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) {
            setError(result.error || 'Unable to delete sale');
            return;
        }
        await load();
    }
    if (loading) {
        return <Layout><div className="py-20 text-center text-[#aeb8c6]">Loading sales…</div></Layout>;
    }
    return (<Layout>
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#f4f0ea]">Sales</h1>
            <p className="mt-1 text-sm text-[#aeb8c6]">
              Every sale captures the cost price at that moment, so profit stays accurate even if prices change later.
            </p>
          </div>
          <button type="button" onClick={() => setSaleOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#d4b063] px-4 py-2.5 text-sm font-semibold text-[#101018] transition hover:brightness-110">
            <ShoppingBag className="h-4 w-4"/> New sale
          </button>
        </div>

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: 'Revenue', value: currency(revenue), icon: ShoppingBag, color: 'text-[#d4b063]', iconBg: 'border-[#59471f] bg-[#211b10]' },
            { label: 'Gross profit', value: currency(grossProfit), icon: TrendingUp, color: 'text-[#20cc7a]', iconBg: 'border-[#24573d] bg-[#10231a]' },
            { label: 'Units sold', value: unitsSold.toLocaleString('en-IN', { maximumFractionDigits: 2 }), icon: Gem, color: 'text-[#b8b6b1]', iconBg: 'border-[#30313b] bg-[#191a21]' },
            { label: 'Bills', value: String(periodSales.length), icon: CreditCard, color: 'text-[#b8b6b1]', iconBg: 'border-[#30313b] bg-[#191a21]' },
        ].map((stat) => {
            const Icon = stat.icon;
            return (<div key={stat.label} className="rounded-2xl border border-[#242833] bg-[#111318] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#aaa69f]">{stat.label}</div>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${stat.iconBg} ${stat.color}`}>
                    <Icon className="h-4 w-4"/>
                  </div>
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-[#f3efe9]">{stat.value}</div>
              </div>);
        })}
        </div>

        <section className="rounded-2xl border border-[#242833] bg-[#111318] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl text-[#f2eee7]">Sales register</h2>
            <label className="flex w-full items-center gap-2 rounded-xl border border-[#2b3040] bg-[#1a1b24] px-3 py-2 text-[#8f929d] sm:max-w-[300px]">
              <Search className="h-4 w-4 shrink-0"/>
              <input aria-label="Search sales" className="w-full bg-transparent text-sm text-[#f4f0ea] outline-none placeholder:text-[#96939a]" placeholder="Product, customer, mode…" value={search} onChange={(event) => setSearch(event.target.value)}/>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#252832] text-[11px] text-[#d6d0c7]">
                  <th className="px-2 py-3 font-medium">Date</th>
                  <th className="px-2 py-3 font-medium">Product</th>
                  <th className="px-2 py-3 font-medium">Customer</th>
                  <th className="px-2 py-3 text-right font-medium">Qty</th>
                  <th className="px-2 py-3 text-right font-medium">Price</th>
                  <th className="px-2 py-3 text-right font-medium">Total</th>
                  <th className="px-2 py-3 text-right font-medium">Profit</th>
                  <th className="px-2 py-3 font-medium">Mode</th>
                  <th className="w-9 px-2 py-3"/>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
            const profit = Number(sale.total_price) - Number(sale.cost_price ?? sale.products?.buying_price ?? 0) * Number(sale.qty);
            return (<tr key={sale.id} className="border-b border-[#20232b] text-sm last:border-0 hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-2 py-3 font-mono text-xs text-[#a4a3a0]">{formatDate(sale.date)}</td>
                      <td className="px-2 py-3">
                        <div className="text-[#eeeae4]">{sale.products?.name || 'Deleted product'}</div>
                        {sale.products?.unit && <div className="text-[10px] text-[#8c8c92]">{sale.products.unit}</div>}
                      </td>
                      <td className="px-2 py-3 text-[#bbb7b1]">{sale.customer || 'Walk-in'}</td>
                      <td className="px-2 py-3 text-right text-[#e5e0d9]">{Number(sale.qty).toLocaleString('en-IN')}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-[#c9c4bd]">{currency(Number(sale.unit_price))}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right font-medium text-[#eae5de]">{currency(Number(sale.total_price))}</td>
                      <td className={`whitespace-nowrap px-2 py-3 text-right font-semibold ${profit >= 0 ? 'text-[#19c875]' : 'text-[#ee665c]'}`}>
                        {currency(profit)}
                      </td>
                      <td className="px-2 py-3">
                        <span className="rounded-full border border-[#30313b] px-2 py-1 text-[10px] text-[#dedad3]">
                          {sale.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button type="button" aria-label={`Delete sale for ${sale.products?.name || 'product'}`} onClick={() => void removeSale(sale)} className="rounded p-1 text-[#8c8c92] transition hover:bg-white/5 hover:text-[#ee665c]">
                          <Trash2 className="h-4 w-4"/>
                        </button>
                      </td>
                    </tr>);
        })}
                {filteredSales.length === 0 && (<tr>
                    <td colSpan={9} className="py-10 text-center text-sm text-[#9ca9bc]">
                      {sales.length ? 'No sales match your search.' : 'No sales recorded yet.'}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <SaleDialog open={saleOpen} onClose={() => setSaleOpen(false)} onSaved={load}/>
    </Layout>);
}
