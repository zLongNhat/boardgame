import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, CheckCircle, AlertCircle, Sparkles, Copy, Coins, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sounds } from '../../utils/sound';
import { useGameSocketContext } from '../../hooks/GameSocketContext';

interface GiftcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

const FEATURED_CODE = 'DINHVANTRINH';
const FEATURED_REWARD = 100000;

export const GiftcodeModal: React.FC<GiftcodeModalProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { user, token } = useAuth();
  const { socket } = useGameSocketContext();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; reward: number } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (presetCode: string) => {
    setCode(presetCode);
    setError(null);
  };

  const handleCopyPreset = (presetCode: string) => {
    navigator.clipboard?.writeText(presetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError('Vui lòng nhập mã giftcode.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    // Try socket first if available, otherwise fallback to REST API
    if (socket && socket.connected) {
      socket.emit('giftcode:redeem', { userId: user.id, code: clean }, (res: any) => {
        setLoading(false);
        if (res && res.success) {
          sounds.playCoinCollect();
          setSuccessInfo({
            message: res.message || `Kích hoạt thành công giftcode ${clean}!`,
            reward: res.reward || 0
          });
          setCode('');
        } else {
          setError(res?.message || 'Không thể kích hoạt giftcode.');
        }
      });
      return;
    }

    // REST fallback
    try {
      const res = await fetch('/api/giftcode/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: clean })
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        sounds.playCoinCollect();
        setSuccessInfo({
          message: data.message || `Kích hoạt thành công giftcode ${clean}!`,
          reward: data.reward || 0
        });
        setCode('');
      } else {
        setError(data.message || 'Mã giftcode không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Lỗi mạng khi kích hoạt giftcode.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border border-purple-500/30 rounded-3xl p-6 shadow-2xl shadow-purple-950/40 text-white overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-400">
                Nhập Giftcode
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                Nhập mã quà tặng nhận xu miễn phí ngay lập tức!
              </p>
            </div>
          </div>

          {/* Featured Highlight: dinhvantrinh */}
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-purple-500/15 border border-yellow-500/40 shadow-inner">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-xs font-black uppercase text-yellow-400 tracking-wider">
                  Mã Đặc Biệt Hôm Nay
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                +{FEATURED_REWARD.toLocaleString('vi-VN')} 🪙
              </span>
            </div>
            <p className="text-xs text-gray-300 mb-2">
              Quà tặng đặc biệt từ <strong className="text-white">Đinh Văn Trinh</strong> trị giá{' '}
              <strong className="text-yellow-400">{FEATURED_REWARD.toLocaleString('vi-VN')} vàng</strong>!
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset(FEATURED_CODE)}
                className="flex-1 py-1.5 px-3 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-xs font-mono font-black text-yellow-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>{FEATURED_CODE}</span>
                <span className="text-[10px] text-yellow-200 font-sans font-normal">(Bấm để điền)</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopyPreset(FEATURED_CODE)}
                title="Sao chép mã"
                className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 transition-colors"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Mã Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="Nhập mã giftcode (VD: DINHVANTRINH)"
                  className="w-full bg-gray-950/80 border border-gray-700/80 focus:border-yellow-500/80 rounded-2xl py-3 px-4 text-base font-black tracking-wider text-yellow-400 placeholder:text-gray-600 placeholder:font-normal placeholder:tracking-normal focus:outline-none transition-all"
                  maxLength={30}
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 text-[11px]">Gợi ý:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('DINHVANTRINH')}
                className="text-[11px] font-bold text-yellow-400 hover:underline bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20"
              >
                DINHVANTRINH
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('TANTHU')}
                className="text-[11px] font-bold text-indigo-400 hover:underline bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20"
              >
                TANTHU
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('OMNIDECK')}
                className="text-[11px] font-bold text-purple-400 hover:underline bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20"
              >
                OMNIDECK
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Success Banner */}
            {successInfo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs text-center space-y-2"
              >
                <div className="flex items-center justify-center gap-2 font-black text-sm text-emerald-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>Kích Hoạt Thành Công!</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 font-black text-lg text-yellow-400">
                  <Coins className="w-5 h-5" />
                  <span>+{successInfo.reward.toLocaleString('vi-VN')} 🪙</span>
                </div>
                <p className="text-[11px] text-gray-300">{successInfo.message}</p>
              </motion.div>
            )}

            {/* Action Button */}
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenAuth) onOpenAuth();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                Đăng nhập để nhận Giftcode
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/30 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-gray-950" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 text-gray-950" />
                    <span>Đổi Thưởng Ngay</span>
                  </>
                )}
              </button>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
