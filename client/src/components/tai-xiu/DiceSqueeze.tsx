import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { TaiXiuDice, TaiXiuPhase } from '../../types/game';
import { useLang } from '../../i18n/LanguageContext';

interface DiceSqueezeProps {
  phase: TaiXiuPhase;
  dice?: TaiXiuDice;
  onQuickReveal?: () => void;
}

// Vị trí các chấm trên mặt xúc xắc 2D nhìn từ trên xuống (lưới 3x3)
const PIP_MAP: Record<number, Array<[number, number]>> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
};

/** Mặt xúc xắc nhìn từ trên xuống — trắng bệt, viền đậm, chấm đen (1 & 4 chấm đỏ). */
const DieFace2D = ({ value, index }: { value: number; index: number }) => {
  const pips = new Set((PIP_MAP[value] || []).map(([r, c]) => `${r}-${c}`));
  const pipColor = value === 1 || value === 4 ? 'bg-red-600' : 'bg-gray-900';
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.15 + index * 0.18, type: 'spring', stiffness: 400, damping: 18 }}
      className="grid grid-cols-3 grid-rows-3 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border-[3px] border-gray-900 p-1.5"
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3) + 1;
        const c = (i % 3) + 1;
        return (
          <div key={i} className="flex items-center justify-center">
            {pips.has(`${r}-${c}`) && <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${pipColor}`} />}
          </div>
        );
      })}
    </motion.div>
  );
};

/** Mặt úp — chờ số về (hiếm khi thấy vì server gửi số từ đầu phiên). */
const DieBack2D = () => (
  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-600 border-[3px] border-slate-300 flex items-center justify-center">
    <span className="text-2xl sm:text-3xl font-black text-slate-200">?</span>
  </div>
);

/** Nắp bát nhìn từ trên xuống — hình tròn che kín 3 xúc xắc, núm tròn ở giữa. */
const BowlLidTopDown = ({ label }: { label?: string }) => (
  <div className="flex flex-col items-center pointer-events-none">
    <div className="relative w-60 h-60" style={{ width: 240, height: 240 }}>
      {/* Thân nắp tròn */}
      <div className="absolute inset-0 rounded-full bg-slate-500 border-[3px] border-slate-200" />
      {/* Vòng trong */}
      <div className="absolute rounded-full bg-slate-600 border-2 border-slate-300/70" style={{ inset: '14%' }} />
      {/* Núm tròn giữa (nhìn từ trên) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-300 border-[3px] border-slate-100" />
    </div>
    {label && (
      <div className="mt-2 px-4 py-1.5 rounded-full bg-black border border-gray-600 text-xs font-bold text-gray-300 whitespace-nowrap">
        {label}
      </div>
    )}
  </div>
);

export default function DiceSqueeze({ phase, dice }: DiceSqueezeProps) {
  const { t } = useLang();
  const [lidGone, setLidGone] = useState(false);
  const lidControls = useAnimation();

  const isRevealPhase = phase === 'revealing' || phase === 'settling';

  useEffect(() => {
    if (phase === 'betting') {
      // Sang phiên mới: xúc xắc hiện sẵn số dưới nắp tròn
      setLidGone(false);
      lidControls.set({ x: 0, y: 0, opacity: 1, scale: 1 });
      lidControls.start({ scale: [1, 1.015, 1], transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } });
    } else if (phase === 'shaking') {
      setLidGone(false);
      lidControls.set({ x: 0, y: 0, opacity: 1, scale: 1 });
      lidControls.start({
        x: [-6, 6, -6, 6, 0],
        transition: { repeat: Infinity, duration: 0.25 },
      });
    } else if (isRevealPhase) {
      // Hết giờ cược: nhấc nắp tròn lên, thấy luôn 3 mặt số
      lidControls.stop();
      lidControls.start({ y: -280, opacity: 0, transition: { duration: 0.45, ease: 'easeIn' } }).then(() => setLidGone(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const revealed = isRevealPhase;

  return (
    <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px]">
      {/* Đĩa nhìn từ trên xuống — hình tròn */}
      <div className="absolute inset-0 rounded-full bg-slate-700 border-4 border-slate-500">
        <div className="absolute rounded-full border-2 border-amber-400" style={{ inset: '7%' }} />
        <div className="absolute rounded-full bg-slate-800/60" style={{ inset: '24%' }} />
      </div>

      {/* 3 xúc xắc nằm giữa đĩa — hiện SỐ LUÔN từ đầu phiên, nắp tròn che bên trên */}
      <motion.div
        className="absolute inset-0 z-10 flex items-center justify-center gap-3 sm:gap-4"
        initial={false}
        animate={revealed ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {dice ? (
          <>
            <DieFace2D value={dice.d1} index={0} />
            <div className="-translate-y-6">
              <DieFace2D value={dice.d2} index={1} />
            </div>
            <DieFace2D value={dice.d3} index={2} />
          </>
        ) : (
          <>
            <DieBack2D />
            <div className="-translate-y-6">
              <DieBack2D />
            </div>
            <DieBack2D />
          </>
        )}
      </motion.div>

      {/* Nắp tròn úp kín trong lúc cược/lắc */}
      {(phase === 'betting' || phase === 'shaking') && !lidGone && (
        <motion.div animate={lidControls} className="absolute inset-0 z-20 flex items-center justify-center">
          <BowlLidTopDown label={phase === 'betting' ? t('tx.bowlCovered') : undefined} />
        </motion.div>
      )}

      {/* Nút Mở Nhanh */}
      {phase === 'shaking' && !lidGone && (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => {
              lidControls.start({ y: -280, opacity: 0, transition: { duration: 0.3 } }).then(() => setLidGone(true));
            }}
            className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-full text-white font-bold text-sm border border-purple-400 transition-colors"
          >
            {t('tx.quickReveal')}
          </button>
        </div>
      )}
    </div>
  );
}
