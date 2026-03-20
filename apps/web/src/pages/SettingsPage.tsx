import { useState, useRef } from 'react';
import { Camera, ArrowLeft, User, AtSign, FileText, Lock, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/services/users';
import { api } from '@/services/api';
import { Avatar, Button, Spinner } from '@/components/ui/index';
import { useDarkMode } from '@/hooks/useDarkMode';
import clsx from 'clsx';

export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const { dark, toggle } = useDarkMode();

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveProfile = async () => {
    setError(''); setSaving(true);
    try {
      const updated = await usersApi.updateProfile({ name, username, bio });
      setUser({ ...user!, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Failed to save'); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    setPwError(''); setPwSaving(true);
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); setPwSaving(false); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); setPwSaving(false); return; }
    try {
      await api.patch('/api/auth/change-password', { oldPassword: oldPw, newPassword: newPw });
      setOldPw(''); setNewPw(''); setConfirmPw('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2000);
    } catch (e: any) { setPwError(e?.response?.data?.message ?? 'Failed to change password'); }
    finally { setPwSaving(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const result = await usersApi.uploadAvatar(file);
      setUser({ ...user!, avatarUrl: result.avatarUrl ?? user!.avatarUrl });
    } catch {}
    finally { setAvatarLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <button onClick={() => navigate('/chat')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={toggle} className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8 space-y-8">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar src={user?.avatarUrl} name={user?.name} size="2xl" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
            >
              {avatarLoading ? <Spinner size="sm" /> : <Camera size={16} />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <p className="text-sm text-muted-foreground">Click the camera to change your avatar</p>
        </div>

        {/* Profile section */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Profile information</h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Username</label>
              <div className="relative">
                <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bio</label>
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-3 text-muted-foreground" />
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                  placeholder="Tell others about yourself…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors resize-none" />
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={saveProfile} loading={saving} className="w-full">
            {saved ? '✓ Saved!' : 'Save changes'}
          </Button>
        </div>

        {/* Password section */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Change password</h2>

          <div className="space-y-3">
            {[
              { label: 'Current password', value: oldPw, onChange: setOldPw, show: showOld, setShow: setShowOld },
              { label: 'New password', value: newPw, onChange: setNewPw, show: showNew, setShow: setShowNew },
              { label: 'Confirm new password', value: confirmPw, onChange: setConfirmPw, show: showNew, setShow: setShowNew },
            ].map((field, i) => (
              <div key={i}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{field.label}</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type={field.show ? 'text' : 'password'} value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    className="w-full h-10 pl-9 pr-9 text-sm rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors" />
                  <button type="button" onClick={() => field.setShow(!field.show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {field.show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pwError && <p className="text-xs text-destructive">{pwError}</p>}
          <Button onClick={savePassword} loading={pwSaving} variant="secondary" className="w-full">
            {pwSaved ? '✓ Password changed!' : 'Update password'}
          </Button>
        </div>

        {/* Appearance */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{dark ? 'Dark mode' : 'Light mode'}</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
            </div>
            <button onClick={toggle} className={clsx(
              'relative h-6 w-11 rounded-full transition-colors duration-200',
              dark ? 'bg-primary' : 'bg-muted'
            )}>
              <span className={clsx(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
                dark ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
