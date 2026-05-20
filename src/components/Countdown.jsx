import { useState, useEffect } from 'react';

const FUNNY_SLOGANS = [
  'Gan của bạn đã sẵn sàng chưa? 🔥',
  'Nhớ đến đúng giờ, trễ 1 phút phạt 1 ly! ⏰',
  'Lên đồ đẹp, chuẩn bị cạn ly tới bến! 🍻',
  'Kèo này không say không về nha anh em! 🤫',
  'Đứa nào bàn lùi hoặc bùng kèo làm cún! 🐶',
  'Họp mặt đông đủ, cạn ly rực rỡ! 🥂',
];

function calculateTimeLeft(targetDate) {
  const difference = +new Date(targetDate) - +new Date();

  if (difference > 0) {
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  return { isOver: true };
}

export default function Countdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));
  const [slogan, setSlogan] = useState(() => {
    return FUNNY_SLOGANS[Math.floor(Math.random() * FUNNY_SLOGANS.length)];
  });

  useEffect(() => {
    // Cập nhật đếm ngược mỗi giây

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    // Thay đổi slogan mỗi 10 giây
    const sloganTimer = setInterval(() => {
      const randomSlogan = FUNNY_SLOGANS[Math.floor(Math.random() * FUNNY_SLOGANS.length)];
      setSlogan(randomSlogan);
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(sloganTimer);
    };
  }, [targetDate]);

  const padZero = (num) => {
    return String(num).padStart(2, '0');
  };

  if (timeLeft.isOver) {
    return (
      <div className="countdown-container card-pub" style={{ border: '1px solid var(--accent-gold)' }}>
        <div className="countdown-box-title">🍻 ĐÃ ĐẾN GIỜ NHẬU! 🍻</div>
        <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-gold)', margin: '1rem 0' }}>
          ZÔ ZÔ ZÔ! ANH EM LÊN ĐỒ VÀ CẠN LY THÔI!
        </div>
        <p className="countdown-slogan">Đứa nào chưa đến thì giục giã mau lên nha! 🚀</p>
      </div>
    );
  }

  return (
    <div className="countdown-container card-pub">
      <div className="countdown-box-title">⏳ Đếm Ngược Đến Giờ G ⏳</div>
      
      <div className="countdown-grid">
        <div className="countdown-segment">
          <div className="countdown-digit">{padZero(timeLeft.days || 0)}</div>
          <span className="countdown-label">Ngày</span>
        </div>
        <div className="countdown-segment">
          <div className="countdown-digit">{padZero(timeLeft.hours || 0)}</div>
          <span className="countdown-label">Giờ</span>
        </div>
        <div className="countdown-segment">
          <div className="countdown-digit">{padZero(timeLeft.minutes || 0)}</div>
          <span className="countdown-label">Phút</span>
        </div>
        <div className="countdown-segment">
          <div className="countdown-digit">{padZero(timeLeft.seconds || 0)}</div>
          <span className="countdown-label">Giây</span>
        </div>
      </div>

      <p className="countdown-slogan">{slogan}</p>
    </div>
  );
}

