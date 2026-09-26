import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  X,
  History,
  Coins,
  CheckCircle,
  AlertCircle,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sounds } from '../../utils/sound';
import { useGameSocketContext } from '../../hooks/GameSocketContext';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
}

interface TransactionItem {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  recipientId: string;
  recipientUsername: string;
  recipientDisplayName: string;
  amount: number;
  note?: string;
  timestamp: number;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { user, token } = useAuth();
  const { socket } = useGameSocketContext();

  const [activeTab, setActiveTab] = useState<'transfer' | 'history'>('transfer');

  // Form states
  const [recipientInput, setRecipientInput] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<UserSearchResult | null>(null);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [note, setNote] = useState('');

  // Execution states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // History states
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      if (activeTab === 'history') {
        loadHistory();
      }
    }
  }, [isOpen, activeTab]);

  // Debounced search for players
  useEffect(() => {
    if (!recipientInput.trim() || selectedRecipient) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        if (socket && socket.connected) {
          socket.emit(
            'wallet:search-users',
            { query: recipientInput.trim(), excludeUserId: user?.id },
            (res: any) => {
              setSearching(false);
              if (res && res.success) {
                setSearchResults(res.users || []);
              }
            }
          );
        } else {
          const res = await fetch(`/api/wallet/search?q=${encodeURIComponent(recipientInput.trim())}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          const data = await res.json();
          setSearching(false);
          if (data.success) {
            setSearchResults(data.users || []);
          }
        }
      } catch {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [recipientInput, selectedRecipient, socket, token, user?.id]);

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      if (socket && socket.connected) {
        socket.emit('wallet:get-history', { userId: user.id }, (res: any) => {
          setLoadingHistory(false);
          if (res && res.success) {
            setTransactions(res.transactions || []);
          }
        });
      } else {
        const res = await fetch('/api/wallet/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setLoadingHistory(false);
        if (data.success) {
          setTransactions(data.transactions || []);
        }
      }
    } catch {
      setLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const currentBalance = user?.balance || 0;
  const numAmount = typeof amount === 'number' ? amount : 0;

  const handleSelectUser = (u: UserSearchResult) => {
    setSelectedRecipient(u);
    setRecipientInput(u.displayName);
    setSearchResults([]);
  };

  const handleClearRecipient = () => {
    setSelectedRecipient(null);
    setRecipientInput('');
  };

  const handleAddAmount = (add: number) => {
    const next = Math.min(currentBalance, Math.max(0, numAmount + add));
    setAmount(next);
  };

  const handleSetMax = () => {
    setAmount(currentBalance);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    const targetQuery = selectedRecipient ? selectedRecipient.username : recipientInput.trim();
    if (!targetQuery) {
      setError('Vui lòng chọn người nhận tiền.');
      return;
    }

    if (!numAmount || numAmount <= 0) {
      setError('Số tiền chuyển phải lớn hơn 0.');
      return;
    }

    if (numAmount > currentBalance) {
      setError('Số dư ví không đủ để thực hiện giao dịch.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      senderId: user.id,
      recipientQuery: targetQuery,
      recipient: targetQuery,
      amount: numAmount,
      note: note.trim()
    };

    if (socket && socket.connected) {
      socket.emit('wallet:transfer', payload, (res: any) => {
        setLoading(false);
        if (res && res.success) {
          sounds.playCoinTransfer();
          setSuccessMsg(res.message || `Đã chuyển thành công ${numAmount.toLocaleString('vi-VN')} 🪙!`);
          setAmount('');
          setNote('');
          setSelectedRecipient(null);
          setRecipientInput('');
          loadHistory();
        } else {
          setError(res?.message || 'Chuyển tiền thất bại.');
        }
      });
      return;
    }

    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        sounds.playCoinTransfer();
        setSuccessMsg(data.message || `Đã chuyển thành công ${numAmount.toLocaleString('vi-VN')} 🪙!`);
        setAmount('');
        setNote('');
        setSelectedRecipient(null);
        setRecipientInput('');
        loadHistory();
      } else {
        setError(data.message || 'Chuyển tiền thất bại.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Lỗi mạng khi thực hiện chuyển tiền.');
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
          className="relative w-full max-w-lg bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl shadow-emerald-950/40 text-white overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-200 to-indigo-300">
                Chuyển Tiền / Chuyển Xu
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                Chuyển coin ngay lập tức tới người chơi khác qua tên tài khoản
              </p>
            </div>
          </div>

          {/* Balance Preview Card */}
          <div className="mb-4 p-3 rounded-2xl bg-gray-950/80 border border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-xs text-gray-400">Số dư hiện tại:</span>
            </div>
            <span className="font-black text-sm text-yellow-400">
              {currentBalance.toLocaleString('vi-VN')} 🪙
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex p-1 mb-5 bg-gray-950 rounded-2xl border border-gray-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('transfer');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'transfer'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Chuyển Tiền</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                loadHistory();
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch Sử Giao Dịch</span>
            </button>
          </div>

          {/* TAB 1: TRANSFER FORM */}
          {activeTab === 'transfer' && (
            <form onSubmit={handleTransfer} className="space-y-4">
              {/* Recipient Picker */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Người Nhận
                </label>
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={recipientInput}
                    onChange={(e) => {
                      setRecipientInput(e.target.value);
                      setSelectedRecipient(null);
                      setError(null);
                    }}
                    placeholder="Nhập tên đăng nhập hoặc tên hiển thị..."
                    className="w-full bg-gray-950/80 border border-gray-700/80 focus:border-emerald-500/80 rounded-2xl py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-all"
                  />
                  {searching ? (
                    <div className="absolute right-3 flex items-center">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    </div>
                  ) : recipientInput ? (
                    <button
                      type="button"
                      onClick={handleClearRecipient}
                      className="absolute right-3 p-1 text-gray-500 hover:text-white rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && !selectedRecipient && (
                  <div className="absolute z-20 left-0 right-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map((sr) => (
                      <button
                        key={sr.id}
                        type="button"
                        onClick={() => handleSelectUser(sr)}
                        className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-gray-800/80 text-left transition-colors border-b border-gray-800 last:border-0"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
                          {sr.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{sr.displayName}</div>
                          <div className="text-[10px] text-gray-400">@{sr.username}</div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          Chọn
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedRecipient && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-black text-xs text-gray-950">
                      ✓
                    </div>
                    <div className="text-xs">
                      Đã chọn người nhận:{' '}
                      <strong className="text-emerald-300">{selectedRecipient.displayName}</strong>{' '}
                      <span className="text-gray-400">(@{selectedRecipient.username})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Số Tiền Chuyển
                  </label>
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="text-[11px] font-bold text-yellow-400 hover:underline"
                  >
                    Tất cả ({currentBalance.toLocaleString('vi-VN')} 🪙)
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={currentBalance}
                    value={amount}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                      setAmount(v);
                      setError(null);
                    }}
                    placeholder="0"
                    className="w-full bg-gray-950/80 border border-gray-700/80 focus:border-yellow-500/80 rounded-2xl py-2.5 px-4 text-base font-black text-yellow-400 placeholder:text-gray-600 focus:outline-none transition-all"
                  />
                  <span className="absolute right-4 top-2.5 text-sm font-bold text-yellow-500">🪙</span>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[1000, 10000, 50000, 100000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddAmount(preset)}
                      className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 text-[11px] font-bold text-gray-300 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                    >
                      +{preset.toLocaleString('vi-VN')}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="px-2.5 py-1 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-[11px] font-bold text-yellow-400 border border-yellow-500/30 transition-colors cursor-pointer"
                  >
                    Tối đa
                  </button>
                </div>
              </div>

              {/* Note Input */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Lời Nhắn (Không bắt buộc)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Quà tặng, chơi vui vẻ nhé!"
                  className="w-full bg-gray-950/80 border border-gray-700/80 focus:border-emerald-500/80 rounded-2xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none transition-all"
                />
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
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs text-center space-y-1"
                >
                  <div className="flex items-center justify-center gap-1.5 font-black text-sm text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Giao Dịch Thành Công!</span>
                  </div>
                  <p className="text-[11px] text-gray-300">{successMsg}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenAuth) onOpenAuth();
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  Đăng nhập để chuyển tiền
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !numAmount || numAmount <= 0 || !recipientInput.trim()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/30 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Đang xử lý giao dịch...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        Xác Nhận Chuyển {numAmount > 0 ? `${numAmount.toLocaleString('vi-VN')} 🪙` : ''}
                      </span>
                    </>
                  )}
                </button>
              )}
            </form>
          )}

          {/* TAB 2: TRANSACTION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Giao dịch gần đây ({transactions.length})
                </span>
                <button
                  type="button"
                  onClick={loadHistory}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-800">
                {loadingHistory ? (
                  <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tải lịch sử...</span>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500 bg-gray-950/40 rounded-2xl border border-gray-800">
                    Chưa có giao dịch chuyển tiền nào.
                  </div>
                ) : (
                  transactions.map((tx) => {
                    const isSender = tx.senderId === user?.id;
                    const dateStr = new Date(tx.timestamp).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-gray-950/70 border border-gray-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isSender
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isSender ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">
                              {isSender ? (
                                <>
                                  Chuyển tới:{' '}
                                  <span className="text-gray-300">{tx.recipientDisplayName}</span>
                                </>
                              ) : (
                                <>
                                  Nhận từ:{' '}
                                  <span className="text-emerald-300">{tx.senderDisplayName}</span>
                                </>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {dateStr}
                              {tx.note && <span className="text-gray-400 italic"> • "{tx.note}"</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div
                            className={`font-black text-sm ${
                              isSender ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {isSender ? '-' : '+'}
                            {tx.amount.toLocaleString('vi-VN')} 🪙
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
