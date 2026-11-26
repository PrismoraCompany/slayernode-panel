import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  Key,
  Check,
  Edit2,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassToggle } from '../ui/GlassToggle';
import { apiFetch } from '../../lib/api';
import { User } from '../../types';

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states - Create User
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states - Edit User
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/application/users');
      if (res.ok) {
        const json = await res.json();
        setUsers(
          (json.data || []).map((d: any) => {
            const a = d.attributes || d;
            return { ...a, is_admin: Boolean(a.root_admin ?? a.is_admin) };
          })
        );
      }
    } catch {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newUsername.trim() || !newEmail.trim() || !newPassword.trim()) {
      setCreateError('Username, Email, and Password are required.');
      return;
    }

    try {
      const res = await apiFetch('/api/application/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername.trim(),
          email: newEmail.trim(),
          name_first: newFirstName.trim() || 'User',
          name_last: newLastName.trim(),
          password: newPassword,
          root_admin: newIsAdmin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Failed creating user account.');
        return;
      }

      setShowCreateModal(false);
      setNewUsername('');
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewPassword('');
      setNewIsAdmin(false);
      fetchUsers();
      setActionNotice('User account created successfully!');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      setCreateError(err?.message || 'Network error.');
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditFirstName(user.name_first);
    setEditLastName(user.name_last);
    setEditEmail(user.email);
    setEditIsAdmin(user.is_admin);
    setEditPassword('');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    // SECURITY CHECK: Protect Main Admin ID 1 from demotion
    if (editingUser.id === 1 && editIsAdmin === false) {
      setEditError('Security Protection: Cannot revoke administrator privileges from the root system account.');
      return;
    }

    try {
      const res = await apiFetch(`/api/application/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name_first: editFirstName.trim(),
          name_last: editLastName.trim(),
          email: editEmail.trim(),
          root_admin: editingUser.id === 1 ? true : editIsAdmin,
          password: editPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed updating user account.');
        return;
      }

      setEditingUser(null);
      fetchUsers();
      setActionNotice(`User @${editingUser.username} updated successfully!`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      setEditError(err?.message || 'Network error.');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === 1) {
      alert('Security Policy: The primary system administrator account (ID 1) is permanent and cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user @${user.username} (${user.email})?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/application/users/${user.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed deleting user.');
        return;
      }

      setUsers(prev => prev.filter(u => u.id !== user.id));
      setActionNotice(`User @${user.username} deleted.`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Network error.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" /> User Accounts & RBAC Permissions
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage panel users, administrator elevations, and account credentials.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create New User
        </GlassButton>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Users Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="p-3.5">User</th>
              <th className="p-3.5 hidden sm:table-cell">Email Address</th>
              <th className="p-3.5">Account Role</th>
              <th className="p-3.5 hidden md:table-cell">Security Status</th>
              <th className="p-3.5 hidden lg:table-cell">Created</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map(u => {
              const isMainAdmin = u.id === 1;

              return (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/15 flex items-center justify-center font-bold text-white uppercase text-xs">
                      {u.name_first ? u.name_first[0] : u.username[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white block">{u.name_first} {u.name_last}</span>
                        {isMainAdmin && (
                          <span className="text-[9px] font-mono font-bold bg-red-600/20 text-red-500 px-1.5 py-0.5 rounded border border-red-600/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> ROOT
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">@{u.username}</span>
                    </div>
                  </td>

                  <td className="p-3.5 text-slate-300 font-mono hidden sm:table-cell whitespace-nowrap">{u.email}</td>

                  <td className="p-3.5 whitespace-nowrap">
                    <GlassBadge status={u.is_admin ? 'running' : 'default'}>
                      {u.is_admin ? 'ROOT ADMIN' : 'CLIENT USER'}
                    </GlassBadge>
                  </td>

                  <td className="p-3.5 hidden md:table-cell whitespace-nowrap">
                    {u.two_factor_enabled ? (
                      <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> 2FA Active
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">2FA Inactive</span>
                    )}
                  </td>

                  <td className="p-3.5 text-slate-400 text-[11px] hidden lg:table-cell whitespace-nowrap">
                    {u.created_at?.slice(0, 10)}
                  </td>

                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Edit Account Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Button (Protected for Main Admin ID 1) */}
                      {isMainAdmin ? (
                        <div
                          className="p-1.5 rounded-lg text-slate-600 opacity-40 cursor-not-allowed"
                          title="Primary root administrator cannot be deleted"
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </GlassCard>

      {/* CREATE USER MODAL */}
      <GlassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User Account"
        description="Provision a new user account with client or administrative privileges"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="flex flex-col gap-4 py-2">
          {createError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-600/40 text-red-500 font-bold text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Username"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="e.g. dev_operator"
              required
            />
            <GlassInput
              label="Email Address"
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="operator@slayernode.xyz"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="First Name"
              value={newFirstName}
              onChange={e => setNewFirstName(e.target.value)}
              placeholder="First name"
            />
            <GlassInput
              label="Last Name"
              value={newLastName}
              onChange={e => setNewLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>

          <GlassInput
            label="Account Password"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            rightIcon={
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <div className="pt-2 border-t border-white/10">
            <GlassToggle
              label="Root Administrator Privileges"
              description="Grants full unrestricted access to panel nodes, servers, users, and studio"
              checked={newIsAdmin}
              onChange={setNewIsAdmin}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" type="submit">
              Create Account
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* EDIT USER MODAL */}
      <GlassModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={editingUser ? `Edit Account: @${editingUser.username}` : 'Edit User Account'}
        description="Modify personal details, email address, password, and permission status"
        maxWidth="md"
      >
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-4 py-2">
            {editError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-600/40 text-red-500 font-bold text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {editingUser.id === 1 && (
              <div className="p-3 rounded-lg bg-red-600/10 border border-red-600/25 text-red-400 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Primary Root Administrator account. Root privileges are permanent and cannot be revoked.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassInput
                label="First Name"
                value={editFirstName}
                onChange={e => setEditFirstName(e.target.value)}
              />
              <GlassInput
                label="Last Name"
                value={editLastName}
                onChange={e => setEditLastName(e.target.value)}
              />
            </div>

            <GlassInput
              label="Email Address"
              type="email"
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              required
            />

            <GlassInput
              label="Reset Password (Leave blank to keep current)"
              type={showEditPassword ? 'text' : 'password'}
              value={editPassword}
              onChange={e => setEditPassword(e.target.value)}
              placeholder="Leave blank to retain current password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="pt-2 border-t border-white/10">
              <GlassToggle
                label="Root Administrator Privileges"
                description={editingUser.id === 1 ? 'Permanent root administrator account' : 'Grant or revoke full administrator privileges'}
                checked={editingUser.id === 1 ? true : editIsAdmin}
                disabled={editingUser.id === 1}
                onChange={setEditIsAdmin}
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <GlassButton variant="ghost" size="sm" type="button" onClick={() => setEditingUser(null)}>
                Cancel
              </GlassButton>
              <GlassButton variant="accent" size="sm" type="submit">
                Save Changes
              </GlassButton>
            </div>
          </form>
        )}
      </GlassModal>
    </div>
  );
};
