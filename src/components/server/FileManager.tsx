import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FileText,
  FileCode,
  FileArchive,
  UploadCloud,
  Plus,
  Trash2,
  Archive,
  FileSignature,
  Download,
  Key,
  FolderPlus,
  ChevronRight,
  Save,
  X,
  Copy,
  Check,
  Shield,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';
import { FileObject } from '../../types';

export const FileManager: React.FC = () => {
  const { activeServer } = useServer();
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [files, setFiles] = useState<FileObject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Editor modal state
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingFile, setSavingFile] = useState(false);

  // SFTP modal state
  const [showSftpModal, setShowSftpModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // New folder / file modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // File upload hidden ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load directory entries from node daemon
  const fetchFiles = async () => {
    if (!activeServer) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const dirParam = encodeURIComponent('/' + currentPath.join('/'));
      const res = await fetch(`/api/client/servers/${activeServer.uuid || activeServer.id}/files/list?directory=${dirParam}`);
      if (!res.ok) {
        throw new Error(`Failed to load directory (${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data.data)) {
        setFiles(data.data);
      } else {
        setFiles([]);
      }
    } catch (err: any) {
      console.error('[FileManager] Error fetching files:', err.message);
      setErrorMsg(err.message || 'Error loading directory contents.');
    } finally {
      setLoading(false);
    }
  };

  // Reset navigation when switching between different servers
  useEffect(() => {
    setCurrentPath([]);
    setEditingFile(null);
    setSelectedFiles(new Set());
  }, [activeServer?.uuid, activeServer?.id]);

  useEffect(() => {
    setSelectedFiles(new Set());
    fetchFiles();
  }, [activeServer?.uuid, activeServer?.id, currentPath.join('/')]);

  const toggleSelectFile = (name: string) => {
    const next = new Set(selectedFiles);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedFiles(next);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.name)));
    }
  };

  const openFile = async (file: FileObject) => {
    if (file.directory) {
      setCurrentPath(prev => [...prev, file.name]);
    } else {
      setEditingFile(file.name);
      setLoadingContent(true);
      try {
        const filePath = encodeURIComponent('/' + [...currentPath, file.name].join('/'));
        const res = await fetch(`/api/client/servers/${activeServer?.uuid || activeServer?.id}/files/contents?file=${filePath}`);
        if (!res.ok) {
          throw new Error('Could not read file contents.');
        }
        const text = await res.text();
        setFileContent(text);
      } catch (err: any) {
        setFileContent(`// Error reading file: ${err.message}\n`);
      } finally {
        setLoadingContent(false);
      }
    }
  };

  const handleSaveEditor = async () => {
    if (!editingFile || !activeServer) return;
    setSavingFile(true);
    try {
      const targetPath = '/' + [...currentPath, editingFile].join('/');
      const res = await fetch(`/api/client/servers/${activeServer.uuid || activeServer.id}/files/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: targetPath,
          content: fileContent,
        }),
      });

      if (!res.ok) throw new Error('Failed to save file to container volume.');

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      fetchFiles();
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    } finally {
      setSavingFile(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0 || !activeServer) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedFiles.size} item(s)?`)) return;

    try {
      const filePaths = Array.from(selectedFiles).map(name => '/' + [...currentPath, name].join('/'));
      const res = await fetch(`/api/client/servers/${activeServer.uuid || activeServer.id}/files/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filePaths }),
      });

      if (!res.ok) throw new Error('Deletion failed.');
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (err: any) {
      alert('Error deleting files: ' + err.message);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !activeServer) return;
    setCreatingFolder(true);
    try {
      const res = await fetch(`/api/client/servers/${activeServer.uuid || activeServer.id}/files/create-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: '/' + currentPath.join('/'),
          name: newFolderName.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to create folder.');
      setNewFolderName('');
      setShowNewFolderModal(false);
      fetchFiles();
    } catch (err: any) {
      alert('Folder creation failed: ' + err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !activeServer) return;

    setUploading(true);
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const f = uploadedFiles[i];
        const content = await f.text();
        const targetPath = '/' + [...currentPath, f.name].join('/');

        await fetch(`/api/client/servers/${activeServer.uuid || activeServer.id}/files/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: targetPath,
            content,
          }),
        });
      }
      fetchFiles();
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const sftpHost = activeServer?.allocation?.ip || window.location.hostname || '127.0.0.1';
  const sftpPort = 2202;
  const sftpUser = `${user?.username || 'admin'}.${activeServer?.identifier || activeServer?.uuid?.slice(0, 8) || 'srv'}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 overflow-x-auto max-w-xl py-1">
          <button
            onClick={() => setCurrentPath([])}
            className="hover:text-sky-300 font-bold transition-colors cursor-pointer"
          >
            /home/container
          </button>
          {currentPath.map((seg, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <button
                onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                className="hover:text-sky-300 font-semibold transition-colors cursor-pointer"
              >
                {seg}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <GlassButton
            size="sm"
            variant="glass"
            onClick={fetchFiles}
            disabled={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-slate-300 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </GlassButton>

          <GlassButton
            size="sm"
            variant="glass"
            onClick={() => setShowSftpModal(true)}
            leftIcon={<Key className="w-3.5 h-3.5 text-amber-400" />}
          >
            SFTP Details
          </GlassButton>

          <GlassButton
            size="sm"
            variant="glass"
            onClick={() => setShowNewFolderModal(true)}
            leftIcon={<FolderPlus className="w-3.5 h-3.5 text-sky-400" />}
          >
            New Folder
          </GlassButton>

          <label className="cursor-pointer">
            <GlassButton
              size="sm"
              variant="accent"
              disabled={uploading}
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </GlassButton>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {selectedFiles.size > 0 && (
            <GlassButton
              size="sm"
              variant="danger"
              onClick={handleDeleteSelected}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete ({selectedFiles.size})
            </GlassButton>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Files Table Glass Card */}
      <GlassCard className="overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="p-3.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === files.length && files.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-white/20 bg-slate-900 text-sky-500 focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="p-3.5">Name</th>
              <th className="p-3.5 hidden md:table-cell">Size</th>
              <th className="p-3.5 hidden lg:table-cell">Permissions</th>
              <th className="p-3.5 hidden sm:table-cell">Last Modified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && files.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Loading server volume files from Wings daemon...</span>
                  </div>
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  This directory is empty.
                </td>
              </tr>
            ) : (
              files.map(file => {
                const isSelected = selectedFiles.has(file.name);
                return (
                  <tr
                    key={file.name}
                    onClick={() => openFile(file)}
                    className={`hover:bg-white/5 transition-colors cursor-pointer select-none ${
                      isSelected ? 'bg-sky-500/10' : ''
                    }`}
                  >
                    <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectFile(file.name)}
                        className="rounded border-white/20 bg-slate-900 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5 font-medium text-slate-200 flex items-center gap-3">
                      {file.directory ? (
                        <Folder className="w-4 h-4 text-sky-400 fill-sky-400/20" />
                      ) : file.name.endsWith('.jar') || file.name.endsWith('.zip') ? (
                        <FileArchive className="w-4 h-4 text-amber-400" />
                      ) : file.name.endsWith('.yml') || file.name.endsWith('.yaml') || file.name.endsWith('.json') || file.name.endsWith('.properties') ? (
                        <FileCode className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="font-mono text-xs">{file.name}</span>
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono hidden md:table-cell">
                      {file.directory ? '—' : formatBytes(file.size)}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px] hidden lg:table-cell">
                      {file.mode || '-rw-r--r--'}
                    </td>
                    <td className="p-3.5 text-slate-400 text-[11px] hidden sm:table-cell">
                      {file.modified}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </GlassCard>

      {/* Glass Code Editor Modal */}
      <GlassModal
        isOpen={!!editingFile}
        onClose={() => setEditingFile(null)}
        title={`Editing: ${editingFile}`}
        description="Liquid Glass live code editor synced with container volume"
        maxWidth="4xl"
      >
        <div className="flex flex-col gap-3">
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-white/10 text-[11px] text-slate-400">
              <span>{editingFile}</span>
              <span>UTF-8 • UNIX (LF)</span>
            </div>
            {loadingContent ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>Reading file from Wings volume...</span>
              </div>
            ) : (
              <textarea
                value={fileContent}
                onChange={e => setFileContent(e.target.value)}
                rows={22}
                className="w-full bg-transparent p-4 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-sky-500/30"
                spellCheck={false}
              />
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              {isSaved ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> File saved to container volume!
                </span>
              ) : (
                'Press Save Changes to apply updates directly to container.'
              )}
            </span>
            <div className="flex items-center gap-2">
              <GlassButton variant="ghost" size="sm" onClick={() => setEditingFile(null)}>
                Close
              </GlassButton>
              <GlassButton
                variant="accent"
                size="sm"
                onClick={handleSaveEditor}
                disabled={savingFile || loadingContent}
                leftIcon={savingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              >
                {savingFile ? 'Saving...' : 'Save Changes'}
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassModal>

      {/* SFTP Connection Modal */}
      <GlassModal
        isOpen={showSftpModal}
        onClose={() => setShowSftpModal(false)}
        title="SFTP Connection Credentials"
        description="Connect securely using FileZilla, WinSCP, or Cyberduck"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-200 text-xs flex items-center gap-2.5">
            <Shield className="w-4 h-4 shrink-0 text-amber-400" />
            <span>SFTP traffic is encrypted and handled directly by SlayerWings SFTP subsystem.</span>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            {/* Host */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Server Host</span>
                <span className="font-mono text-slate-200 font-semibold">{sftpHost}</span>
              </div>
              <button
                onClick={() => copyToClipboard(sftpHost, 'host')}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                {copiedField === 'host' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Port */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">SFTP Port</span>
                <span className="font-mono text-slate-200 font-semibold">{sftpPort}</span>
              </div>
              <button
                onClick={() => copyToClipboard(String(sftpPort), 'port')}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                {copiedField === 'port' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Username */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">SFTP Username</span>
                <span className="font-mono text-slate-200 font-semibold">{sftpUser}</span>
              </div>
              <button
                onClick={() => copyToClipboard(sftpUser, 'user')}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                {copiedField === 'user' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Connect Link */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10">
              <div className="min-w-0 pr-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">1-Click SFTP URI</span>
                <span className="font-mono text-[11px] text-sky-400 truncate block">
                  sftp://{sftpUser}@{sftpHost}:{sftpPort}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(`sftp://${sftpUser}@${sftpHost}:${sftpPort}`, 'uri')}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 shrink-0 cursor-pointer"
              >
                {copiedField === 'uri' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <GlassButton variant="accent" className="w-full" onClick={() => setShowSftpModal(false)}>
              Done
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* New Folder Modal */}
      <GlassModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        title="Create New Directory"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4 py-2">
          <GlassInput
            label="Directory Name"
            placeholder="e.g. datapacks"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setShowNewFolderModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" onClick={handleCreateFolder} disabled={creatingFolder}>
              {creatingFolder ? 'Creating...' : 'Create Directory'}
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
