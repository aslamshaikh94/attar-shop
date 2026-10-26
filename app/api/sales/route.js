import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('sales')
        .select('*, products(name, unit)')
        .order('date', { ascending: false });
    if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
export async function POST(req) {
    const supabase = createClient();
    const body = await req.json();
    const { data, error } = await supabase.rpc('record_sale_with_details', {
        p_product_id: body.product_id,
        p_qty: body.qty,
        p_unit_price: body.unit_price,
        p_total_price: body.total_price,
        p_customer: body.customer,
        p_date: body.date,
        p_payment_method: body.payment_method,
        p_note: body.note,
    });
    if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: data });
}
export async function DELETE(req) {
    const saleId = Number(new URL(req.url).searchParams.get('id'));
    if (!Number.isSafeInteger(saleId) || saleId <= 0) {
        return NextResponse.json({ error: 'A valid sale id is required' }, { status: 400 });
    }
    const supabase = createClient();
    const { error } = await supabase.rpc('delete_recorded_sale', { p_sale_id: saleId });
    if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}
