import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  FileText,
  FilePlus,
  FolderPlus,
  Upload,
  Download,
  Trash2,
  Edit3,
  RefreshCw,
  ChevronRight,
  Home,
  Archive,
  PackageOpen,
  Save,
  X,
} from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiFetch, apiJson } from '../../lib/api';
import { FileObject } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export const FileManager: React.FC = () => {
  const { activeServer } = useServers();
  const [currentDir, setCurrentDir] = useState('/');
  const [files, setFiles] = useState<FileObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingFilePath, setEditingFilePath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [savingFile, setSavingFile] = useState(false);

  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFile, setRenamingFile] = useState<FileObject | null>(null);
  const [renameTarget, setRenameTarget] = useState('');
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const srvUuid = activeServer?.uuid || '';

  const loadDirectory = useCallback(async (dir = currentDir) => {
    if (!srvUuid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<{ data: FileObject[] }>(
        `/api/client/servers/${encodeURIComponent(srvUuid)}/files/list?directory=${encodeURIComponent(dir)}`
      );
      const list = Array.isArray(res?.data) ? res.data : [];
      list.sort((a, b) => {
        if (a.directory && !b.directory) return -1;
        if (!a.directory && b.directory) return 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(list);
    } catch (err: any) {
      setError(err?.message || 'Failed listing directory.');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [srvUuid, currentDir]);

  useEffect(() => {
    setCurrentDir('/');
    setEditingFilePath(null);
    setEditorContent('');
    setError(null);
  }, [srvUuid]);

  useEffect(() => {
    loadDirectory(currentDir);
  }, [srvUuid, currentDir, loadDirectory]);

  if (!activeServer) return null;

  const joinPath = (dir: string, name: string) => {
    const cleanDir = dir === '/' ? '' : dir.replace(/\/+$/, '');
    return `${cleanDir}/${name}`.replace(/\/+/g, '/');
  };

  const openEntry = async (item: FileObject) => {
    const fullPath = joinPath(currentDir, item.name);
    if (item.directory) {
      setCurrentDir(fullPath);
      return;
    }
    setError(null);
    try {
      const res = await apiJson<{ content?: string; raw?: string }>(
        `/api/client/servers/${encodeURIComponent(srvUuid)}/files/contents?file=${encodeURIComponent(fullPath)}`
      );
      setEditingFilePath(fullPath);
      setEditorContent(res?.content ?? res?.raw ?? '');
    } catch (err: any) {
      setError(err?.message || `Unable to open ${item.name}`);
    }
  };

  const handleSaveEditor = async () => {
    if (!editingFilePath) return;
    setSavingFile(true);
    setError(null);
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(srvUuid)}/files/write`, {
        method: 'POST',
        body: JSON.stringify({ file: editingFilePath, content: editorContent, encoding: 'utf8' }),
      });
      await loadDirectory(currentDir);
    } catch (err: any) {
      setError(err?.message || 'Save failed.');
    } finally {
      setSavingFile(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFileName.trim().replace(/^\/+/, '');
    if (!clean) return;
    const fullPath = joinPath(currentDir, clean);
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(srvUuid)}/files/write`, {
        method: 'POST',
        body: JSON.stringify({ file: fullPath, content: '', encoding: 'utf8' }),
      });
      setShowNewFile(false);
      setNewFileName('');
      await loadDirectory(currentDir);
      setEditingFilePath(fullPath);
      setEditorContent('');
    } catch (err: any) {
      setError(err?.message || 'Failed creating file.');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFolderName.trim().replace(/^\/+/, '');
    if (!clean) return;
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(srvUuid)}/files/create-folder`, {
        method: 'POST',
        body: JSON.stringify({ root: currentDir, name: clean }),
      });
      setShowNewFolder(false);
      setNewFolderName('');
      await loadDirectory(currentDir);
    } catch (err: any) {
      setError(err?.message || 'Failed creating folder.');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFile || !renameTarget.trim()) return;
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(srvUuid)}/files/rename`, {
        method: 'POST',
        body: JSON.stringify({
          root: currentDir,
          files: [{ from: renamingFile.name, to: renameTarget.trim() }],
        }),
      });
      setRenamingFile(null);
      setRenameTarget('');
      await loadDirectory(currentDir);
    } catch (err: any) {
      setError(err?.message || 'Rename failed.');
    }
  };

  const handleDelete = async (item: FileObject) => {
    const target = joinPath(currentDir, item.name);
    if (!window.confirm(`Delete "${item.name}" permanently from ${activeServer.name}?`)) return;
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(srvUuid)}/files/delete`, {
        method: 'POST',
        body: JSON.stringify({ files: [target] }),
      });
      if (editingFilePath === target) setEditingFilePath(null);
      await loadDirectory(currentDir);
    } catch (err: any) {
      setError(err?.message || 'Delete failed.');
    }
  };

  const handleDownload = async (item: FileObject) => {
    const fullPath = joinPath(currentDir, item.name);
    try {
      const res = await apiFetch(
        `/api/client/servers/${encodeURIComponent(srvUuid)}/files/download?file=${encodeURIComponent(fullPath)}`
      );
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Download failed.');
    }
  };

  const handleCompress = async (item: FileObject) => {
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(srvUuid)}/files/compress`, {
        method: 'POST',
        body: JSON.stringify({ root: currentDir, files: [item.name], name: `${item.name}.tar.gz` }),
      });
      await loadDirectory(currentDir);
    } catch (err: any) {
      setError(err?.message || 'Compression failed.');
    }
  };

  const handleDecompress = async (item: FileObject) => {
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(srvUuid)}/files/decompress`, {
        method: 'POST',
        body: JSON.stringify({ root: currentDir, file: item.name }),
      });
      await loadDirectory(currentDir);
    } catch (err: any) {
      setError(err?.message || 'Decompression failed.');
    }
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const fileObj of Array.from(selected)) {
        const buffer = await fileObj.arrayBuffer();
        const b64 = arrayBufferToBase64(buffer);
        const target = joinPath(currentDir, fileObj.name);
        await apiJson(`/api/client/servers/${encodeURIComponent(srvUuid)}/files/write`, {
          method: 'POST',
          body: JSON.stringify({ file: target, content: b64, encoding: 'base64' }),
        });
      }
      await loadDirectory(currentDir);
    } catch (err: any) {
      setError(err?.message || 'File upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const segments = currentDir.split('/').filter(Boolean);

  if (editingFilePath) {
    return (
      <GlassCard className="p-0 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-[#151821] border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-mono text-xs text-white">
            <FileText className="w-4 h-4 text-red-400" />
            <span>{editingFilePath}</span>
          </div>
          <div className="flex items-center gap-2">
            <GlassButton variant="secondary" size="sm" onClick={() => setEditingFilePath(null)}>
              <X className="w-3.5 h-3.5 mr-1" /> Close
            </GlassButton>
            <GlassButton variant="primary" size="sm" onClick={handleSaveEditor} disabled={savingFile}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> {savingFile ? 'Saving...' : 'Save Content'}
            </GlassButton>
          </div>
        </div>
        {error && (
          <div className="px-4 py-2 bg-rose-500/15 border-b border-rose-500/30 text-xs text-rose-300">{error}</div>
        )}
        <textarea
          value={editorContent}
          onChange={e => setEditorContent(e.target.value)}
          spellCheck={false}
          className="w-full h-[500px] bg-[#0B0D12] text-slate-200 font-mono text-xs p-4 focus:outline-none resize-y leading-relaxed"
        />
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCurrentDir('/')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white cursor-pointer shrink-0"
          >
            <Home className="w-3.5 h-3.5 text-red-400" /> /home/container
          </button>
          {segments.map((seg, i) => {
            const segPath = '/' + segments.slice(0, i + 1).join('/');
            return (
              <React.Fragment key={segPath}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <button
                  type="button"
                  onClick={() => setCurrentDir(segPath)}
                  className="px-2 py-1 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer shrink-0"
                >
                  {seg}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUploadFiles} />
          <GlassButton variant="secondary" size="sm" onClick={() => setShowNewFile(true)}>
            <FilePlus className="w-3.5 h-3.5 mr-1.5" /> New File
          </GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="w-3.5 h-3.5 mr-1.5" /> New Folder
          </GlassButton>
          <GlassButton variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-3.5 h-3.5 mr-1.5" /> {uploading ? 'Uploading...' : 'Upload'}
          </GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={() => loadDirectory(currentDir)} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </GlassButton>
        </div>
      </GlassCard>

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      <GlassCard className="p-0 overflow-hidden">
        {currentDir !== '/' && (
          <button
            type="button"
            onClick={() => {
              const parent = '/' + segments.slice(0, -1).join('/');
              setCurrentDir(parent === '/' ? '/' : parent);
            }}
            className="w-full px-4 py-2.5 text-left text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 border-b border-white/5 flex items-center gap-2 cursor-pointer"
          >
            <Folder className="w-4 h-4 text-slate-400" /> .. (Parent Directory)
          </button>
        )}

        {files.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">
            {loading ? 'Reading container directory...' : 'This folder is empty. Create a file or upload assets above.'}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {files.map(item => {
              const isArchive = /\.(tar\.gz|tgz|zip)$/i.test(item.name);
              return (
                <div
                  key={item.name}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => openEntry(item)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    {item.directory ? (
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className="text-sm text-white font-medium truncate hover:text-red-300">
                      {item.name}
                    </span>
                  </button>

                  <div className="hidden md:flex items-center gap-6 text-xs font-mono text-slate-400 shrink-0">
                    <span className="w-20 text-right">{item.directory ? 'Folder' : formatBytes(item.size)}</span>
                    <span className="w-40 text-right">{new Date(item.modified).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!item.directory && (
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingFile(item);
                        setRenameTarget(item.name);
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                      title="Rename"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {isArchive ? (
                      <button
                        type="button"
                        onClick={() => handleDecompress(item)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-emerald-400 cursor-pointer"
                        title="Extract Archive"
                      >
                        <PackageOpen className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCompress(item)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-300 cursor-pointer"
                        title="Compress (.tar.gz)"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      <GlassModal isOpen={showNewFile} onClose={() => setShowNewFile(false)} title="Create New File" maxWidth="sm">
        <form onSubmit={handleCreateFile} className="flex flex-col gap-4 py-2">
          <GlassInput
            label="Filename"
            placeholder="e.g. index.js, app.py, config.yml"
            value={newFileName}
            onChange={e => setNewFileName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setShowNewFile(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary">Create &amp; Edit</GlassButton>
          </div>
        </form>
      </GlassModal>

      <GlassModal isOpen={showNewFolder} onClose={() => setShowNewFolder(false)} title="Create New Folder" maxWidth="sm">
        <form onSubmit={handleCreateFolder} className="flex flex-col gap-4 py-2">
          <GlassInput
            label="Directory Name"
            placeholder="e.g. plugins, scripts"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setShowNewFolder(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary">Create Folder</GlassButton>
          </div>
        </form>
      </GlassModal>

      <GlassModal isOpen={!!renamingFile} onClose={() => setRenamingFile(null)} title="Rename Item" maxWidth="sm">
        <form onSubmit={handleRenameSubmit} className="flex flex-col gap-4 py-2">
          <GlassInput
            label="New Name"
            value={renameTarget}
            onChange={e => setRenameTarget(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setRenamingFile(null)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary">Rename</GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
