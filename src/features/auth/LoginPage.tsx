import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase/auth';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Heart } from 'lucide-react';

import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: { pathname?: string } } | null;
  const from = state?.from?.pathname || '/admin';

  // Redireciona automaticamente quando o contexto de auth for atualizado
  // Isso evita a "race condition" de redirecionar antes do AuthContext ler os claims
  useEffect(() => {
    if (user && user.email) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // O redirect agora acontece pelo useEffect acima, 
      // garantindo que o estado global `user` já está preenchido
    } catch {
      setError('E-mail ou senha incorretos.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg p-4 font-sans">
      <Card className="w-full max-w-md bg-theme-card-bg shadow-xl border-theme-card-border animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-2">
          <Heart className="w-12 h-12 mx-auto text-theme-primary" />
          <CardTitle className="text-2xl font-bold text-theme-text font-serif">
            Área do Casal
          </CardTitle>
          <p className="text-sm text-theme-text-secondary">Faça login para editar seu site.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-theme-text-secondary">E-mail</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-theme-text-secondary">Senha</label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
              />
            </div>
            <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading}>
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
