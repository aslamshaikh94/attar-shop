import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET(req) {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || '1900-01-01';
    const to = searchParams.get('to') || '2100-12-31';
    const { data: summary, error: e1 } = await supabase.rpc('report_summary', { p_from: from, p_to: to });
    if (e1)
        return NextResponse.json({ error: e1.message }, { status: 500 });
    const s = summary?.[0] || {};
    const totalSales = Number(s.total_sales || 0);
    const totalPurchases = Number(s.total_purchases || 0);
    const totalExpenses = Number(s.total_expenses || 0);
    const grossProfit = Number(s.gross_profit || 0);
    const netProfit = Number(s.net_profit || 0);
    const { data: partners } = await supabase.from('partners').select('*').order('id');
    const { data: drawings } = await supabase.from('partner_drawings').select('partner_id, amount');
    const drawingsMap = {};
    drawings?.forEach((d) => { drawingsMap[d.partner_id] = (drawingsMap[d.partner_id] || 0) + Number(d.amount); });
    const partnerShares = (partners || []).map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        share_percent: Number(p.share_percent),
        share_amount: Math.round((netProfit * Number(p.share_percent)) / 100 * 100) / 100,
        drawings: drawingsMap[p.id] || 0,
        due: Math.round((netProfit * Number(p.share_percent)) / 100 * 100) / 100 - (drawingsMap[p.id] || 0),
    }));
    const { data: movement } = await supabase.rpc('product_movement');
    return NextResponse.json({
        period: { from, to },
        totalSales,
        totalPurchases,
        totalExpenses,
        grossProfit,
        netProfit,
        partners: partnerShares,
        movement: movement || [],
    });
}
