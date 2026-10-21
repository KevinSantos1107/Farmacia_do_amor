import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../shared/ui/Button';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[70vh]">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center shadow-xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-serif font-bold text-white mb-2">
          Acesso Restrito
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          Sua conta não tem permissão para acessar esta seção. Este recurso é exclusivo para Super Administradores.
        </p>

        <Button
          onClick={() => navigate('/admin')}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-600/20"
        >
          Voltar ao Painel
        </Button>
      </div>
    </div>
  );
}
