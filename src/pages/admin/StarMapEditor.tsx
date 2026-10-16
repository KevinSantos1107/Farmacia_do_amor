import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useSiteId } from '../../services/firestore/paths';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Spinner } from '../../shared/ui/Spinner';
import { useToast } from '../../shared/ui/ToastProvider';
import { Save, Star, Search, MapPin } from 'lucide-react';
import { calculateVisibleConstellations } from '../../features/maps/utils/astronomy';

export interface StarMapConfig {
  specialDate: string;
  time?: string;
  customLocation: {
    lat: number;
    lng: number;
    name: string;
  };
  romanticQuote: string;
  constellations: string[];
}

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  [key: string]: unknown;
}

export default function StarMapEditor() {
  const { show } = useToast();
  const siteId = useSiteId();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StarMapConfig>({
    specialDate: '',
    time: '',
    customLocation: { lat: 0, lng: 0, name: '' },
    romanticQuote: '',
    constellations: [],
  });
  
  // Geocoding state
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recalculate constellations whenever date, time, or location changes
  useEffect(() => {
    if (form.specialDate && form.customLocation.lat !== 0 && form.customLocation.lng !== 0) {
      const calculated = calculateVisibleConstellations(
        form.specialDate,
        form.time || '21:00',
        form.customLocation.lat,
        form.customLocation.lng
      );
      setForm(prev => ({ ...prev, constellations: calculated }));
    } else {
      setForm(prev => ({ ...prev, constellations: [] }));
    }
  }, [form.specialDate, form.time, form.customLocation.lat, form.customLocation.lng]);

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'sites', siteId, 'config', 'star_map');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<StarMapConfig>;
          setForm({
            specialDate: data.specialDate || '',
            time: data.time || '',
            customLocation: {
              lat: data.customLocation?.lat ?? 0,
              lng: data.customLocation?.lng ?? 0,
              name: data.customLocation?.name || '',
            },
            romanticQuote: data.romanticQuote || '',
            constellations: data.constellations || [],
          });
          setLocationSearch(data.customLocation?.name || '');
        }
      } catch {
        show('Erro ao carregar configurações', 'err');
      }
      setLoading(false);
    };
    loadConfig();
  }, [siteId, show]);

  const handleSave = async () => {
    if (!form.specialDate || !form.customLocation.name || form.customLocation.lat === 0) {
      show('Data e Localização são obrigatórios', 'err');
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'sites', siteId, 'config', 'star_map'), {
        ...form,
        updatedAt: serverTimestamp(),
      });
      show('Configurações salvas com sucesso!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao salvar: ' + msg, 'err');
    }
    setSaving(false);
  };

  const handleLocationSearch = (query: string) => {
    setLocationSearch(query);
    setShowSuggestions(true);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        setLocationSuggestions(data);
      } catch (err) {
        console.error('Geocoding error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const selectLocation = (loc: LocationSuggestion) => {
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lon);
    // Extrai um nome mais amigável
    const nameParts = loc.display_name.split(', ');
    const shortName = nameParts.length > 2 ? `${nameParts[0]}, ${nameParts[nameParts.length - 1]}` : loc.display_name;

    setLocationSearch(shortName);
    setForm(prev => ({
      ...prev,
      customLocation: { name: shortName, lat, lng }
    }));
    setShowSuggestions(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mapa de Estrelas</h1>
          <p className="text-slate-400 mt-1">
            Configure a data e o local para calcularmos o céu exato daquele momento.
          </p>
        </div>
        <Button onClick={handleSave} isLoading={saving} className="gap-2 shrink-0">
          <Save className="w-4 h-4" /> Salvar Alterações
        </Button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
          <div className="p-2 bg-theme-primary/10 rounded-lg">
            <Star className="w-5 h-5 text-theme-primary" />
          </div>
          <h2 className="font-bold text-white text-lg">Detalhes do Momento</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Data Especial *</label>
            <Input
              type="date"
              value={form.specialDate}
              onChange={(e) => setForm((f) => ({ ...f, specialDate: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-slate-200"
            />
            <p className="text-xs text-slate-500">
              A data que o mapa de estrelas deve representar.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Horário (Opcional mas recomendado)</label>
            <Input
              type="time"
              value={form.time || ''}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-slate-200"
            />
            <p className="text-xs text-slate-500">
              Se preenchido, será usado para calcular com mais precisão as constelações visíveis.
            </p>
          </div>

          {/* Autocomplete de Localização */}
          <div className="space-y-2 md:col-span-2 relative">
            <label className="text-sm font-medium text-slate-300">Nome do Local *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={locationSearch}
                onChange={(e) => handleLocationSearch(e.target.value)}
                onFocus={() => { if (locationSearch.length > 2) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="bg-slate-900 border-slate-700 text-slate-200 pl-10"
                placeholder="Ex: São Paulo, Brasil"
              />
            </div>
            
            {/* Lista de Sugestões */}
            {showSuggestions && (locationSuggestions.length > 0 || isSearching) && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl overflow-hidden">
                {isSearching ? (
                  <div className="p-3 text-sm text-slate-400 text-center">Buscando locais...</div>
                ) : (
                  locationSuggestions.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => selectLocation(loc)}
                      className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 border-b border-slate-700/50 last:border-0 flex items-start gap-3"
                    >
                      <MapPin className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                      <span>{loc.display_name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            
            <p className="text-xs text-slate-500 mt-1">
              Digite o nome da cidade/estado/país e selecione uma opção na lista.
            </p>
          </div>

          {/* Campos readonly de Latitude e Longitude */}
          <div className="space-y-2 opacity-60">
            <label className="text-sm font-medium text-slate-300">Latitude (Automático)</label>
            <Input
              readOnly
              value={form.customLocation.lat || ''}
              className="bg-slate-900 border-slate-700 text-slate-400 font-mono cursor-not-allowed"
            />
          </div>

          <div className="space-y-2 opacity-60">
            <label className="text-sm font-medium text-slate-300">Longitude (Automático)</label>
            <Input
              readOnly
              value={form.customLocation.lng || ''}
              className="bg-slate-900 border-slate-700 text-slate-400 font-mono cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Star className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="font-bold text-white text-lg">Constelações Calculadas</h2>
        </div>
        
        <p className="text-sm text-slate-400">
          Com base na data, horário e localização selecionados, o sistema calculará automaticamente as constelações visíveis no céu.
        </p>

        {form.specialDate && form.customLocation.lat !== 0 ? (
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-lg">
            <div className="text-xs text-emerald-400 font-medium mb-3 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Constelações visíveis neste momento
            </div>
            {form.constellations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.constellations.map((c, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-200 text-sm font-medium">
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Nenhuma constelação suportada visível nos dados atuais.</p>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-700 border-dashed p-6 rounded-lg text-center">
            <p className="text-sm text-slate-500">
              Preencha a Data e a Localização acima para calcular o céu.
            </p>
          </div>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Frase Romântica (Opcional)</label>
          <Input
            value={form.romanticQuote}
            onChange={(e) => setForm((f) => ({ ...f, romanticQuote: e.target.value }))}
            className="bg-slate-900 border-slate-700 text-slate-200"
            placeholder="Ex: O momento em que nossas trajetórias se cruzaram..."
          />
        </div>
      </div>
    </div>
  );
}
