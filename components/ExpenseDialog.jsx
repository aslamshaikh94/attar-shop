'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
const EXPENSE_CATEGORIES = [
    'Shop Rent',
    'Packaging',
    'Staff Salary',
    'Utilities',
    'Transport',
    'Marketing',
    'Other',
];
function localDate() {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}
export default function ExpenseDialog({ open, onClose, onSaved }) {
    const [category, setCategory] = useState('Shop Rent');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(localDate);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
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
        setCategory('Shop Rent');
        setAmount('');
        setDate(localDate());
        setNote('');
        setError('');
        onClose();
    }
    async function saveExpense(event) {
        event.preventDefault();
        setError('');
        setSaving(true);
        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: category,
                    category,
                    amount: Number(amount),
                    date,
                    note,
                }),
            });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error || 'Failed to save expense');
            resetAndClose();
            onSaved?.();
            window.dispatchEvent(new Event('ledger:data-changed'));
        }
        catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save expense');
        }
        finally {
            setSaving(false);
        }
    }
    if (!open)
        return null;
    const inputClassName = 'h-12 w-full rounded-xl border border-[#2b3040] bg-[#1a1b24] px-3.5 text-base text-[#f4f0ea] outline-none transition placeholder:text-[#96939a] focus:border-[#d4b063]/70';
    const labelClassName = 'mb-2 block text-sm font-medium text-[#c9c1b6]';
    return (<div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-3 sm:p-6">
      <button type="button" aria-label="Close expense form" className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={resetAndClose}/>
      <section role="dialog" aria-modal="true" aria-labelledby="expense-dialog-title" className="relative z-10 my-auto w-full max-w-[805px] overflow-hidden rounded-[26px] border border-[#28282f] bg-[#121318] shadow-2xl">
        <div className="p-6 sm:p-7">
          <button type="button" aria-label="Close expense form" onClick={resetAndClose} className="absolute right-6 top-6 rounded-md p-1 text-[#d7d2ca] transition hover:bg-white/10 hover:text-white">
            <X className="h-6 w-6"/>
          </button>

          <h2 id="expense-dialog-title" className="pr-12 text-3xl font-semibold tracking-tight text-[#f4efe7] sm:text-4xl">
            Add an expense
          </h2>
          <p className="mt-3 text-base text-[#a9a39a] sm:text-lg">
            Tracked separately — not deducted from partners&apos; profit share.
          </p>

          <form onSubmit={saveExpense} className="mt-7 space-y-6">
            <div>
              <label className={labelClassName} htmlFor="expense-category">Category</label>
              <select id="expense-category" className={inputClassName} value={category} onChange={(event) => setCategory(event.target.value)} required>
                {EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="expense-amount">Amount (₹)</label>
                <input id="expense-amount" className={inputClassName} type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required/>
              </div>
              <div>
                <label className={labelClassName} htmlFor="expense-date">Date</label>
                <input id="expense-date" className={inputClassName} type="date" value={date} onChange={(event) => setDate(event.target.value)} required/>
              </div>
            </div>

            <div>
              <label className={labelClassName} htmlFor="expense-note">Note</label>
              <input id="expense-note" className={inputClassName} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional"/>
            </div>

            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

            <div className="-mx-6 -mb-6 flex justify-end border-t border-[#24252c] px-6 py-5 sm:-mx-7 sm:-mb-7 sm:px-7">
              <button type="submit" disabled={saving} className="rounded-xl bg-[#d4b063] px-5 py-3 text-base font-semibold text-[#15120a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? 'Saving…' : 'Save expense'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>);
}
