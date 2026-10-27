'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
function localDate() {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}
export default function SaleDialog({ open, onClose, onSaved, initialProductId }) {
    const [products, setProducts] = useState([]);
    const [productId, setProductId] = useState('');
    const [qty, setQty] = useState('1');
    const [unitPrice, setUnitPrice] = useState('');
    const [customer, setCustomer] = useState('Walk-in');
    const [payment, setPayment] = useState('Cash');
    const [date, setDate] = useState(localDate);
    const [note, setNote] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const selectedProduct = products.find((product) => String(product.id) === productId);
    const quantity = Number(qty) || 0;
    const price = Number(unitPrice) || 0;
    const total = quantity * price;
    const profit = quantity * (price - (Number(selectedProduct?.buying_price) || 0));
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
                        setUnitPrice(product ? String(product.selling_price) : '');
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
        setQty('1');
        setUnitPrice('');
        setCustomer('Walk-in');
        setPayment('Cash');
        setDate(localDate());
        setNote('');
        setError('');
        onClose();
    }
    async function saveSale(event) {
        event.preventDefault();
        setError('');
        setSaving(true);
        try {
            const response = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: Number(productId),
                    qty: quantity,
                    unit_price: price,
                    total_price: total,
                    customer,
                    date,
                    payment_method: payment,
                    note,
                }),
            });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error || 'Failed to record sale');
            resetAndClose();
            onSaved?.();
            window.dispatchEvent(new Event('ledger:data-changed'));
        }
        catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to record sale');
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
      <button type="button" aria-label="Close sale form" className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={resetAndClose}/>
      <section role="dialog" aria-modal="true" aria-labelledby="sale-dialog-title" className="relative z-10 my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-[710px] overflow-y-auto rounded-[22px] border border-[#28282f] bg-[#121318] shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="p-5 sm:p-6">
          <button type="button" aria-label="Close sale form" onClick={resetAndClose} className="absolute right-5 top-5 rounded-md p-1 text-[#d7d2ca] transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5"/>
          </button>

          <h2 id="sale-dialog-title" className="pr-10 text-3xl font-semibold tracking-tight text-[#f4efe7]">
            Record a sale
          </h2>
          <p className="mt-2 text-base text-[#a9a39a]">
            Stock reduces automatically. Profit = (price − cost) × qty.
          </p>

          <form onSubmit={saveSale} className="mt-6 space-y-5">
            <div>
              <label className={labelClassName} htmlFor="sale-product">Fragrance</label>
              <select id="sale-product" className={inputClassName} value={productId} onChange={(event) => {
            const product = products.find((item) => String(item.id) === event.target.value);
            setProductId(event.target.value);
            setUnitPrice(product ? String(product.selling_price) : '');
        }} required disabled={loadingProducts}>
                <option value="">{loadingProducts ? 'Loading products…' : 'Choose a product'}</option>
                {products.map((product) => (<option key={product.id} value={product.id}>
                    {product.name} — {Number(product.stock_qty)} {product.unit} in stock
                  </option>))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="sale-quantity">Quantity</label>
                <input id="sale-quantity" className={inputClassName} type="number" min="0.01" step="0.01" value={qty} onChange={(event) => setQty(event.target.value)} required/>
              </div>
              <div>
                <label className={labelClassName} htmlFor="sale-price">Price per unit (₹)</label>
                <input id="sale-price" className={inputClassName} type="number" min="0.01" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required/>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="sale-customer">Customer</label>
                <input id="sale-customer" className={inputClassName} value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Walk-in"/>
              </div>
              <div>
                <label className={labelClassName} htmlFor="sale-payment">Payment</label>
                <select id="sale-payment" className={inputClassName} value={payment} onChange={(event) => setPayment(event.target.value)}>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank transfer</option>
                  <option>Credit</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="sale-date">Date</label>
                <input id="sale-date" className={inputClassName} type="date" value={date} onChange={(event) => setDate(event.target.value)} required/>
              </div>
              <div>
                <label className={labelClassName} htmlFor="sale-note">Note</label>
                <input id="sale-note" className={inputClassName} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional"/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-[20px] border border-[#5a4720] bg-[#211b10] px-5 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#d4b66f]">Total</div>
                <div className="mt-2 text-2xl font-semibold text-[#f5ead0]">₹{total.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#d4b66f]">Profit</div>
                <div className={`mt-2 text-2xl font-semibold ${profit >= 0 ? 'text-[#1ed579]' : 'text-[#f07878]'}`}>
                  ₹{profit.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

            <div className="-mx-5 -mb-5 flex justify-end border-t border-[#24252c] px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
              <button type="submit" disabled={saving || loadingProducts || products.length === 0} className="rounded-xl bg-[#d4b063] px-5 py-3 text-sm font-semibold text-[#15120a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? 'Saving…' : 'Save sale'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>);
}
