'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { PieChart, Users } from 'lucide-react';
export default function Report() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    async function load() {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/report');
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error || 'Failed to load report');
            setData(result);
        }
        catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load report');
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const partners = data?.partners || [];
    const movement = data?.movement || [];
    if (loading) {
        return (<Layout>
        <div className="py-20 text-center text-[#aeb8c6]">Loading report…</div>
      </Layout>);
    }
    return (<Layout>
      <div className="space-y-6 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-[#d4b063]">Reporting</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#f4f0ea]">Profit Report & Partner Shares</h1>
            <p className="mt-1 text-sm text-[#aeb8c6]">View profits, partner share breakdown, and product movement.</p>
          </div>
          <PieChart className="h-8 w-8 text-[#d4b063]"/>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard title="Total Sales" value={formatMoney(data?.totalSales)}/>
          <StatCard title="Total Purchases" value={formatMoney(data?.totalPurchases)}/>
          <StatCard title="Expenses" value={formatMoney(data?.totalExpenses)}/>
          <StatCard title="Gross Profit" value={formatMoney(data?.grossProfit)}/>
          <StatCard title="Net Profit" value={formatMoney(data?.netProfit)}/>
        </div>

        <div className="rounded-2xl border border-[#222936] bg-[#111318] p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-[#f2eee7]">
            <Users className="h-5 w-5"/> Partner Share
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#252832]">
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6]">Partner</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6]">Role</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6] text-right">Share %</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6] text-right">Share Amount</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6] text-right">Drawings</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6] text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => (<tr key={partner.id} className="border-b border-[#20232b]">
                    <td className="py-3 text-sm text-[#eeeae4]">{partner.name}</td>
                    <td className="py-3 text-sm text-[#aeb8c6]">{partner.role}</td>
                    <td className="py-3 text-right text-sm text-[#eeeae4]">{partner.share_percent}%</td>
                    <td className="py-3 text-right text-sm font-medium text-[#eeeae4]">{formatMoney(partner.share_amount)}</td>
                    <td className="py-3 text-right text-sm text-[#eeeae4]">{formatMoney(partner.drawings)}</td>
                    <td className={`py-3 text-right text-sm font-medium ${partner.due >= 0 ? 'text-[#1ed579]' : 'text-[#f07878]'}`}>
                      {partner.due >= 0 ? 'Due ' : 'Overpaid '}{Math.abs(Number(partner.due)).toFixed(2)}
                    </td>
                  </tr>))}
                {partners.length === 0 && (<tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-[#9ca9bc]">
                      No partner data.
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-[#222936] bg-[#111318] p-6">
          <h2 className="mb-4 font-bold text-[#f2eee7]">Product Movement</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#252832]">
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6]">Product</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6]">Type</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6] text-center">Stock</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6] text-center">Bought</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6] text-center">Sold</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6] text-right">Revenue</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-[#aeb8c6] text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {movement.map((item) => (<tr key={item.id} className="border-b border-[#20232b]">
                    <td className="py-3 text-sm text-[#eeeae4]">{item.name}</td>
                    <td className="py-3 text-sm text-[#aeb8c6]">{item.type}</td>
                    <td className="py-3 text-center text-sm text-[#eeeae4]">{Number(item.stock_qty).toFixed(2)}</td>
                    <td className="py-3 text-center text-sm text-[#eeeae4]">{Number(item.bought).toFixed(2)}</td>
                    <td className="py-3 text-center text-sm text-[#eeeae4]">{Number(item.sold).toFixed(2)}</td>
                    <td className="py-3 text-right text-sm text-[#eeeae4]">{formatMoney(item.revenue)}</td>
                    <td className="py-3 text-right text-sm text-[#eeeae4]">{formatMoney(item.cost)}</td>
                  </tr>))}
                {movement.length === 0 && (<tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-[#9ca9bc]">
                      No product data.
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>);
}
function StatCard({ title, value }) {
    return (<div className="rounded-xl border border-[#222936] bg-[#111318] p-5 shadow-sm">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[#aeb8c6]">{title}</div>
      <div className="text-2xl font-bold text-[#f4f0ea]">{value}</div>
    </div>);
}
function formatMoney(v) {
    return Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
