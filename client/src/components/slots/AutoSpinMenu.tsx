import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

/** Các mức quay tự động: 5 / 10 / 25 / 50 / 100 vòng và vô hạn (∞). */
export const AUTO_SPIN_OPTIONS = [5, 10, 25, 50, 100, Infinity];

interface AutoSpinMenuProps {
  /** Đang quay tự động hay không */
  active: boolean;
  /** Số vòng còn lại (Infinity = vô hạn) */
  remaining: number | null;
  /** Bắt đầu quay tự động với số vòng đã chọn */
  onSelect: (count: number) => void;
  /** Dừng quay tự động */
  onStop: () => void;
  /** Ví dụ: đang quay thủ công thì không mở menu được */
  disabled?: boolean;
  /** 'pill' = nút ngang chữ Tự Động/Dừng, 'round' = nút tròn AUTO */
  variant?: 'pill' | 'round';
}

export function AutoSpinMenu({
  active,
  remaining,
  onSelect,
  onStop,
  disabled = false,
  variant = 'pill',
}: AutoSpinMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi bấm ra ngoài hoặc bấm Escape
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const countLabel = remaining === Infinity ? '∞' : (remaining ?? 0);

  const handleClick = () => {
    if (active) {
      onStop();
    } else if (!disabled) {
      setOpen(o => !o);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      {open && (
        <div className="absolute bottom-full left-1/2 z-[70] mb-2 w-44 -translate-x-1/2 rounded-xl border border-rose-500/40 bg-gray-950/95 p-2 shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
          <div className="mb-1.5 text-center text-[10px] font-black uppercase tracking-wider text-gray-500">
            Quay Tự Động
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {AUTO_SPIN_OPTIONS.map(opt => (
              <button
                key={`${opt}`}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSelect(opt);
                }}
                className="rounded-lg border border-gray-700 bg-gray-800 px-1 py-1.5 text-xs font-black text-gray-200 transition-colors hover:border-rose-500/60 hover:bg-rose-600/30 hover:text-rose-200"
              >
                {opt === Infinity ? '∞' : opt}
              </button>
            ))}
          </div>
          <div className="mt-1.5 text-center text-[9px] text-gray-600">Hết số dư sẽ tự dừng</div>
        </div>
      )}

      {variant === 'round' ? (
        <button
          type="button"
          disabled={disabled && !active}
          onClick={handleClick}
          title={active ? 'Dừng Tự Động' : 'Chọn số vòng Quay Tự Động'}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center border-2 transition-all active:scale-90 ${
            active
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
              : 'bg-gray-900/90 hover:bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 shadow-md'
          }`}
        >
          {active ? (
            <>
              <Pause className="w-4 h-4 text-rose-400" />
              <span className="text-[8px] font-black uppercase text-rose-300">{countLabel}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-amber-400" />
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight mt-0.5">AUTO</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled && !active}
          onClick={handleClick}
          title={active ? 'Dừng Tự Động' : 'Chọn số vòng Quay Tự Động'}
          className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
            active
              ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 animate-pulse'
              : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          {active ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Dừng ({countLabel})</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Tự Động</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
