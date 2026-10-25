'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import Layout from '@/components/Layout'
import { usePeriod } from '@/components/PeriodContext'
import { HandCoins, Percent, Trash2, X } from 'lucide-react'

type Partner = {
  id: number
  name: string
  role: string
  share_percent: number
}

type Drawing = {
  id: number
  partner_id: number
  amount: number
  date: string
  note: string | null
  partners: { name: string } | null
}

type SaleProfit = {
  date: string
  qty: number
  total_price: number
  cost_price: number
}

function currency(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function localDateString(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export default function Drawings() {
  const supabase = useMemo(() => createClient(), [])
  const { from: periodFrom, to: periodTo, label: periodName } = usePeriod()
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [sales, setSales] = useState<SaleProfit[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ partner_id: '', amount: '', date: localDateString(new Date()), note: '' })

  const load = useCallback(async () => {
    const [drawingsResult, partnersResult, salesResult] = await Promise.all([
      supabase
        .from('partner_drawings')
        .select('*, partners(name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('partners').select('*').order('id'),
      supabase.from('sales').select('date, qty, total_price, cost_price'),
    ])

    const failed = [drawingsResult.error, partnersResult.error, salesResult.error].find(Boolean)
    if (failed) {
      setError(failed.message)
    } else {
      setDrawings((drawingsResult.data || []) as Drawing[])
      setPartners((partnersResult.data || []) as Partner[])
      setSales((salesResult.data || []) as SaleProfit[])
      setError('')
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const refresh = () => { void load() }
    window.addEventListener('ledger:data-changed', refresh)
    return () => window.removeEventListener('ledger:data-changed', refresh)
  }, [load])

  const lifetimeGrossProfit = sales.reduce(
    (sum, sale) => sum + Number(sale.total_price) - Number(sale.cost_price || 0) * Number(sale.qty),
    0,
  )
  const periodGrossProfit = sales
    .filter((sale) => sale.date >= periodFrom && sale.date <= periodTo)
    .reduce(
      (sum, sale) => sum + Number(sale.total_price) - Number(sale.cost_price || 0) * Number(sale.qty),
      0,
    )
  const periodLabel = `${new Date(`${periodFrom}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(`${periodTo}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`

  const partnerSummaries = partners.map((partner, index) => {
    const lifetimeEarned = lifetimeGrossProfit * Number(partner.share_percent) / 100
    const periodShare = periodGrossProfit * Number(partner.share_percent) / 100
    const paidOut = drawings
      .filter((drawing) => drawing.partner_id === partner.id)
      .reduce((sum, drawing) => sum + Number(drawing.amount), 0)
    return {
      ...partner,
      color: index % 2 === 0 ? '#d4b063' : '#d8618e',
      initials: partner.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      lifetimeEarned,
      periodShare,
      paidOut,
      balanceDue: lifetimeEarned - paidOut,
    }
  })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const { error: saveError } = await supabase.from('partner_drawings').insert([{
      partner_id: Number(form.partner_id),
      amount: Number(form.amount),
      date: form.date,
      note: form.note.trim() || null,
    }])
    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }
    setOpen(false)
    setForm({ partner_id: '', amount: '', date: localDateString(new Date()), note: '' })
    setSaving(false)
    await load()
  }

  async function removeDrawing(drawing: Drawing) {
    if (!confirm(`Delete this payout of ${currency(Number(drawing.amount))}?`)) return
    const { error: deleteError } = await supabase.from('partner_drawings').delete().eq('id', drawing.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await load()
  }

  if (loading) {
    return <Layout><div className="py-20 text-center text-[#aeb8c6]">Loading partner shares…</div></Layout>
  }

  const inputClassName =
    'w-full rounded-xl border border-[#2b3040] bg-[#1a1b24] px-3.5 py-3 text-sm text-[#f4f0ea] outline-none focus:border-[#d4b063]/70'

  return (
    <Layout>
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-[#d4b063]">Partnership</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#f4f0ea]">Partners&apos; profit share</h1>
            <p className="mt-1 text-sm text-[#aeb8c6]">
              Gross profit (sales − cost of goods) is split by share %. Expenses are kept separate. Period: {periodName} ({periodLabel}).
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm({ partner_id: partners[0] ? String(partners[0].id) : '', amount: '', date: localDateString(new Date()), note: '' })
              setOpen(true)
            }}
            disabled={partners.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d4b063] px-4 py-2.5 text-sm font-semibold text-[#101018] transition hover:brightness-110 disabled:opacity-50"
          >
            <HandCoins className="h-4 w-4" /> Record payout
          </button>
        </div>

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#59471f] bg-[#211b10] px-5 py-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#c7ad6b]">Profit pool · selected period</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-[#f4ead0]">{currency(periodGrossProfit)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#c7ad6b]">Lifetime gross profit</div>
            <div className="mt-1 text-lg font-semibold text-[#f4ead0]">{currency(lifetimeGrossProfit)}</div>
          </div>
        </div>

        {partners.length === 0 ? (
          <div className="rounded-2xl border border-[#242833] bg-[#111318] p-6 text-sm text-[#aeb8c6]">
            No partners have been set up yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {partnerSummaries.map((partner) => (
              <article key={partner.id} className="rounded-2xl border border-[#242833] bg-[#15161f] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full border text-xs font-semibold"
                      style={{ borderColor: `${partner.color}55`, color: partner.color, backgroundColor: `${partner.color}12` }}
                    >
                      {partner.initials}
                    </div>
                    <div>
                      <h2 className="font-serif text-lg text-[#f2eee7]">{partner.name}</h2>
                      <p className="text-xs text-[#9e9ba0]">{partner.role}</p>
                    </div>
                  </div>
                  <span
                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{ borderColor: `${partner.color}55`, color: partner.color }}
                  >
                    {partner.share_percent}%
                  </span>
                </div>

                <div className="mt-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#aaa69f]">Share for period</div>
                  <div className="mt-1 text-4xl font-semibold tracking-tight text-[#f3efe9]">{currency(partner.periodShare)}</div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-[#0d0e13] p-3">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.1em] text-[#8f8d91]">Lifetime earned</div>
                    <div className="mt-1 text-sm text-[#e1dcd5]">{currency(partner.lifetimeEarned)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.1em] text-[#8f8d91]">Paid out</div>
                    <div className="mt-1 text-sm text-[#e1dcd5]">{currency(partner.paidOut)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.1em] text-[#8f8d91]">Balance due</div>
                    <div className={`mt-1 text-sm font-semibold ${partner.balanceDue >= 0 ? 'text-[#19c875]' : 'text-[#ee665c]'}`}>
                      {currency(Math.abs(partner.balanceDue))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.75fr]">
          <section className="rounded-2xl border border-[#242833] bg-[#111318] p-5">
            <h2 className="mb-4 flex items-center gap-2 font-serif text-xl text-[#f2eee7]">
              <Percent className="h-4 w-4 text-[#d4b063]" /> Share ratio
            </h2>
            <div className="space-y-3">
              {partnerSummaries.map((partner) => (
                <div key={partner.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#242833] bg-[#171820] px-3 py-2.5">
                  <span className="truncate text-sm text-[#ded9d1]">{partner.name}</span>
                  <span className="rounded-lg border border-[#2c2e39] bg-[#1c1d26] px-4 py-1.5 text-sm font-semibold text-[#e6e0d8]">
                    {partner.share_percent}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#242833] bg-[#111318] p-4 sm:p-5">
            <h2 className="mb-2 font-serif text-xl text-[#f2eee7]">Payout history</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#252832] text-[11px] text-[#d6d0c7]">
                    <th className="px-2 py-3 font-medium">Date</th>
                    <th className="px-2 py-3 font-medium">Partner</th>
                    <th className="px-2 py-3 font-medium">Note</th>
                    <th className="px-2 py-3 text-right font-medium">Amount</th>
                    <th className="w-9 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {drawings.filter((drawing) => drawing.date >= periodFrom && drawing.date <= periodTo).map((drawing) => (
                    <tr key={drawing.id} className="border-b border-[#20232b] text-sm last:border-0 hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-2 py-3 font-mono text-xs text-[#a4a3a0]">{formatDate(drawing.date)}</td>
                      <td className="px-2 py-3 text-[#e1dcd5]">{drawing.partners?.name || 'Partner'}</td>
                      <td className="px-2 py-3 text-[#aaa69f]">{drawing.note || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right font-medium text-[#eae5de]">{currency(Number(drawing.amount))}</td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Delete payout"
                          onClick={() => void removeDrawing(drawing)}
                          className="rounded p-1 text-[#8c8c92] transition hover:bg-white/5 hover:text-[#ee665c]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {drawings.filter((drawing) => drawing.date >= periodFrom && drawing.date <= periodTo).length === 0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-[#9ca9bc]">No payouts recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
          <button
            type="button"
            aria-label="Close payout form"
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <section role="dialog" aria-modal="true" aria-labelledby="payout-dialog-title" className="relative z-10 my-auto w-full max-w-lg rounded-2xl border border-[#28282f] bg-[#121318] p-6 shadow-2xl">
            <button
              type="button"
              aria-label="Close payout form"
              onClick={() => setOpen(false)}
              className="absolute right-5 top-5 rounded-md p-1 text-[#d7d2ca] hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="payout-dialog-title" className="pr-8 text-2xl font-semibold text-[#f4efe7]">Record partner payout</h2>
            <p className="mt-2 text-sm text-[#a9a39a]">Record money paid out to a partner.</p>
            <form onSubmit={save} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-[#c9c1b6]" htmlFor="payout-partner">Partner</label>
                <select
                  id="payout-partner"
                  className={inputClassName}
                  value={form.partner_id}
                  onChange={(event) => setForm({ ...form, partner_id: event.target.value })}
                  required
                >
                  {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name} ({partner.role})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#c9c1b6]" htmlFor="payout-amount">Amount (₹)</label>
                  <input
                    id="payout-amount"
                    className={inputClassName}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => setForm({ ...form, amount: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#c9c1b6]" htmlFor="payout-date">Date</label>
                  <input
                    id="payout-date"
                    className={inputClassName}
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-[#c9c1b6]" htmlFor="payout-note">Note</label>
                <input
                  id="payout-note"
                  className={inputClassName}
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-[#24252c] pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[#353743] px-4 py-2.5 text-sm text-[#d3cfc9] hover:bg-white/5">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-[#d4b063] px-4 py-2.5 text-sm font-semibold text-[#15120a] hover:brightness-110 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save payout'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Layout>
  )
}
