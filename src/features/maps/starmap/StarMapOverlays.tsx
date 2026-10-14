import { Star as StarIcon } from 'lucide-react';

interface StarMapOverlaysProps {
  romanticQuote?: string;
}

export function StarMapOverlays({ romanticQuote }: StarMapOverlaysProps) {
  return (
    <>
      {/* Top title overlay */}
      <div className="absolute top-0 left-0 w-full pointer-events-none flex flex-col items-center pt-10 md:pt-12 px-4">
        <h2 className="text-[#DFCEA8] font-serif text-[26px] md:text-3xl tracking-[0.2em] md:tracking-[0.25em] font-light leading-snug text-center">
          O CÉU DAQUELA<br className="md:hidden" /> NOITE
        </h2>
        <div className="mt-4 mb-4 flex items-center gap-3 text-[#DFCEA8]/40">
          <div className="h-[1px] w-12 md:w-16 bg-[#DFCEA8]/30" />
          <StarIcon className="w-3.5 h-3.5 fill-[#DFCEA8]/50 text-transparent" />
          <div className="h-[1px] w-12 md:w-16 bg-[#DFCEA8]/30" />
        </div>
      </div>

      {/* Bottom quote overlay */}
      {romanticQuote && (
        <div className="absolute bottom-6 md:bottom-10 left-0 w-full pointer-events-none flex flex-col items-center px-6">
          <p className="text-[#DFCEA8]/80 font-serif italic text-sm md:text-lg text-center max-w-sm md:max-w-xl leading-relaxed">
            "{romanticQuote}"
          </p>
          <div className="mt-4 flex items-center gap-3 text-[#DFCEA8]/40">
            <div className="h-[1px] w-8 bg-[#DFCEA8]/20" />
            <StarIcon className="w-3 h-3 fill-[#DFCEA8]/30 text-transparent" />
            <div className="h-[1px] w-8 bg-[#DFCEA8]/20" />
          </div>
        </div>
      )}
    </>
  );
}
