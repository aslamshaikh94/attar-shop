'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
function localDate() {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}
export default function PurchaseDialog({ open, onClose, onSaved, initialProductId }) {
    const [products, setProducts] = useState([]);
    const [productId, setProductId] = useState('');
    const [qty, setQty] = useState('10');
    const [unitPrice, setUnitPrice] = useState('');
    const [supplier, setSupplier] = useState('');
    const [date, setDate] = useState(localDate);
    const [note, setNote] = useState('');
    const [updateCost, setUpdateCost] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const total = (Number(qty) || 0) * (Number(unitPrice) || 0);
    useEffect(() => {
        if (!open)
            return;
        let cancelled = false;
        async function loadProducts() {
            setLoadingProducts(true);
            setError('');
            try {
                const response = await fetch('/api/products');
                const data = await response.json();
                if (!response.ok)
                    throw new Error(data.error || 'Unable to load products');
                if (!cancelled) {
                    const loadedProducts = data;
                    setProducts(loadedProducts);
                    if (initialProductId !== undefined) {
                        const product = loadedProducts.find((item) => String(item.id) === String(initialProductId));
                        setProductId(product ? String(product.id) : '');
                        setUnitPrice(product ? String(product.buying_price) : '');
                    }
                }
            }
            catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'Unable to load products');
                }
            }
            finally {
                if (!cancelled)
                    setLoadingProducts(false);
            }
        }
        void loadProducts();
        return () => {
            cancelled = true;
        };
    }, [open, initialProductId]);
    useEffect(() => {
        if (!open)
            return;
        function handleKeyDown(event) {
            if (event.key === 'Escape' && !saving)
                onClose();
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose, saving]);
    function resetAndClose() {
        setProductId('');
        setQty('10');
        setUnitPrice('');
        setSupplier('');
        setDate(localDate());
        setNote('');
        setUpdateCost(true);
        setError('');
        onClose();
    }
    async function savePurchase(event) {
        event.preventDefault();
        setError('');
        setSaving(true);
        try {
            const response = await fetch('/api/purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: Number(productId),
                    qty: Number(qty),
                    unit_price: Number(unitPrice),
                    total_price: total,
                    supplier,
                    date,
                    note,
                    update_buying_price: updateCost,
                }),
            });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error || 'Failed to record purchase');
            resetAndClose();
            onSaved?.();
            window.dispatchEvent(new Event('ledger:data-changed'));
        }
        catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to record purchase');
        }
        finally {
            setSaving(false);
        }
    }
    if (!open)
        return null;
    const inputClassName = 'h-12 w-full rounded-xl border border-[#2b3040] bg-[#1a1b24] px-3.5 text-base text-[#f4f0ea] outline-none transition placeholder:text-[#96939a] focus:border-[#d4b063]/70';
    const labelClassName = 'mb-2 block text-sm font-medium text-[#c9c1b6]';
    return (<div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6">
      <button type="button" aria-label="Close purchase form" className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={resetAndClose}/>
      <section role="dialog" aria-modal="true" aria-labelledby="purchase-dialog-title" className="relative z-10 my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-[710px] overflow-y-auto rounded-[22px] border border-[#28282f] bg-[#121318] shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="p-5 sm:p-6">
          <button type="button" aria-label="Close purchase form" onClick={resetAndClose} className="absolute right-5 top-5 rounded-md p-1 text-[#d7d2ca] transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5"/>
          </button>

          <h2 id="purchase-dialog-title" className="pr-10 text-3xl font-semibold tracking-tight text-[#f4efe7]">
            Record a purchase
          </h2>
          <p className="mt-2 text-base text-[#a9a39a]">
            Stock increases automatically for the selected product.
          </p>

          <form onSubmit={savePurchase} className="mt-6 space-y-5">
            <div>
              <label className={labelClassName} htmlFor="purchase-product">Product</label>
              <select id="purchase-product" className={inputClassName} value={productId} onChange={(event) => {
            const product = products.find((item) => String(item.id) === event.target.value);
            setProductId(event.target.value);
            setUnitPrice(product ? String(product.buying_price) : '');
        }} required disabled={loadingProducts}>
                <option value="">{loadingProducts ? 'Loading products…' : 'Choose a product'}</option>
                {products.map((product) => (<option key={product.id} value={product.id}>
                    {product.name} — {Number(product.stock_qty)} {product.unit} in stock
                  </option>))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="purchase-quantity">Quantity</label>
                <input id="purchase-quantity" className={inputClassName} type="number" min="0.01" step="0.01" value={qty} onChange={(event) => setQty(event.target.value)} required/>
              </div>
              <div>
                <label className={labelClassName} htmlFor="purchase-cost">Cost per unit (₹)</label>
                <input id="purchase-cost" className={inputClassName} type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required/>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="purchase-supplier">Supplier</label>
                <input id="purchase-supplier" className={inputClassName} value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="e.g. Kannauj Attar House"/>
              </div>
              <div>
                <label className={labelClassName} htmlFor="purchase-date">Date</label>
                <input id="purchase-date" className={inputClassName} type="date" value={date} onChange={(event) => setDate(event.target.value)} required/>
              </div>
            </div>

            <div>
              <label className={labelClassName} htmlFor="purchase-note">Note</label>
              <input id="purchase-note" className={inputClassName} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Invoice no. / remarks"/>
            </div>

            <label className="flex cursor-pointer items-center gap-3 text-base text-[#c9c1b6]">
              <input type="checkbox" checked={updateCost} onChange={(event) => setUpdateCost(event.target.checked)} className="h-5 w-5 accent-[#d4b063]"/>
              Update product cost price to this purchase cost
            </label>

            <div className="flex items-center justify-between rounded-[20px] border border-[#5a4720] bg-[#211b10] px-5 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#d4b66f]">Purchase total</div>
              <div className="text-2xl font-semibold text-[#f5ead0]">₹{total.toLocaleString('en-IN')}</div>
            </div>

            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

            <div className="-mx-5 -mb-5 flex justify-end border-t border-[#24252c] px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
              <button type="submit" disabled={saving || loadingProducts || products.length === 0} className="rounded-xl bg-[#d4b063] px-5 py-3 text-sm font-semibold text-[#15120a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? 'Saving…' : 'Save purchase'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>);
}
