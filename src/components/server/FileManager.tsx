import React, { useState } from 'react';
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
} from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';
import { FileObject } from '../../types';

const INITIAL_FILES: FileObject[] = [
  { name: 'plugins', created: '2026-11-10', modified: '2026-11-23 14:10', mode: 'drwxr-xr-x', mode_bits: '0755', size: 4096, directory: true, file: false, symlink: false, mime: 'inode/directory' },
  { name: 'world', created: '2026-11-10', modified: '2026-11-23 14:22', mode: 'drwxr-xr-x', mode_bits: '0755', size: 12288, directory: true, file: false, symlink: false, mime: 'inode/directory' },
  { name: 'world_nether', created: '2026-11-10', modified: '2026-11-23 14:15', mode: 'drwxr-xr-x', mode_bits: '0755', size: 4096, directory: true, file: false, symlink: false, mime: 'inode/directory' },
  { name: 'world_the_end', created: '2026-11-10', modified: '2026-11-23 14:15', mode: 'drwxr-xr-x', mode_bits: '0755', size: 4096, directory: true, file: false, symlink: false, mime: 'inode/directory' },
  { name: 'logs', created: '2026-11-10', modified: '2026-11-23 14:22', mode: 'drwxr-xr-x', mode_bits: '0755', size: 4096, directory: true, file: false, symlink: false, mime: 'inode/directory' },
  { name: 'config', created: '2026-11-10', modified: '2026-11-23 13:40', mode: 'drwxr-xr-x', mode_bits: '0755', size: 4096, directory: true, file: false, symlink: false, mime: 'inode/directory' },
  { name: 'server.properties', created: '2026-11-10', modified: '2026-11-23 14:02', mode: '-rw-r--r--', mode_bits: '0644', size: 1840, directory: false, file: true, symlink: false, mime: 'text/plain' },
  { name: 'purpur.yml', created: '2026-11-10', modified: '2026-11-23 13:50', mode: '-rw-r--r--', mode_bits: '0644', size: 34120, directory: false, file: true, symlink: false, mime: 'text/yaml' },
  { name: 'paper-global.yml', created: '2026-11-10', modified: '2026-11-23 13:51', mode: '-rw-r--r--', mode_bits: '0644', size: 15420, directory: false, file: true, symlink: false, mime: 'text/yaml' },
  { name: 'eula.txt', created: '2026-11-10', modified: '2026-11-10 12:00', mode: '-rw-r--r--', mode_bits: '0644', size: 180, directory: false, file: true, symlink: false, mime: 'text/plain' },
  { name: 'ops.json', created: '2026-11-10', modified: '2026-11-23 12:15', mode: '-rw-r--r--', mode_bits: '0644', size: 420, directory: false, file: true, symlink: false, mime: 'application/json' },
  { name: 'whitelist.json', created: '2026-11-10', modified: '2026-11-23 12:15', mode: '-rw-r--r--', mode_bits: '0644', size: 1200, directory: false, file: true, symlink: false, mime: 'application/json' },
  { name: 'server.jar', created: '2026-11-10', modified: '2026-11-23 12:00', mode: '-rw-r--r--', mode_bits: '0755', size: 68157440, directory: false, file: true, symlink: false, mime: 'application/java-archive' },
];

const SAMPLE_SERVER_PROPERTIES = `# Minecraft server properties
# Mon Nov 23 14:02:00 UTC 2026
enable-jmx-monitoring=false
rcon.port=25575
level-seed=
gamemode=survival
enable-command-block=true
enable-query=true
generator-settings={}
enforce-secure-profile=false
level-name=world
motd=\\u00A7b\\u00A7lSlayerCraft \\u00A78\\u00A7l| \\u00A7fNext-Gen Survival \\u00A77[1.21.4]
query.port=25565
pvp=true
generate-structures=true
difficulty=hard
network-compression-threshold=256
require-resource-pack=false
max-tick-time=60000
use-native-transport=true
max-players=100
online-mode=true
enable-status=true
allow-flight=false
broadcast-rcon-to-ops=true
view-distance=10
server-ip=0.0.0.0
resource-pack-prompt=
allow-nether=true
server-port=25565
sync-chunk-writes=true
enable-rcon=true
op-permission-level=4
prevent-proxy-connections=false
hide-online-players=false
entity-broadcast-range-percentage=100
simulation-distance=10
rcon.password=SecureSlayerPass99
player-idle-timeout=0
force-gamemode=false
rate-limit=0
hardcore=false
white-list=false
broadcast-console-to-ops=true
spawn-npcs=true
spawn-animals=true
snooper-enabled=false
function-permission-level=2
level-type=minecraft\\:normal
spawn-monsters=true
enforce-whitelist=false
spawn-protection=0
max-world-size=29999984
`;

export const FileManager: React.FC = () => {
  const { activeServer } = useServer();
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [files, setFiles] = useState<FileObject[]>(INITIAL_FILES);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Editor modal state
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  // SFTP modal state
  const [showSftpModal, setShowSftpModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // New folder / file modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

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

  const openFile = (file: FileObject) => {
    if (file.directory) {
      setCurrentPath(prev => [...prev, file.name]);
    } else {
      setEditingFile(file.name);
      if (file.name === 'server.properties') {
        setFileContent(SAMPLE_SERVER_PROPERTIES);
      } else if (file.name.endsWith('.yml')) {
        setFileContent(`# Configuration for ${file.name}\nverbose: false\nchunk-loading:\n  threads: 4\n  optimize: true\n`);
      } else {
        setFileContent(`// Content of ${file.name}\n// Loaded directly from server container storage\n`);
      }
    }
  };

  const handleSaveEditor = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleDeleteSelected = () => {
    setFiles(prev => prev.filter(f => !selectedFiles.has(f.name)));
    setSelectedFiles(new Set());
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newDir: FileObject = {
      name: newFolderName.trim(),
      created: 'Just now',
      modified: 'Just now',
      mode: 'drwxr-xr-x',
      mode_bits: '0755',
      size: 4096,
      directory: true,
      file: false,
      symlink: false,
      mime: 'inode/directory',
    };
    setFiles(prev => [newDir, ...prev]);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

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
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            >
              Upload File
            </GlassButton>
            <input type="file" multiple className="hidden" />
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
            {files.map(file => {
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
                    ) : file.name.endsWith('.yml') || file.name.endsWith('.json') || file.name.endsWith('.properties') ? (
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
                    {file.mode}
                  </td>
                  <td className="p-3.5 text-slate-400 text-[11px] hidden sm:table-cell">
                    {file.modified}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GlassCard>

      {/* Glass Code Editor Modal */}
      <GlassModal
        isOpen={!!editingFile}
        onClose={() => setEditingFile(null)}
        title={`Editing: ${editingFile}`}
        description="Liquid Glass integrated code editor with container sync"
        maxWidth="4xl"
      >
        <div className="flex flex-col gap-3">
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-white/10 text-[11px] text-slate-400">
              <span>{editingFile}</span>
              <span>UTF-8 • UNIX (LF)</span>
            </div>
            <textarea
              value={fileContent}
              onChange={e => setFileContent(e.target.value)}
              rows={22}
              className="w-full bg-transparent p-4 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-sky-500/30"
              spellCheck={false}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              {isSaved ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> File saved to container!
                </span>
              ) : (
                'Press Ctrl+S or click Save to apply changes.'
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
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Changes
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
            <span>SFTP traffic is encrypted and handled directly by Wings daemon.</span>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            {/* Host */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Server Host</span>
                <span className="font-mono text-slate-200 font-semibold">{activeServer?.allocation.ip}</span>
              </div>
              <button
                onClick={() => copyToClipboard(activeServer?.allocation.ip || '', 'host')}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
              >
                {copiedField === 'host' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Port */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">SFTP Port</span>
                <span className="font-mono text-slate-200 font-semibold">2022</span>
              </div>
              <button
                onClick={() => copyToClipboard('2022', 'port')}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
              >
                {copiedField === 'port' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Username */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">SFTP Username</span>
                <span className="font-mono text-slate-200 font-semibold">{user?.username || 'admin'}.{activeServer?.identifier}</span>
              </div>
              <button
                onClick={() => copyToClipboard(`${user?.username || 'admin'}.${activeServer?.identifier}`, 'user')}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
              >
                {copiedField === 'user' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Connect Link */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10">
              <div className="min-w-0 pr-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">1-Click SFTP URI</span>
                <span className="font-mono text-[11px] text-red-500 truncate block">
                  sftp://{user?.username || 'admin'}.{activeServer?.identifier}@{activeServer?.allocation.ip}:2022
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(`sftp://${user?.username || 'admin'}.${activeServer?.identifier}@${activeServer?.allocation.ip}:2022`, 'uri')}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 shrink-0"
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
            <GlassButton variant="accent" size="sm" onClick={handleCreateFolder}>
              Create Directory
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
