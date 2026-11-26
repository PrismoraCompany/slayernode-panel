import React, { useState, useRef, useEffect } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { GlassButton } from '../ui/GlassButton';
import { ShieldCheck } from 'lucide-react';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<boolean>;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onClose,
  onVerify,
}) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setError(null);
      setTimeout(() => inputsRef.current[0]?.focus(), 150);
    }
  }, [isOpen]);

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[index] = val.slice(-1);
    setDigits(next);

    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (next.every(d => d !== '')) {
      handleComplete(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleComplete = async (code: string) => {
    setIsLoading(true);
    setError(null);
    const ok = await onVerify(code);
    setIsLoading(false);
    if (!ok) {
      setError('Invalid 2FA code. Please verify your authenticator app.');
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } else {
      onClose();
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Two-Factor Authentication"
      description="Enter the 6-digit TOTP verification code from your authenticator app."
      maxWidth="sm"
    >
      <div className="flex flex-col items-center gap-6 py-2">
        <div className="p-3.5 rounded-2xl bg-sky-500/15 border border-sky-400/30 text-sky-400">
          <ShieldCheck className="w-8 h-8" />
        </div>

        {/* 6 Digit Segmented Inputs */}
        <div className="flex items-center justify-center gap-2.5">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputsRef.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              className="w-11 h-13 text-center text-xl font-bold font-mono rounded-xl bg-slate-900/80 border border-white/20 text-white focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-all"
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-rose-400 font-medium text-center animate-shake">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 w-full">
          <GlassButton variant="ghost" className="w-1/2" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="accent"
            className="w-1/2"
            isLoading={isLoading}
            onClick={() => handleComplete(digits.join(''))}
            disabled={digits.some(d => !d)}
          >
            Verify
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
};
