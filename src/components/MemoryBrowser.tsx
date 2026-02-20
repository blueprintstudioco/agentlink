'use client';

import { useState, useEffect, useCallback } from 'react';

interface MemoryFile {
  filename: string;
  content: string;
  preview: string;
  lastModified: string;
  size: number;
  isMainMemory: boolean;
}

export default function MemoryBrowser() {
  const [memories, setMemories] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMemory, setSelectedMemory] = useState<MemoryFile | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      
      const res = await fetch(`/api/memories?${params}`);
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (e) {
      console.error('Failed to load memories:', e);
    }
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const loadFullContent = async (filename: string) => {
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/memories?file=${encodeURIComponent(filename)}`);
      const data = await res.json();
      setSelectedMemory(data);
    } catch (e) {
      console.error('Failed to load memory content:', e);
    }
    setLoadingContent(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Simple markdown-ish rendering
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-3">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-semibold text-white mt-5 mb-2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-semibold text-gray-200 mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={i} className="text-base font-semibold text-gray-300 mt-3 mb-1">{line.slice(5)}</h4>;
      }
      
      // Horizontal rule
      if (line.match(/^---+$/)) {
        return <hr key={i} className="border-gray-700 my-4" />;
      }
      
      // Bullet points
      if (line.match(/^[-*] /)) {
        return <li key={i} className="text-gray-300 ml-4 list-disc">{renderInline(line.slice(2))}</li>;
      }
      
      // Numbered lists
      if (line.match(/^\d+\. /)) {
        const text = line.replace(/^\d+\. /, '');
        return <li key={i} className="text-gray-300 ml-4 list-decimal">{renderInline(text)}</li>;
      }
      
      // Blockquote
      if (line.startsWith('> ')) {
        return <blockquote key={i} className="border-l-4 border-gray-600 pl-4 text-gray-400 italic my-2">{line.slice(2)}</blockquote>;
      }
      
      // Code block
      if (line.startsWith('```')) {
        return null; // Skip markers, handle differently
      }
      
      // Empty line
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      
      // Regular paragraph
      return <p key={i} className="text-gray-300 my-1">{renderInline(line)}</p>;
    });
  };

  // Inline formatting
  const renderInline = (text: string) => {
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
    // Code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1.5 py-0.5 rounded text-orange-400 text-sm">$1</code>');
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener">$1</a>');
    
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h2 className="text-lg font-semibold">Memory Browser</h2>
          </div>
          <span className="text-xs text-gray-500">
            {memories.length} {memories.length === 1 ? 'file' : 'files'}
          </span>
        </div>
        
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memories..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading memories...</div>
        ) : selectedMemory ? (
          /* Full Memory View */
          <div className="p-4">
            <button
              onClick={() => setSelectedMemory(null)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <span>←</span>
              <span>Back to list</span>
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              {selectedMemory.isMainMemory ? (
                <span className="text-2xl">📌</span>
              ) : (
                <span className="text-2xl">📝</span>
              )}
              <div>
                <h3 className="font-semibold text-lg">{selectedMemory.filename}</h3>
                <div className="text-xs text-gray-500">
                  {formatDate(selectedMemory.lastModified)} • {formatSize(selectedMemory.size)}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 prose prose-invert max-w-none">
              {loadingContent ? (
                <div className="text-gray-500">Loading...</div>
              ) : (
                renderContent(selectedMemory.content)
              )}
            </div>
          </div>
        ) : memories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {search ? 'No memories match your search' : 'No memories found'}
          </div>
        ) : (
          /* Memory List */
          <div className="divide-y divide-gray-800">
            {memories.map((memory) => (
              <button
                key={memory.filename}
                onClick={() => loadFullContent(memory.filename)}
                className="w-full p-4 text-left hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">
                    {memory.isMainMemory ? '📌' : '📝'}
                  </span>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">
                        {memory.filename}
                      </span>
                      {memory.isMainMemory && (
                        <span className="text-xs bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded">
                          pinned
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">{memory.preview}</p>
                    <div className="text-xs text-gray-600 mt-1">
                      {formatDate(memory.lastModified)} • {formatSize(memory.size)}
                    </div>
                  </div>
                  <span className="text-gray-600 mt-1">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
