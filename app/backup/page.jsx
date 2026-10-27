'use client';
import { useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { Database, Download, Upload, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

const TABLES = ['partners', 'products', 'purchases', 'sales', 'expenses', 'partner_drawings'];
const DELETE_ORDER = ['partner_drawings', 'sales', 'purchases', 'expenses', 'products', 'partners'];
const INSERT_ORDER = ['partners', 'products', 'purchases', 'sales', 'expenses', 'partner_drawings'];

async function fetchAll(supabase, table) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function validateBackup(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid backup file');
  if (!parsed.tables || typeof parsed.tables !== 'object') throw new Error('Backup is missing table data');
  for (const table of TABLES) {
    if (!Array.isArray(parsed.tables[table])) {
      throw new Error('Backup is missing or invalid data for ' + table);
    }
  }
}

export default function BackupPage() {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [counts, setCounts] = useState(null);

  async function handleBackup() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const supabase = createClient();
      const tables = {};
      for (const table of TABLES) {
        tables[table] = await fetchAll(supabase, table);
      }
      const payload = {
        version: 1,
        exported_at: new Date().toISOString(),
        tables,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = 'attar-backup-' + date + '.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setCounts(Object.fromEntries(TABLES.map((table) => [table, tables[table].length])));
      setMessage('Backup downloaded successfully.');
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : 'Backup failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
      validateBackup(parsed);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Could not read backup file');
      return;
    }
    const confirmed = window.confirm(
      'Restore will replace ALL current shop data with the backup. This cannot be undone. Continue?'
    );
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const supabase = createClient();
      for (const table of DELETE_ORDER) {
        const { error: deleteError } = await supabase.from(table).delete().gt('id', 0);
        if (deleteError) throw deleteError;
      }
      for (const table of INSERT_ORDER) {
        const rows = parsed.tables[table] || [];
        if (rows.length === 0) continue;
        const { error: insertError } = await supabase.from(table).insert(rows);
        if (insertError) throw insertError;
      }
      setCounts(Object.fromEntries(TABLES.map((table) => [table, (parsed.tables[table] || []).length])));
      setMessage('Data restored successfully. Refresh pages to see the restored records.');
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-[#d4b063]">Data Safety</div>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl tracking-[-0.05em] text-[#f4f0ea]">Backup & Restore</h1>
            <p className="mt-1 text-sm text-[#aeb8c6]">
              Download a JSON backup of all shop data, or restore the shop from a previously downloaded backup.
            </p>
          </div>
          <Database className="h-8 w-8 text-[#d4b063]" />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-[#222936] bg-[#111318] p-6">
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#f2eee7]">
              <Download className="h-5 w-5 text-[#d4b063]" /> Create Backup
            </div>
            <p className="mb-5 text-sm text-[#aeb8c6]">
              Exports partners, products, purchases, sales, expenses, and partner drawings to a JSON file.
            </p>
            <button
              type="button"
              onClick={handleBackup}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#d4b063] px-4 py-2.5 text-sm font-semibold text-[#101018] transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Backup
            </button>
          </section>

          <section className="rounded-2xl border border-[#222936] bg-[#111318] p-6">
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#f2eee7]">
              <Upload className="h-5 w-5 text-[#d4b063]" /> Restore Backup
            </div>
            <p className="mb-5 text-sm text-[#aeb8c6]">
              Replaces all current data with the selected backup file. Existing records are deleted first.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleRestore}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-[#2a3446] bg-[#0b1624] px-4 py-2.5 text-sm font-semibold text-[#ecf4ff] transition hover:border-[#d4b063]/40 hover:text-white disabled:opacity-50"
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Choose Backup File
            </button>
          </section>
        </div>

        {counts && (
          <section className="rounded-2xl border border-[#222936] bg-[#111318] p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#bfa76d]">Last Operation Counts</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TABLES.map((table) => (
                <div key={table} className="rounded-xl border border-[#1d2a39] bg-[#0d1b2d] px-3 py-2.5">
                  <div className="text-xs text-[#8e99ad]">{table}</div>
                  <div className="text-lg font-semibold text-[#f3efe8]">{counts[table] ?? 0}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
