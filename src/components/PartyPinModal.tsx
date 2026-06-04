import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t, i18n } = useTranslation();
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
        setError(t('party_pin.error_invalid'));
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } catch {
      setError(
        i18n.language === 'en'
          ? 'Connection error. Please try again!'
          : 'Lỗi kết nối. Vui lòng thử lại!'
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = () => {
    const pin = digits.join('');
    if (pin.length !== 6) {
      setError(
        i18n.language === 'en' ? 'Please enter all 6 digits!' : 'Vui lòng nhập đủ 6 chữ số!'
      );
      return;
    }
    verifyPin(pin);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onBack();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-pub max-w-[400px] text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-modal-title"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onBack}
          aria-label={t('party_pin.cancel')}
        >
          &times;
        </button>
        <div className="modal-pub-body">
          <div className="pin-modal-header">🔐</div>
          <h3 className="modal-title" id="pin-modal-title">
            {t('party_pin.title')}
          </h3>
          <p className="modal-desc">
            {eventTitle ? (
              <>
                <strong>{eventTitle}</strong>
                <br />
                {t('party_pin.subtitle')}
              </>
            ) : (
              t('party_pin.subtitle')
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
                aria-label={`Digit ${i + 1} of 6-digit PIN`}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              className="btn-primary w-full justify-center min-h-[48px]"
              onClick={handleSubmit}
              disabled={isChecking || digits.some((d) => d === '')}
            >
              {isChecking
                ? i18n.language === 'en'
                  ? 'Verifying...'
                  : 'Đang kiểm tra...'
                : `🔓 ${t('party_pin.submit')}`}
            </button>
            <button
              className="btn-secondary w-full justify-center"
              onClick={onBack}
              disabled={isChecking}
            >
              {t('party_pin.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
