import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface PartyPinModalProps {
  eventId: string;
  eventTitle?: string;
  onSuccess: (pinToken: string) => void;
  onBack: () => void;
}

export default function PartyPinModal({
  eventId,
  eventTitle,
  onSuccess,
  onBack,
}: PartyPinModalProps) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setError('');
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== '') && next.join('').length === 6) {
      verifyPin(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
      verifyPin(pasted);
    }
    e.preventDefault();
  };

  const verifyPin = async (pin: string) => {
    setIsChecking(true);
    setError('');
    try {
      const res = await fetch(`/api/events/${eventId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.valid) {
        onSuccess(data.pinToken);
      } else {
        setError('Mật khẩu không đúng. Thử lại nhé!');
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại!');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = () => {
    const pin = digits.join('');
    if (pin.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số!');
      return;
    }
    verifyPin(pin);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-pub max-w-[400px] text-center">
        <div className="pin-modal-header">🔐</div>
        <h3 className="modal-title">Kèo Nhậu Riêng Tư</h3>
        <p className="modal-desc">
          {eventTitle ? (
            <>
              <strong>{eventTitle}</strong>
              <br />
              Kèo này được bảo vệ bởi mật khẩu.
            </>
          ) : (
            'Nhập mật khẩu 6 số để vào kèo nhậu này.'
          )}
        </p>

        {error && <div className="modal-error-box mb-4 flex items-center gap-2">⚠️ {error}</div>}

        <div className="mb-5 mt-5 flex justify-center gap-2.5">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="h-14 w-12 rounded-xl border-2 border-glass bg-white/5 text-3xl font-bold text-text-primary text-center outline-none transition-all duration-200 focus:border-gold focus:bg-gold/5 focus:shadow-[0_0_0_3px_rgba(255,176,0,0.15)] disabled:opacity-50"
              disabled={isChecking}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            className="btn-primary w-full justify-center min-h-[48px]"
            onClick={handleSubmit}
            disabled={isChecking || digits.some((d) => d === '')}
          >
            {isChecking ? 'Đang kiểm tra...' : '🔓 Xác Nhận Mật Khẩu'}
          </button>
          <button
            className="btn-secondary w-full justify-center"
            onClick={onBack}
            disabled={isChecking}
          >
            ← Quay Lại
          </button>
        </div>
      </div>
    </div>
  );
}
