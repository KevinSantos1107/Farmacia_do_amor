import { Calendar, Clock, MapPin, Compass, Star as StarIcon } from 'lucide-react';
import type { StarMapConfig } from './types';
import { formatStarMapDate, formatCoordinates } from './starMapMath';

interface StarMapInfoBarProps {
  mapConfig: StarMapConfig;
}

export function StarMapInfoBar({ mapConfig }: StarMapInfoBarProps) {
  const formattedDate = formatStarMapDate(mapConfig.specialDate);
  const coordStr = formatCoordinates(mapConfig.customLocation?.lat, mapConfig.customLocation?.lng);
  const numConst = mapConfig.constellations?.length ?? 0;

  return (
    <div className="bg-[#030610] md:border-t border-[#DFCEA8]/10 px-5 md:px-6 pb-8 pt-4 md:py-4">
      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex items-center justify-between gap-5">
        <div className="flex items-center gap-6 text-xs tracking-widest uppercase text-[#DFCEA8]/60">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-[#DFCEA8]/40 flex-shrink-0" />
            <div>
              <p className="text-[#DFCEA8]/40 mb-1">DATA</p>
              <p className="text-[#DFCEA8]/80">{formattedDate}</p>
            </div>
          </div>

          {mapConfig.time && (
            <>
              <div className="w-px h-8 bg-[#DFCEA8]/10" />
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#DFCEA8]/40 flex-shrink-0" />
                <div>
                  <p className="text-[#DFCEA8]/40 mb-1">HORA</p>
                  <p className="text-[#DFCEA8]/80">{mapConfig.time}</p>
                </div>
              </div>
            </>
          )}

          <div className="w-px h-8 bg-[#DFCEA8]/10" />
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-[#DFCEA8]/40 flex-shrink-0" />
            <div>
              <p className="text-[#DFCEA8]/40 mb-1">LOCAL</p>
              <p className="text-[#DFCEA8]/80 max-w-[160px] truncate" title={mapConfig.customLocation?.name}>
                {mapConfig.customLocation?.name}
              </p>
            </div>
          </div>

          {coordStr && (
            <>
              <div className="w-px h-8 bg-[#DFCEA8]/10" />
              <div className="flex items-center gap-3">
                <Compass className="w-4 h-4 text-[#DFCEA8]/40 flex-shrink-0" />
                <div>
                  <p className="text-[#DFCEA8]/40 mb-1">COORDENADAS</p>
                  <p className="text-[#DFCEA8]/80 font-mono text-[11px]">{coordStr}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border border-[#DFCEA8]/20 rounded-lg px-5 py-3 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <StarIcon className="w-3.5 h-3.5 text-[#DFCEA8]/70" />
            <span className="text-[#DFCEA8]/90 text-xs font-bold tracking-widest uppercase">
              {numConst} {numConst === 1 ? 'CONSTELAÇÃO' : 'CONSTELAÇÕES'}
            </span>
          </div>
          <span className="text-[#DFCEA8]/40 text-[9px] tracking-[0.2em] uppercase mt-1">
            CALCULADAS PARA ESTE MOMENTO
          </span>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="md:hidden flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-[#DFCEA8]/10 bg-[#060a14] rounded-lg p-3.5 flex items-start gap-3">
            <Calendar className="w-4 h-4 text-[#DFCEA8]/40 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[#DFCEA8]/40 text-[9px] tracking-widest uppercase mb-1">DATA</p>
              <p className="text-[#DFCEA8]/80 text-[11px] uppercase tracking-wide">{formattedDate}</p>
            </div>
          </div>

          <div className="border border-[#DFCEA8]/10 bg-[#060a14] rounded-lg p-3.5 flex items-start gap-3">
            <Clock className="w-4 h-4 text-[#DFCEA8]/40 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[#DFCEA8]/40 text-[9px] tracking-widest uppercase mb-1">HORA</p>
              <p className="text-[#DFCEA8]/80 text-[11px] uppercase tracking-wide">{mapConfig.time || '--:--'}</p>
            </div>
          </div>

          <div className="border border-[#DFCEA8]/10 bg-[#060a14] rounded-lg p-3.5 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-[#DFCEA8]/40 mt-0.5 flex-shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[#DFCEA8]/40 text-[9px] tracking-widest uppercase mb-1">LOCAL</p>
              <p className="text-[#DFCEA8]/80 text-[11px] uppercase tracking-wide truncate">{mapConfig.customLocation?.name}</p>
            </div>
          </div>

          <div className="border border-[#DFCEA8]/10 bg-[#060a14] rounded-lg p-3.5 flex items-start gap-3">
            <Compass className="w-4 h-4 text-[#DFCEA8]/40 mt-0.5 flex-shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[#DFCEA8]/40 text-[9px] tracking-widest uppercase mb-1">COORDENADAS</p>
              <p className="text-[#DFCEA8]/80 text-[10px] font-mono whitespace-nowrap">{coordStr}</p>
            </div>
          </div>
        </div>

        <div className="border border-[#DFCEA8]/20 bg-gradient-to-b from-[#0a101f] to-[#04070e] rounded-lg p-4 flex flex-col items-center justify-center mt-1">
          <div className="flex items-center gap-2">
            <StarIcon className="w-4 h-4 text-[#DFCEA8]/70" />
            <span className="text-[#DFCEA8]/90 text-xs font-bold tracking-widest uppercase">
              {numConst} {numConst === 1 ? 'CONSTELAÇÃO' : 'CONSTELAÇÕES'}
            </span>
          </div>
          <span className="text-[#DFCEA8]/50 text-[9px] tracking-[0.2em] uppercase mt-1.5">
            CALCULADAS PARA ESTE MOMENTO
          </span>
        </div>
      </div>
    </div>
  );
}
