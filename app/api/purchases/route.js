import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
    const supabase = createClient();
    const { data: purchases, error: e2 } = await supabase
        .from('purchases')
        .select('*, products(name, unit)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
    if (e2)
        return NextResponse.json({ error: e2.message }, { status: 500 });
    return NextResponse.json(purchases);
}
export async function POST(req) {
    const supabase = createClient();
    const body = await req.json();
    const { data, error } = await supabase.rpc('record_purchase_with_details', {
        p_product_id: body.product_id,
        p_qty: body.qty,
        p_unit_price: body.unit_price,
        p_total_price: body.total_price,
        p_supplier: body.supplier,
        p_date: body.date,
        p_note: body.note,
        p_update_buying_price: body.update_buying_price,
    });
    if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: data });
}
export async function DELETE(req) {
    const purchaseId = Number(new URL(req.url).searchParams.get('id'));
    if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) {
        return NextResponse.json({ error: 'A valid purchase id is required' }, { status: 400 });
    }
    const supabase = createClient();
    const { error } = await supabase.rpc('delete_recorded_purchase', { p_purchase_id: purchaseId });
    if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}
