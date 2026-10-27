import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function PUT(req, { params }) {
    const { id } = await params;
    const supabase = await createClient();
    const body = await req.json();
    const { error } = await supabase.from('products').update(body).eq('id', Number(id));
    if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}
export async function DELETE(req, { params }) {
    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase.from('products').delete().eq('id', Number(id));
    if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}
