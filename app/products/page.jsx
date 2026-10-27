'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import Layout from '@/components/Layout';
import SaleDialog from '@/components/SaleDialog';
import PurchaseDialog from '@/components/PurchaseDialog';
import { Edit3, LayoutGrid, List, Plus, Search, ShoppingBag, Trash2, Truck } from 'lucide-react';
const LOW_STOCK_THRESHOLD = 4;
const FILTERS = ['All', 'Attar', 'Perfume', 'Oud Oil', 'Bakhoor', 'Other'];
const EMPTY_FORM = {
    name: '',
    type: 'Attar',
    category: '',
    buying_price: '',
    selling_price: '',
    stock_qty: '0',
    unit: 'ml',
};
function currency(value) {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
export default function Products() {
    const supabase = useMemo(() => createClient(), []);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saleProductId, setSaleProductId] = useState();
    const [purchaseProductId, setPurchaseProductId] = useState();
    const [saleOpen, setSaleOpen] = useState(false);
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [view, setView] = useState('cards');
    const load = useCallback(async () => {
        const { data, error: loadError } = await supabase.from('products').select('*').order('name');
        if (loadError) {
            setError(loadError.message);
        }
        else {
            setProducts((data || []));
            setError('');
        }
        setLoading(false);
    }, [supabase]);
    useEffect(() => {
        void load();
    }, [load]);
    const lowStockProducts = products.filter((product) => Number(product.stock_qty) <= LOW_STOCK_THRESHOLD);
    const stockCost = products.reduce((sum, product) => sum + Number(product.stock_qty) * Number(product.buying_price), 0);
    const stockRetail = products.reduce((sum, product) => sum + Number(product.stock_qty) * Number(product.selling_price), 0);
    const filteredProducts = products.filter((product) => {
        const matchesFilter = filter === 'All' ||
            (filter === 'Other'
                ? !FILTERS.slice(1, -1).includes(product.type)
                : product.type.toLowerCase() === filter.toLowerCase());
        const matchesSearch = `${product.name} ${product.type} ${product.category || ''}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });
    function resetForm() {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
    }
    function startEdit(product) {
        setEditing(product);
        setForm({
            name: product.name,
            type: product.type,
            category: product.category || '',
            buying_price: String(product.buying_price),
            selling_price: String(product.selling_price),
            stock_qty: String(product.stock_qty),
            unit: product.unit || 'ml',
        });
        setError('');
        setOpen(true);
    }
    async function save(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        const body = {
            name: form.name.trim(),
            type: form.type,
            category: form.category.trim() || null,
            buying_price: Number(form.buying_price),
            selling_price: Number(form.selling_price),
            stock_qty: Number(form.stock_qty),
            unit: form.unit.trim() || 'ml',
        };
        const result = editing
            ? await supabase.from('products').update(body).eq('id', editing.id)
            : await supabase.from('products').insert([body]);
        if (result.error) {
            setError(result.error.message);
            setSaving(false);
            return;
        }
        setOpen(false);
        resetForm();
        setSaving(false);
        await load();
    }
    async function remove(product) {
        if (!confirm(`Delete ${product.name}?`))
            return;
        const { error: deleteError } = await supabase.from('products').delete().eq('id', product.id);
        if (deleteError) {
            setError(deleteError.message);
            return;
        }
        await load();
    }
    if (loading) {
        return <Layout><div className="py-20 text-center text-[#aeb8c6]">Loading products…</div></Layout>;
    }
    const inputClassName = 'w-full rounded-xl border border-[#2b3040] bg-[#1a1b24] px-3.5 py-3 text-sm text-[#f4f0ea] outline-none focus:border-[#d4b063]/70';
    const labelClassName = 'mb-2 block text-xs font-medium text-[#c9c1b6]';
    return (<Layout>
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-[#d4b063]">Inventory</div>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl tracking-[-0.05em] text-[#f4f0ea]">Products &amp; Stock</h1>
            <p className="mt-1 text-sm text-[#aeb8c6]">Stock goes down with every sale and up with every purchase.</p>
          </div>
          <button type="button" onClick={() => {
            resetForm();
            setError('');
            setOpen(true);
        }} className="inline-flex items-center gap-2 rounded-xl bg-[#d4b063] px-4 py-2.5 text-sm font-semibold text-[#101018] transition hover:brightness-110">
            <Plus className="h-4 w-4"/> Add product
          </button>
        </div>

        {error && !open && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#59471f] bg-[#211b10] p-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          {[
            { label: 'Products', value: String(products.length) },
            { label: 'Stock value (cost)', value: currency(stockCost) },
            { label: 'Stock value (retail)', value: currency(stockRetail) },
            { label: 'Low stock items', value: String(lowStockProducts.length) },
        ].map((stat) => (<div key={stat.label}>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#c7ad6b]">{stat.label}</div>
              <div className="mt-1 text-lg font-semibold text-[#f4ead0]">{stat.value}</div>
            </div>))}
        </div>

        <div className="flex flex-col justify-between gap-3 md:flex-row md:flex-wrap md:items-center">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (<button type="button" key={item} onClick={() => setFilter(item)} className={`rounded-full border px-3.5 py-1.5 text-xs transition ${filter === item
                ? 'border-[#d4b063] bg-[#d4b063] font-semibold text-[#15120a]'
                : 'border-[#30313b] bg-[#111218] text-[#aaa6a0] hover:border-[#d4b063]/50 hover:text-[#f4f0ea]'}`}>
                {item}
              </button>))}
          </div>
          <div className="inline-flex rounded-lg border border-[#30313b] bg-[#111218] p-1">
            <button type="button" onClick={() => setView('cards')} aria-pressed={view === 'cards'} aria-label="Card view" className={`rounded-md p-1.5 transition ${view === 'cards' ? 'bg-[#d4b063] text-[#15120a]' : 'text-[#aaa6a0] hover:text-[#f4f0ea]'}`}>
              <LayoutGrid className="h-4 w-4"/>
            </button>
            <button type="button" onClick={() => setView('table')} aria-pressed={view === 'table'} aria-label="Table view" className={`rounded-md p-1.5 transition ${view === 'table' ? 'bg-[#d4b063] text-[#15120a]' : 'text-[#aaa6a0] hover:text-[#f4f0ea]'}`}>
              <List className="h-4 w-4"/>
            </button>
          </div>
          <label className="flex w-full items-center gap-2 rounded-xl border border-[#2b3040] bg-[#14151c] px-3 py-2.5 text-[#8f929d] md:max-w-[280px]">
            <Search className="h-4 w-4 shrink-0"/>
            <input aria-label="Search fragrances" className="w-full bg-transparent text-sm text-[#f4f0ea] outline-none placeholder:text-[#8f929d]" placeholder="Search fragrance…" value={search} onChange={(event) => setSearch(event.target.value)}/>
          </label>
        </div>

        {filteredProducts.length === 0 ? (<div className="rounded-2xl border border-[#222632] bg-[#111318] py-12 text-center text-sm text-[#9ca9bc]">
            {products.length === 0 ? 'No products yet. Add a product to get started.' : 'No products match your search.'}
          </div>) : view === 'cards' ? (<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
                const stock = Number(product.stock_qty);
                const cost = Number(product.buying_price);
                const selling = Number(product.selling_price);
                const lowStock = stock <= LOW_STOCK_THRESHOLD;
                return (<article key={product.id} className="rounded-2xl border border-[#242833] bg-[#111318] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#c39d37]">{product.type}</div>
                      <h2 className="mt-1 truncate text-lg text-[#f2eee7]">{product.name}</h2>
                      <div className="text-xs text-[#9699a2]">{product.unit}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-2xl font-semibold leading-none ${lowStock ? 'text-[#ee665c]' : 'text-[#f1eee9]'}`}>
                        {stock}
                      </div>
                      <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#85858c]">In stock</div>
                    </div>
                  </div>

                  {lowStock && (<div className="mt-3 inline-flex rounded-full border border-[#79423e] bg-[#351c1c] px-2.5 py-1 text-[10px] text-[#e6796e]">
                      Low stock · alert at {LOW_STOCK_THRESHOLD}
                    </div>)}

                  <div className="mt-4 grid grid-cols-3 rounded-xl bg-[#0c0d12] px-2 py-3 text-center">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.12em] text-[#8d8d94]">Cost</div>
                      <div className="text-sm text-[#e3ded6]">{currency(cost)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.12em] text-[#8d8d94]">Sell</div>
                      <div className="text-sm text-[#e3ded6]">{currency(selling)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.12em] text-[#8d8d94]">Margin</div>
                      <div className={`text-sm font-medium ${selling - cost >= 0 ? 'text-[#19c875]' : 'text-[#ee665c]'}`}>
                        {currency(selling - cost)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" disabled={stock <= 0} onClick={() => {
                        setSaleProductId(product.id);
                        setSaleOpen(true);
                    }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#d4b039] px-2.5 py-2 text-xs font-semibold text-[#19150a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
                      <ShoppingBag className="h-3.5 w-3.5"/> Sell
                    </button>
                    <button type="button" onClick={() => {
                        setPurchaseProductId(product.id);
                        setPurchaseOpen(true);
                    }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#2c303b] bg-[#1a1b23] px-2.5 py-2 text-xs font-semibold text-[#e5e2dd] transition hover:border-[#d4b063]/60">
                      <Truck className="h-3.5 w-3.5"/> Restock
                    </button>
                    <button type="button" aria-label={`Edit ${product.name}`} onClick={() => startEdit(product)} className="rounded-lg p-2 text-[#b2b0ac] transition hover:bg-white/5 hover:text-[#d4b063]">
                      <Edit3 className="h-4 w-4"/>
                    </button>
                    <button type="button" aria-label={`Delete ${product.name}`} onClick={() => void remove(product)} className="rounded-lg p-2 text-[#888991] transition hover:bg-white/5 hover:text-[#ee665c]">
                      <Trash2 className="h-4 w-4"/>
                    </button>
                  </div>
                </article>);
            })}
          </div>) : (<section className="rounded-2xl border border-[#242833] bg-[#111318] p-4 sm:p-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#252832] text-[11px] text-[#d6d0c7]">
                    <th className="px-2 py-3 font-medium">Product</th>
                    <th className="px-2 py-3 font-medium">Type</th>
                    <th className="px-2 py-3 font-medium">Category</th>
                    <th className="px-2 py-3 text-right font-medium">Cost</th>
                    <th className="px-2 py-3 text-right font-medium">Sell</th>
                    <th className="px-2 py-3 text-right font-medium">Margin</th>
                    <th className="px-2 py-3 text-right font-medium">Stock</th>
                    <th className="px-2 py-3 font-medium">Unit</th>
                    <th className="px-2 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                const stock = Number(product.stock_qty);
                const cost = Number(product.buying_price);
                const selling = Number(product.selling_price);
                const lowStock = stock <= LOW_STOCK_THRESHOLD;
                return (<tr key={product.id} className="border-b border-[#20232b] text-sm last:border-0 hover:bg-white/[0.02]">
                        <td className="px-2 py-3 text-[#eeeae4]">{product.name}</td>
                        <td className="px-2 py-3 text-[#bbb7b1]">{product.type}</td>
                        <td className="px-2 py-3 text-[#bbb7b1]">{product.category || '—'}</td>
                        <td className="whitespace-nowrap px-2 py-3 text-right text-[#c9c4bd]">{currency(cost)}</td>
                        <td className="whitespace-nowrap px-2 py-3 text-right text-[#c9c4bd]">{currency(selling)}</td>
                        <td className={`whitespace-nowrap px-2 py-3 text-right font-medium ${selling - cost >= 0 ? 'text-[#19c875]' : 'text-[#ee665c]'}`}>
                          {currency(selling - cost)}
                        </td>
                        <td className={`px-2 py-3 text-right font-semibold ${lowStock ? 'text-[#ee665c]' : 'text-[#f1eee9]'}`}>{stock}</td>
                        <td className="px-2 py-3 text-[#bbb7b1]">{product.unit}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1">
                            <button type="button" disabled={stock <= 0} onClick={() => {
                        setSaleProductId(product.id);
                        setSaleOpen(true);
                    }} className="rounded p-1.5 text-[#d4b039] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Sell ${product.name}`}>
                              <ShoppingBag className="h-4 w-4"/>
                            </button>
                            <button type="button" onClick={() => {
                        setPurchaseProductId(product.id);
                        setPurchaseOpen(true);
                    }} className="rounded p-1.5 text-[#b2b0ac] transition hover:bg-white/5 hover:text-[#d4b063]" aria-label={`Restock ${product.name}`}>
                              <Truck className="h-4 w-4"/>
                            </button>
                            <button type="button" onClick={() => startEdit(product)} className="rounded p-1.5 text-[#b2b0ac] transition hover:bg-white/5 hover:text-[#d4b063]" aria-label={`Edit ${product.name}`}>
                              <Edit3 className="h-4 w-4"/>
                            </button>
                            <button type="button" onClick={() => void remove(product)} className="rounded p-1.5 text-[#888991] transition hover:bg-white/5 hover:text-[#ee665c]" aria-label={`Delete ${product.name}`}>
                              <Trash2 className="h-4 w-4"/>
                            </button>
                          </div>
                        </td>
                      </tr>);
            })}
                </tbody>
              </table>
            </div>
          </section>)}
      </div>

      {open && (<div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
          <button type="button" aria-label="Close product form" className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)}/>
        <section role="dialog" aria-modal="true" className="relative z-10 my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#28282f] bg-[#121318] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            <h2 className="text-2xl font-semibold text-[#f4efe7]">{editing ? 'Edit product' : 'Add product'}</h2>
            <form onSubmit={save} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClassName}>Name</label>
                  <input className={inputClassName} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required/>
                </div>
                <div>
                  <label className={labelClassName}>Type</label>
                  <select className={inputClassName} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                    {['Attar', 'Perfume', 'Oud Oil', 'Bakhoor', 'Other'].map((type) => <option key={type}>{type}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClassName}>Category / size</label>
                <input className={inputClassName} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}/>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClassName}>Buying price (₹)</label>
                  <input type="number" min="0" step="0.01" className={inputClassName} value={form.buying_price} onChange={(event) => setForm({ ...form, buying_price: event.target.value })} required/>
                </div>
                <div>
                  <label className={labelClassName}>Selling price (₹)</label>
                  <input type="number" min="0" step="0.01" className={inputClassName} value={form.selling_price} onChange={(event) => setForm({ ...form, selling_price: event.target.value })} required/>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClassName}>Stock quantity</label>
                  <input type="number" min="0" step="0.01" className={inputClassName} value={form.stock_qty} onChange={(event) => setForm({ ...form, stock_qty: event.target.value })} required/>
                </div>
                <div>
                  <label className={labelClassName}>Unit</label>
                  <input className={inputClassName} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} required/>
                </div>
              </div>
              {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-[#24252c] pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[#353743] px-4 py-2.5 text-sm text-[#d3cfc9] hover:bg-white/5">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-[#d4b063] px-4 py-2.5 text-sm font-semibold text-[#15120a] hover:brightness-110 disabled:opacity-50">
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
                </button>
              </div>
            </form>
          </section>
        </div>)}

      <SaleDialog open={saleOpen} onClose={() => setSaleOpen(false)} onSaved={load} initialProductId={saleProductId}/>
      <PurchaseDialog open={purchaseOpen} onClose={() => setPurchaseOpen(false)} onSaved={load} initialProductId={purchaseProductId}/>
    </Layout>);
}
