'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import Layout from '@/components/Layout';
import PurchaseDialog from '@/components/PurchaseDialog';
import SaleDialog from '@/components/SaleDialog';
import ExpenseDialog from '@/components/ExpenseDialog';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Gem, Package, Plus, ReceiptText, ShoppingCart, TrendingUp, } from 'lucide-react';
const LOW_STOCK_THRESHOLD = 5;
function currency(value) {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
function localDateString(date) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}
function makeLinePath(values, width, height, topPadding) {
    if (values.length < 2)
        return '';
    const max = Math.max(1, ...values);
    const usableHeight = height - topPadding - 12;
    return values.map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = topPadding + usableHeight - (value / max) * usableHeight;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
}
export default function DashboardPage() {
    const supabase = useMemo(() => createClient(), []);
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [partners, setPartners] = useState([]);
    const [drawings, setDrawings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saleOpen, setSaleOpen] = useState(false);
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [expenseOpen, setExpenseOpen] = useState(false);
    const [restockProductId, setRestockProductId] = useState();
    const load = useCallback(async () => {
        const results = await Promise.all([
            supabase.from('products').select('*').order('name'),
            supabase.from('sales').select('*, products(name, type, category, unit, buying_price)').order('date', { ascending: false }).order('created_at', { ascending: false }),
            supabase.from('purchases').select('date, qty, total_price'),
            supabase.from('expenses').select('amount, date, category'),
            supabase.from('partners').select('*').order('id'),
            supabase.from('partner_drawings').select('partner_id, amount'),
        ]);
        const failure = results.find((result) => result.error);
        if (failure?.error) {
            setError(failure.error.message);
        }
        else {
            setProducts((results[0].data || []));
            setSales((results[1].data || []));
            setPurchases((results[2].data || []));
            setExpenses((results[3].data || []));
            setPartners((results[4].data || []));
            setDrawings((results[5].data || []));
            setError('');
        }
        setLoading(false);
    }, [supabase]);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => {
        function refresh() {
            void load();
        }
        window.addEventListener('ledger:data-changed', refresh);
        return () => window.removeEventListener('ledger:data-changed', refresh);
    }, [load]);
    const periodSales = sales;
    const periodPurchases = purchases;
    const periodExpenses = expenses;
    const totalSales = periodSales.reduce((sum, sale) => sum + Number(sale.total_price), 0);
    const costOfGoodsSold = periodSales.reduce((sum, sale) => sum + Number(sale.cost_price ?? sale.products?.buying_price ?? 0) * Number(sale.qty), 0);
    const grossProfit = totalSales - costOfGoodsSold;
    const totalPurchases = periodPurchases.reduce((sum, purchase) => sum + Number(purchase.total_price), 0);
    const totalExpenses = periodExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const netProfit = grossProfit - totalExpenses;
    const unitsSold = periodSales.reduce((sum, sale) => sum + Number(sale.qty), 0);
    const stockUnits = products.reduce((sum, product) => sum + Number(product.stock_qty), 0);
    const inventoryCost = products.reduce((sum, product) => sum + Number(product.stock_qty) * Number(product.buying_price), 0);
    const inventoryRetail = products.reduce((sum, product) => sum + Number(product.stock_qty) * Number(product.selling_price), 0);
    const lowStockProducts = products.filter((product) => Number(product.stock_qty) <= LOW_STOCK_THRESHOLD);
    const partnerShares = partners.map((partner, index) => {
        const lifetimeGrossProfit = sales.reduce((sum, sale) => sum + Number(sale.total_price) - Number(sale.cost_price ?? sale.products?.buying_price ?? 0) * Number(sale.qty), 0);
        const paidOut = drawings
            .filter((drawing) => drawing.partner_id === partner.id)
            .reduce((sum, drawing) => sum + Number(drawing.amount), 0);
        return {
            ...partner,
            color: index % 2 === 0 ? '#d4b063' : '#d8618e',
            initials: partner.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
            share: grossProfit * Number(partner.share_percent) / 100,
            due: lifetimeGrossProfit * Number(partner.share_percent) / 100 - paidOut,
        };
    });
    const bestSellers = Object.values(periodSales.reduce((grouped, sale) => {
        const id = sale.product_id;
        const item = grouped[id] || {
            id,
            name: sale.products?.name || 'Deleted product',
            qty: 0,
            revenue: 0,
            profit: 0,
        };
        item.qty += Number(sale.qty);
        item.revenue += Number(sale.total_price);
        item.profit += Number(sale.total_price) - Number(sale.cost_price ?? sale.products?.buying_price ?? 0) * Number(sale.qty);
        grouped[id] = item;
        return grouped;
    }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const byCategory = Object.entries(periodSales.reduce((grouped, sale) => {
        const category = sale.products?.category || sale.products?.type || 'Other';
        grouped[category] = (grouped[category] || 0) + Number(sale.total_price);
        return grouped;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxCategoryValue = Math.max(1, ...byCategory.map(([, amount]) => amount));
    const recentSales = [...periodSales]
        .sort((a, b) => `${b.date}T${b.created_at}`.localeCompare(`${a.date}T${a.created_at}`))
        .slice(0, 5);
    const days = [];
    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd.getTime() - 29 * 86400000);
    const chartStart = rangeStart < new Date(rangeEnd.getTime() - 29 * 86400000)
        ? new Date(rangeEnd.getTime() - 29 * 86400000)
        : rangeStart;
    for (const date = new Date(chartStart); date <= rangeEnd; date.setDate(date.getDate() + 1)) {
        days.push(new Date(date));
        if (days.length >= 31)
            break;
    }
    const dailySales = days.map((date) => {
        const key = localDateString(date);
        return periodSales.filter((sale) => sale.date === key).reduce((sum, sale) => sum + Number(sale.total_price), 0);
    });
    const dailyProfit = days.map((date) => {
        const key = localDateString(date);
        return periodSales.filter((sale) => sale.date === key).reduce((sum, sale) => sum + Number(sale.total_price) - Number(sale.cost_price ?? sale.products?.buying_price ?? 0) * Number(sale.qty), 0);
    });
    const maxTrend = Math.max(1, ...dailySales);
    const salesPath = makeLinePath(dailySales, 640, 220, 12);
    const profitPath = dailyProfit.map((value) => Math.max(0, value));
    const profitSvgPath = makeLinePath(profitPath, 640, 220, 12);
    const chartLabels = days.length > 1
        ? [0, Math.floor((days.length - 1) / 3), Math.floor((days.length - 1) * 2 / 3), days.length - 1]
            .filter((index, pos, indexes) => indexes.indexOf(index) === pos)
            .map((index) => days[index])
        : days;
    const statCards = [
        { title: 'Total sales', value: currency(totalSales), meta: `${periodSales.length} bills · ${unitsSold.toLocaleString('en-IN')} units`, icon: ShoppingCart, iconBg: 'bg-[#d4b063]/10 text-[#d4b063]' },
        { title: 'Gross profit', value: currency(grossProfit), meta: `${totalSales ? (grossProfit / totalSales * 100).toFixed(1) : '0.0'}% margin`, icon: TrendingUp, iconBg: 'bg-[#53d796]/10 text-[#53d796]' },
        { title: 'Cost of goods sold', value: currency(costOfGoodsSold), meta: 'Captured cost × quantity sold', icon: ReceiptText, iconBg: 'bg-[#c1d7ff]/10 text-[#c1d7ff]' },
        { title: 'Purchases', value: currency(totalPurchases), meta: 'Stock bought in period', icon: Package, iconBg: 'bg-[#f4a6ba]/10 text-[#f4a6ba]' },
    ];
    return (<Layout>
      <div className="space-y-6 pb-8">
        <div className="pt-2">
          <div className="text-[11px] uppercase tracking-[0.32em] text-[#d4b063]">Executive overview</div>
          <h1 className="mt-3 text-[2.15rem] font-semibold tracking-[-0.06em] text-[#f4f0ea] md:text-[2.6rem]">Dashboard</h1>
          <p className="mt-2 text-sm text-[#b7c1d0]">
            All records. Gross profit = sales − cost of goods sold.
          </p>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>}
        {loading && <p className="text-xs text-[#8f99a9]">Loading live shop data…</p>}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (<div key={stat.title} className="rounded-2xl border border-[#222936] bg-[#111318] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconBg}`}><Icon className="h-4 w-4"/></div>
                  <span className="text-[#757b84]"><ArrowUpRight className="h-4 w-4"/></span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#a8b3c7]">{stat.title}</div>
                <div className="mt-3 text-[1.55rem] font-semibold tracking-[-0.04em] text-[#f5f3ef]">{stat.value}</div>
                <div className="mt-1.5 text-xs text-[#9ca9bc]">{stat.meta}</div>
              </div>);
        })}
        </div>

        <div className="rounded-2xl border border-[#d4b063]/50 bg-[#171d2e] px-5 py-4 shadow-[inset_0_0_0_1px_rgba(212,176,99,0.15)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d4b063]/60 bg-[#d4b063]/10 text-[#d4b063]"><Gem className="h-5 w-5"/></div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#d9c078]">Inventory on hand</div>
                <div className="text-sm text-[#dfe8f4]">{stockUnits.toLocaleString('en-IN')} units across {products.length} products</div>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm text-[#dfe8f4] sm:flex-row sm:gap-6 xl:items-center">
              <div className="flex items-center gap-2"><span className="text-[10px] uppercase tracking-[0.18em] text-[#9aa8bd]">At cost</span><span className="font-semibold text-[#f5f4f1]">{currency(inventoryCost)}</span></div>
              <div className="flex items-center gap-2"><span className="text-[10px] uppercase tracking-[0.18em] text-[#9aa8bd]">At retail</span><span className="font-semibold text-[#f5f4f1]">{currency(inventoryRetail)}</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1.5fr_0.9fr]">
          {partnerShares.map((partner) => (<div key={partner.id} className="rounded-2xl border border-[#222936] bg-[#15161f] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-[#101828]" style={{ backgroundColor: partner.color }}>{partner.initials}</div>
                  <div><div className="text-base font-medium text-[#f2efe9]">{partner.name}</div><div className="text-xs text-[#aeb8c6]">{partner.role}</div></div>
                </div>
                <div className="rounded-full border border-[#394557] bg-[#101d2b] px-2.5 py-1 text-xs font-semibold text-[#dfeaf9]">{partner.share_percent}%</div>
              </div>
              <div className="mt-5">
                <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#a6afc1]">Profit share · all time</div>
                <div className="text-[1.6rem] font-semibold tracking-[-0.04em] text-[#f5f3ef]">{currency(partner.share)}</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0d1017]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, partner.share_percent))}%`, backgroundColor: partner.color }}/>
                </div>
                <div className="mt-2 text-xs text-[#9ca9bc]">Lifetime balance due: {currency(partner.due)}</div>
              </div>
            </div>))}

          <div className="rounded-2xl border border-[#d4b063]/50 bg-[#121318] p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#d9c078]">Expenses · separate</div>
              <ReceiptText className="h-4 w-4 text-[#d4b063]"/>
            </div>
            <div className="text-[1.8rem] font-semibold tracking-[-0.05em] text-[#f7f2ea]">{currency(totalExpenses)}</div>
            <p className="mt-2 text-xs leading-5 text-[#b8c6d7]">Operating costs are kept separate from partners&apos; gross-profit share.</p>
            <div className="mt-4 border-t border-[#312d2d] pt-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#a3b2cb]">Profit after expenses</div>
              <div className={`mt-1 text-xl font-semibold ${netProfit >= 0 ? 'text-[#53d796]' : 'text-[#f07878]'}`}>{currency(netProfit)}</div>
            </div>
            <button type="button" onClick={() => setExpenseOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#353743] bg-[#171820] px-4 py-2 text-xs font-semibold text-[#ecf3ff] transition hover:border-[#d4b063]/50">
              <Plus className="h-4 w-4"/> Add expense
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2.2fr_0.9fr]">
            <div className="rounded-2xl border border-[#222936] bg-[#111318] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl text-[#f2efe9]">Sales &amp; profit trend</h2>
                <div className="flex items-center gap-3 text-[10px] text-[#a9b7c8]">
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#d4b063]"/>Sales</span>
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#53d796]"/>Profit</span>
                </div>
              </div>
              <div className="relative h-[220px]">
                <svg viewBox="0 0 640 220" className="h-full w-full" preserveAspectRatio="none" aria-label="Daily sales and gross profit chart">
                  {[0, 1, 2, 3].map((row) => <line key={row} x1="0" y1={18 + row * 55} x2="640" y2={18 + row * 55} stroke="#252a34" strokeWidth="1"/>)}
                  {salesPath && <path d={salesPath} fill="none" stroke="#d4b063" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
                  {profitSvgPath && <path d={profitSvgPath} fill="none" stroke="#53d796" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
                </svg>
                {dailySales.length === 0 && <div className="absolute inset-0 grid place-items-center text-sm text-[#9298a2]">No sales in this period.</div>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 text-[9px] text-[#8d9bb3]">
                  {chartLabels.map((day) => <span key={day.toISOString()}>{day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>)}
                </div>
                <span className="sr-only">Maximum daily sales: {currency(maxTrend)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#222936] bg-[#111318] p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl text-[#f2efe9]">Low stock</h2>
                <AlertTriangle className="h-4 w-4 text-[#d4b063]"/>
              </div>
              <div className="space-y-3">
                {lowStockProducts.length === 0 && <p className="text-sm text-[#9aa9bf]">No low-stock products.</p>}
                {lowStockProducts.map((product) => (<div key={product.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#1f2b3a] bg-[#0c0d12] px-3 py-2.5">
                    <div className="min-w-0"><div className="truncate text-xs font-medium text-[#f4f0ea]">{product.name}</div><div className="text-[10px] text-[#9aa9bf]">{product.unit}</div></div>
                    <span className="text-xs font-semibold text-[#f4a6ba]">{Number(product.stock_qty)}</span>
                    <button type="button" onClick={() => { setRestockProductId(product.id); setPurchaseOpen(true); }} className="rounded-md border border-[#2b3040] px-2 py-1 text-[10px] text-[#e8e1d5] hover:border-[#d4b063]/60">Restock</button>
                  </div>))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1.2fr_1fr]">
            <div className="rounded-2xl border border-[#222936] bg-[#111318] p-4">
              <h2 className="mb-4 text-xl text-[#f2efe9]">Best sellers</h2>
              <div className="space-y-3">
                {bestSellers.length === 0 && <p className="text-sm text-[#9aa9bf]">No sales in this period.</p>}
                {bestSellers.map((item, index) => (<div key={item.id} className="flex items-center justify-between gap-3 border-b border-[#1c222d] pb-2.5 last:border-0">
                    <div className="flex min-w-0 items-center gap-2.5"><span className="text-[10px] font-bold text-[#d4b063]">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0"><div className="truncate text-xs text-[#f3efe8]">{item.name}</div><div className="text-[10px] text-[#9aa9bf]">{item.qty} units · profit {currency(item.profit)}</div></div></div>
                    <span className="shrink-0 text-xs font-semibold text-[#f6f1ea]">{currency(item.revenue)}</span>
                  </div>))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#222936] bg-[#111318] p-4">
              <h2 className="mb-4 text-xl text-[#f2efe9]">By category</h2>
              <div className="space-y-4">
                {byCategory.length === 0 && <p className="text-sm text-[#9aa9bf]">No category sales in this period.</p>}
                {byCategory.map(([category, amount]) => (<div key={category}>
                    <div className="mb-1.5 flex justify-between gap-2 text-xs"><span className="truncate text-[#e4dfd8]">{category}</span><span className="text-[#b8b4ac]">{currency(amount)}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#0b0d12]"><div className="h-full rounded-full bg-[#d4b063]" style={{ width: `${amount / maxCategoryValue * 100}%` }}/></div>
                  </div>))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#222936] bg-[#111318] p-4">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-xl text-[#f2efe9]">Recent sales</h2><Link href="/sales" className="text-[10px] text-[#d4b063] hover:underline">View all</Link></div>
              <div className="space-y-3">
                {recentSales.length === 0 && <p className="text-sm text-[#9aa9bf]">No sales in this period.</p>}
                {recentSales.map((sale) => {
            const profit = Number(sale.total_price) - Number(sale.cost_price ?? sale.products?.buying_price ?? 0) * Number(sale.qty);
            return (<div key={sale.id} className="flex items-center justify-between gap-2 border-b border-[#1d2a39] pb-2.5 last:border-0">
                      <div className="min-w-0"><div className="truncate text-xs text-[#f3efe8]">{sale.products?.name || 'Deleted product'} ×{sale.qty}</div><div className="truncate text-[10px] text-[#9aa9bf]">{sale.date} · {sale.customer || 'Walk-in'}</div></div>
                      <div className="shrink-0 text-right"><div className="text-xs font-semibold text-[#f5efe8]">{currency(Number(sale.total_price))}</div><div className="text-[10px] text-[#53d796]">{profit >= 0 ? <ArrowUpRight className="inline h-3 w-3"/> : <ArrowDownRight className="inline h-3 w-3"/>}{currency(Math.abs(profit))}</div></div>
                    </div>);
        })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <SaleDialog open={saleOpen} onClose={() => setSaleOpen(false)} onSaved={load}/>
      <PurchaseDialog open={purchaseOpen} onClose={() => setPurchaseOpen(false)} onSaved={load} initialProductId={restockProductId}/>
      <ExpenseDialog open={expenseOpen} onClose={() => setExpenseOpen(false)} onSaved={load}/>
    </Layout>);
}
