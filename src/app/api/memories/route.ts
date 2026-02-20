import { NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

const MEMORY_DIR = process.env.MEMORY_DIR || '/Users/bubo/clawd/memory';
const MEMORY_FILE = process.env.MEMORY_FILE || '/Users/bubo/clawd/MEMORY.md';

interface MemoryFile {
  filename: string;
  content: string;
  preview: string;
  lastModified: string;
}

export async function GET() {
  try {
    const memories: MemoryFile[] = [];

    // Read MEMORY.md first (main memory file)
    try {
      const mainContent = await readFile(MEMORY_FILE, 'utf-8');
      const mainStat = await stat(MEMORY_FILE);
      memories.push({
        filename: 'MEMORY.md',
        content: mainContent,
        preview: mainContent.slice(0, 100).replace(/\n/g, ' ') + '...',
        lastModified: mainStat.mtime.toLocaleDateString(),
      });
    } catch (e) {
      console.error('Failed to read MEMORY.md:', e);
    }

    // Read daily memory files
    try {
      const files = await readdir(MEMORY_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md')).sort().reverse();
      
      for (const file of mdFiles.slice(0, 30)) { // Limit to last 30 files
        try {
          const filePath = join(MEMORY_DIR, file);
          const content = await readFile(filePath, 'utf-8');
          const fileStat = await stat(filePath);
          
          memories.push({
            filename: file,
            content,
            preview: content.slice(0, 100).replace(/\n/g, ' ') + '...',
            lastModified: fileStat.mtime.toLocaleDateString(),
          });
        } catch (e) {
          console.error(`Failed to read ${file}:`, e);
        }
      }
    } catch (e) {
      console.error('Failed to read memory directory:', e);
    }

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Memory API error:', error);
    return NextResponse.json({ error: 'Failed to load memories', memories: [] }, { status: 500 });
  }
}
