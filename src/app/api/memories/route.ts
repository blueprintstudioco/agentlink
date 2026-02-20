import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

const MEMORY_DIR = process.env.MEMORY_DIR || '/Users/bubo/clawd/memory';
const MAIN_MEMORY = process.env.MAIN_MEMORY || '/Users/bubo/clawd/MEMORY.md';

interface MemoryFile {
  filename: string;
  content: string;
  preview: string;
  lastModified: string;
  size: number;
  isMainMemory: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.toLowerCase() || '';
    const filename = searchParams.get('file');

    // If requesting a specific file
    if (filename) {
      const filePath = filename === 'MEMORY.md' 
        ? MAIN_MEMORY 
        : join(MEMORY_DIR, filename);
      
      try {
        const content = await readFile(filePath, 'utf-8');
        const stats = await stat(filePath);
        
        return NextResponse.json({
          filename: filename === 'MEMORY.md' ? 'MEMORY.md' : filename,
          content,
          preview: content.slice(0, 200),
          lastModified: stats.mtime.toISOString(),
          size: stats.size,
          isMainMemory: filename === 'MEMORY.md',
        });
      } catch {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    }

    const memories: MemoryFile[] = [];

    // Read main MEMORY.md first (pinned)
    try {
      const mainContent = await readFile(MAIN_MEMORY, 'utf-8');
      const mainStats = await stat(MAIN_MEMORY);
      
      if (!search || mainContent.toLowerCase().includes(search) || 'memory.md'.includes(search)) {
        memories.push({
          filename: 'MEMORY.md',
          content: mainContent,
          preview: mainContent.slice(0, 150).replace(/\n/g, ' ').trim() + '...',
          lastModified: mainStats.mtime.toISOString(),
          size: mainStats.size,
          isMainMemory: true,
        });
      }
    } catch (e) {
      console.error('Could not read MEMORY.md:', e);
    }

    // Read daily memory files
    try {
      const files = await readdir(MEMORY_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md')).sort().reverse();

      for (const file of mdFiles) {
        const filePath = join(MEMORY_DIR, file);
        try {
          const content = await readFile(filePath, 'utf-8');
          const stats = await stat(filePath);

          // Apply search filter
          if (search && !content.toLowerCase().includes(search) && !file.toLowerCase().includes(search)) {
            continue;
          }

          memories.push({
            filename: file,
            content,
            preview: content.slice(0, 150).replace(/\n/g, ' ').trim() + (content.length > 150 ? '...' : ''),
            lastModified: stats.mtime.toISOString(),
            size: stats.size,
            isMainMemory: false,
          });
        } catch (e) {
          console.error(`Could not read ${file}:`, e);
        }
      }
    } catch (e) {
      console.error('Could not read memory directory:', e);
    }

    return NextResponse.json({ memories, total: memories.length });
  } catch (error) {
    console.error('Memory API error:', error);
    return NextResponse.json({ error: 'Failed to read memories' }, { status: 500 });
  }
}
