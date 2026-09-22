import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Coins, Briefcase, Check, X, Clock, Zap, Trophy 
} from 'lucide-react';
import { PublicUser } from '../../types/game';
import { useLang } from '../../i18n/LanguageContext';

interface WorkViewProps {
  user: PublicUser | null;
  socket: any; // Socket.IO client
  onBack: () => void;
  onBalanceUpdate: (newBalance: number) => void;
  onOpenAuth?: () => void;
}

const AntiCopyWord: React.FC<{ word: string }> = ({ word }) => {
  return (
    <div 
      className="select-none pointer-events-none w-full flex justify-center items-center py-4"
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <svg width="100%" height="80" viewBox={`0 0 ${Math.max(word.length * 40, 300)} 80`}>
        <text 
          x="50%" 
          y="50%" 
          dominantBaseline="middle" 
          textAnchor="middle" 
          fill="white" 
          fontSize="48" 
          fontWeight="bold"
          fontFamily="monospace"
        >
          {word}
        </text>
      </svg>
    </div>
  );
};

export const WorkView: React.FC<WorkViewProps> = ({ user, socket, onBack, onBalanceUpdate, onOpenAuth }) => {
  const { t, lang, setLang } = useLang();
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [wordLang, setWordLang] = useState<string>('vi');
  const [typedText, setTypedText] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [sessionEarned, setSessionEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<'success' | 'fail' | null>(null);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Update balance when user prop changes
  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  // Timers
  // Ref giữ bản requestWork mới nhất cho interval tự động gọi
  const requestWorkRef = useRef<() => void>(() => {});
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (expiresAt) {
        const remaining = Math.max(0, expiresAt - now);
        setTimeLeft(remaining);
        if (remaining === 0 && currentWord) {
          handleTimeout();
        }
      }

      if (cooldownUntil) {
        const remaining = Math.max(0, cooldownUntil - now);
        setCooldownLeft(remaining);
        if (remaining === 0) {
          setCooldownUntil(null);
          // Hết nghỉ → tự ra từ mới luôn, khỏi bấm Nhận Việc
          if (!currentWord && !result && user && socket) {
            setTimeout(() => requestWorkRef.current(), 300);
          }
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [expiresAt, cooldownUntil, currentWord, result, user, socket]);

  // Auto-focus input
  useEffect(() => {
    if (currentWord && !result) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentWord, result]);

  const requestWork = () => {
    if (!socket) {
      setMessage(t('work.noConn'));
      return;
    }
    if (!user) {
      setMessage(t('work.needLogin'));
      onOpenAuth?.();
      return;
    }
    setMessage('');
    let answered = false;
    const timer = setTimeout(() => {
      if (!answered) {
        setMessage(t('work.noRes'));
      }
    }, 8000);
    socket.emit('work:request-word', { userId: user.id, lang }, (res: any) => {
      answered = true;
      clearTimeout(timer);
      if (!res) {
        setMessage(t('work.noRes'));
        return;
      }
      if (res.success) {
        setCurrentWord(res.word);
        setWordLang(res.lang || lang);
        setExpiresAt(res.expiresAt);
        setTypedText('');
        setResult(null);
        setMessage('');
        if (res.cooldownRemaining) {
          setCooldownUntil(Date.now() + res.cooldownRemaining);
        }
      } else {
        setMessage(res.message || t('work.failSubmit'));
        if (res.cooldownRemaining) {
          setCooldownUntil(Date.now() + res.cooldownRemaining);
        }
      }
    });
  };

  // Giữ ref luôn trỏ bản requestWork mới nhất (lang, user, socket mới)
  useEffect(() => {
    requestWorkRef.current = requestWork;
  });

  const submitWord = useCallback((wordToSubmit: string) => {
    if (!socket) {
      setMessage(t('work.noConnSubmit'));
      return;
    }
    if (!user) {
      setMessage(t('work.needLogin'));
      onOpenAuth?.();
      return;
    }
    socket.emit('work:submit-word', { userId: user.id, word: wordToSubmit }, (res: any) => {
      if (!res) {
        setMessage(t('work.noResSubmit'));
        return;
      }
      if (res.success) {
        setResult('success');
        setSessionEarned(prev => prev + res.earned);
        setStreak(prev => prev + 1);
        setBalance(res.newBalance);
        onBalanceUpdate(res.newBalance);
        setMessage(`+${res.earned} 🪙`);
      } else {
        setResult('fail');
        setStreak(0);
        setMessage(res.message || 'Sai rồi!');
      }
      
      setCurrentWord(null);
      setExpiresAt(null);
      
      // Auto return to idle
      setTimeout(() => {
        setResult(null);
        setMessage('');
        // We simulate a basic 5s cooldown from server
        setCooldownUntil(Date.now() + 5000);
      }, 1500);
    });
  }, [socket, onBalanceUpdate, user, onOpenAuth]);

  const handleTimeout = useCallback(() => {
    setResult('fail');
    setStreak(0);
    setMessage('Hết giờ!');
    setCurrentWord(null);
    setExpiresAt(null);
    
    setTimeout(() => {
      setResult(null);
      setMessage('');
      setCooldownUntil(Date.now() + 5000);
    }, 1500);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedText(val);
    
    if (currentWord && val.trim().toLowerCase() === currentWord.toLowerCase()) {
      submitWord(val.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 'x') {
        e.preventDefault();
      }
    }
  };

  const renderColoredText = () => {
    if (!currentWord) return null;
    
    return (
      <div className="flex justify-center text-3xl font-mono mt-4 select-none pointer-events-none" onContextMenu={e => e.preventDefault()}>
        {currentWord.split('').map((char, index) => {
          let colorClass = 'text-gray-600';
          if (index < typedText.length) {
            colorClass = typedText[index].toLowerCase() === char.toLowerCase() 
              ? 'text-green-400' 
              : 'text-red-400';
          }
          return (
            <span key={index} className={`${colorClass} transition-colors duration-150`}>
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white flex flex-col font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur border-b border-gray-800 sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-800 rounded-full transition-colors flex items-center text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="text-blue-400 w-5 h-5" />
          {t('work.title')}
        </h1>
        
        <div className="flex items-center gap-2">
          {/* Toggle VI/EN ngay trong trung tâm — đổi cả giao diện lẫn bank từ */}
          <div className="flex items-center rounded-full border border-gray-700 bg-gray-800/80 p-1" title="Tiếng Việt / English — bank từ theo ngôn ngữ đang chọn">
            <button
              onClick={() => setLang('vi')}
              className={`px-3 py-1 rounded-full text-xs font-black transition-all ${lang === 'vi' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              🇻🇳 VI
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full text-xs font-black transition-all ${lang === 'en' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              🇬🇧 EN
            </button>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/80 px-4 py-1.5 rounded-full border border-gray-700">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-yellow-400">{balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 w-full mt-4">
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center">
          <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
            <Zap className="w-4 h-4 text-blue-400" /> {t('work.session')}
          </div>
          <div className="text-2xl font-bold text-white">{sessionEarned}</div>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center">
          <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
            <Zap className="w-4 h-4 text-orange-400" /> {t('work.streak')}
          </div>
          <div className="text-2xl font-bold text-white">{streak}</div>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center col-span-2 sm:col-span-1">
          <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
            <Trophy className="w-4 h-4 text-yellow-400" /> {t('work.totalEarned')}
          </div>
          <div className="text-2xl font-bold text-yellow-400">{sessionEarned} 🪙</div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 w-full">
        <AnimatePresence mode="wait">
          {!currentWord && !result && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-6"
            >
              {message && (
                <div className="max-w-md text-center text-sm font-semibold px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  {message}
                </div>
              )}
              {cooldownLeft > 0 ? (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="text-gray-400 flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 animate-pulse" />
                    {t('work.resting')}: {(cooldownLeft / 1000).toFixed(1)}s
                  </div>
                  <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: '100%' }}
                      animate={{ width: `${(cooldownLeft / 5000) * 100}%` }}
                      transition={{ duration: 0.1, ease: 'linear' }}
                    />
                  </div>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{ boxShadow: ['0px 0px 0px rgba(59,130,246,0)', '0px 0px 20px rgba(59,130,246,0.5)', '0px 0px 0px rgba(59,130,246,0)'] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  onClick={requestWork}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-12 rounded-full text-2xl shadow-lg border border-blue-400 transition-colors"
                >
                  {t('work.getWork')}
                </motion.button>
              )}
            </motion.div>
          )}

          {currentWord && !result && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex flex-col items-center gap-8 bg-gray-800/30 p-8 rounded-3xl border border-gray-700/50 backdrop-blur"
            >
              <div className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-300">
                {wordLang === 'en' ? '🇬🇧 English words' : '🇻🇳 Từ tiếng Việt'}
              </div>
              <AntiCopyWord word={currentWord} />
              
              <div className="w-full max-w-md h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                <motion.div 
                  className="h-full bg-yellow-500"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 15000) * 100}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>

              <div className="w-full max-w-md relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={typedText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full bg-gray-900 border-2 border-gray-700 focus:border-blue-500 rounded-xl px-6 py-4 text-center text-3xl font-mono text-white outline-none shadow-inner"
                  placeholder={t('work.typeHere')}
                  autoComplete="off"
                  spellCheck="false"
                />
                
                {renderColoredText()}
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="flex flex-col items-center justify-center gap-4"
            >
              {result === 'success' ? (
                <div className="flex flex-col items-center">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4"
                  >
                    <Check className="w-12 h-12" />
                  </motion.div>
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: -20, opacity: 1 }}
                    className="text-3xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                  >
                    {message}
                  </motion.div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4"
                  >
                    <X className="w-12 h-12" />
                  </motion.div>
                  <div className="text-xl font-bold text-red-400">
                    {message}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instructions Panel */}
      <div className="mt-auto p-4 w-full">
        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50 text-gray-400 text-sm text-center">
          <p className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            {t('work.howto')}
          </p>
        </div>
      </div>
    </div>
  );
};
