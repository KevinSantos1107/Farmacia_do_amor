import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode, Link2, Download } from 'lucide-react';
import { useSiteConfigStore } from '../../store/siteConfigStore';

import { copyToClipboard } from '../../shared/utils/clipboard';
import { AdminPageHeader } from './AdminPageHeader';

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';

const pages = [
  { label: 'Página Principal', value: SITE_URL + '/', description: 'A página inicial completa do site' },
  { label: 'Nossa História', value: SITE_URL + '/#timeline', description: 'Link direto para a seção da timeline' },
  { label: 'Álbum de Fotos', value: SITE_URL + '/#album', description: 'Link direto para os álbuns de fotos' },
];

export default function SharePage() {
  const { config } = useSiteConfigStore();
  const [selected, setSelected] = useState(pages[0].value);
  const [customUrl, setCustomUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  const activeUrl = customUrl.trim() || selected;

  const handleCopy = async () => {
    const success = await copyToClipboard(activeUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    const svg = qrRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      const coupleTitle = config?.couple
        ? `${config.couple.partner1.name}-${config.couple.partner2.name}`
        : 'site';
      const slug = coupleTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'site';
      a.download = `qrcode-${slug}.png`;
      a.click();
    };
    img.src = url;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full">
      <AdminPageHeader
        title="Compartilhar"
        description="Gere um link ou QR Code para enviar ao(à) parceiro(a)"
        className="mb-8"
      />

      {/* Seletor de Página */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4" /> Escolha a página
        </h2>
        <div className="space-y-2">
          {pages.map((page) => (
            <button
              key={page.value}
              onClick={() => { setSelected(page.value); setCustomUrl(''); }}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                selected === page.value && !customUrl.trim()
                  ? 'border-pink-500/60 bg-pink-500/10 text-white'
                  : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="font-medium text-sm">{page.label}</div>
              <div className="text-xs mt-0.5 opacity-60 truncate">{page.value}</div>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">Ou cole um link personalizado</label>
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
          />
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <QrCode className="w-4 h-4" /> QR Code
        </h2>
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {/* QR */}
          <div className="bg-white p-4 rounded-2xl shadow-xl flex-shrink-0">
            <QRCodeSVG
              ref={qrRef}
              value={activeUrl}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#1e1b4b"
            />
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-3 w-full">
            <div>
              <div className="text-xs text-slate-400 mb-1">URL gerada</div>
              <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-300 break-all">
                {activeUrl}
              </div>
            </div>

            <button
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                copied
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : 'bg-pink-500/20 border border-pink-500/40 text-pink-300 hover:bg-pink-500/30'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Link copiado!' : 'Copiar link'}
            </button>

            <button
              onClick={handleDownloadQR}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-medium text-sm border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              Baixar QR Code (PNG)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
