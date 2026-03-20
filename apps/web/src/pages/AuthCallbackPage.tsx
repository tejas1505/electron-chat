import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Spinner } from '@/components/ui/index';
import { api } from '@/services/api';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');
    if (!token || !refresh) { navigate('/login'); return; }

    api.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        setAuth(data.data, token, refresh);
        navigate('/chat', { replace: true });
      })
      .catch(() => navigate('/login'));
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center flex-col gap-4 bg-background">
      <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center mb-2 shadow-lg shadow-primary/25">
        <Zap size={22} className="text-primary-foreground" />
      </div>
      <Spinner size="md" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
