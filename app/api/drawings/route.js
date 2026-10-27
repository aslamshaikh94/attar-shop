import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('partner_drawings')
        .select('*, partners(name)')
        .order('date', { ascending: false });
    if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
export async function POST(req) {
    const supabase = await createClient();
    const body = await req.json();
    const { data, error } = await supabase.from('partner_drawings').insert([body]).select().single();
    if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
}
