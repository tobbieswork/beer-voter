import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface PartyPinModalProps {
  eventId: string;
  eventTitle?: string;
  onSuccess: (pinToken: string) => void;
  onBack: () => void;
}

export default function PartyPinModal({ eventId, eventTitle, onSuccess, onBack }: PartyPinModalProps) {
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
    if (next.every(d => d !== '') && next.join('').length === 6) {
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
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.valid) {
        onSuccess(data.pinToken);
      } else {
        setError('Mật khẩu không đúng. Thử lại nhé!');
        setDigits(['', '', '', '', '']);
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
      <div className="modal-pub" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
        <h3 className="modal-title">Kèo Nhậu Riêng Tư</h3>
        <p className="modal-desc">
          {eventTitle ? <><strong>{eventTitle}</strong><br /></> : null}
          Nhập mật khẩu 6 số để vào kèo nhậu này.
        </p>

        {error && (
          <div className="modal-error-box animate-fade-in">
            ⚠️ {error}
          </div>
        )}

        <div className="pin-input-row">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="pin-digit-input"
              disabled={isChecking}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <div className="form-actions-modal" style={{ marginTop: '1.5rem', flexDirection: 'column', gap: '0.6rem' }}>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isChecking || digits.some(d => d === '')}
            style={{ width: '100%', justifyContent: 'center', minHeight: '48px' }}
          >
            {isChecking ? 'Đang kiểm tra...' : '🔓 Xác Nhận Mật Khẩu'}
          </button>
          <button
            className="btn-secondary"
            onClick={onBack}
            disabled={isChecking}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            ← Quay Lại
          </button>
        </div>
      </div>
    </div>
  );
}
