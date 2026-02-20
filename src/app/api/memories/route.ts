import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = '9452a23f-a139-42cd-83e4-732f188a07ff';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.toLowerCase() || '';
  const filename = request.nextUrl.searchParams.get('file');

  try {
    // If requesting a specific file
    if (filename) {
      const { data, error } = await supabase
        .from('mc_memories')
        .select('*')
        .eq('user_id', USER_ID)
        .eq('filename', filename)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      return NextResponse.json({
        filename: data.filename,
        content: data.content,
        preview: data.content.slice(0, 200),
        lastModified: data.updated_at,
        isMainMemory: data.is_main_memory,
      });
    }

    // Get all memories
    let query = supabase
      .from('mc_memories')
      .select('*')
      .eq('user_id', USER_ID)
      .order('is_main_memory', { ascending: false })
      .order('filename', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let memories = (data || []).map(m => ({
      filename: m.filename,
      content: m.content,
      preview: m.content.slice(0, 150).replace(/\n/g, ' ').trim() + '...',
      lastModified: m.updated_at,
      isMainMemory: m.is_main_memory,
    }));

    // Apply search filter
    if (search) {
      memories = memories.filter(m => 
        m.filename.toLowerCase().includes(search) || 
        m.content.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ memories, total: memories.length });
  } catch (error) {
    console.error('Memory API error:', error);
    return NextResponse.json({ error: 'Failed to read memories' }, { status: 500 });
  }
}
