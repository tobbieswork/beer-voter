import { useState, useEffect } from 'react';

const FUNNY_SLOGANS = [
  'Gan của bạn đã sẵn sàng chưa? 🔥',
  'Nhớ đến đúng giờ, trễ 1 phút phạt 1 ly! ⏰',
  'Lên đồ đẹp, chuẩn bị cạn ly tới bến! 🍻',
  'Kèo này không say không về nha anh em! 🤫',
  'Đứa nào bàn lùi hoặc bùng kèo làm cún! 🐶',
  'Họp mặt đông đủ, cạn ly rực rỡ! 🥂',
];

interface TimeLeft {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  isOver?: boolean;
}

function calculateTimeLeft(targetDate: string): TimeLeft {
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

interface CountdownProps {
  targetDate: string;
}

export default function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));
  const [slogan, setSlogan] = useState<string>(() => {
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

  const padZero = (num: number) => {
    return String(num).padStart(2, '0');
  };

  if (timeLeft.isOver) {
    return (
      <div className="card-pub border-gold">
        <div className="mb-4 text-center text-gold uppercase tracking-wider text-sm font-bold">
          🍻 ĐÃ ĐẾN GIỜ NHẬU! 🍻
        </div>
        <div className="my-4 text-center text-xl font-extrabold text-gold">
          ZÔ ZÔ ZÔ! ANH EM LÊN ĐỒ VÀ CẠN LY THÔI!
        </div>
        <p className="pt-2 text-center text-[0.9rem] italic text-text-secondary border-t border-dashed border-white/5">
          Chưa ai đến thì giục giã mau lên nha! 🚀
        </p>
      </div>
    );
  }

  return (
    <div className="card-pub">
      <div className="mb-4 text-center text-gold uppercase tracking-wider text-[0.85rem] font-bold">
        ⏳ Đếm Ngược Đến Giờ Nhậu ⏳
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-full aspect-square text-2xl font-extrabold text-white border border-white/5 border-b-2 border-b-gold rounded-lg bg-gradient-to-b from-[#1f222a] to-[#0d0f12] shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
            {padZero(timeLeft.days || 0)}
          </div>
          <span className="mt-1.5 text-[0.7rem] font-semibold uppercase text-text-secondary">
            Ngày
          </span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-full aspect-square text-2xl font-extrabold text-white border border-white/5 border-b-2 border-b-gold rounded-lg bg-gradient-to-b from-[#1f222a] to-[#0d0f12] shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
            {padZero(timeLeft.hours || 0)}
          </div>
          <span className="mt-1.5 text-[0.7rem] font-semibold uppercase text-text-secondary">
            Giờ
          </span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-full aspect-square text-2xl font-extrabold text-white border border-white/5 border-b-2 border-b-gold rounded-lg bg-gradient-to-b from-[#1f222a] to-[#0d0f12] shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
            {padZero(timeLeft.minutes || 0)}
          </div>
          <span className="mt-1.5 text-[0.7rem] font-semibold uppercase text-text-secondary">
            Phút
          </span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-full aspect-square text-2xl font-extrabold text-white border border-white/5 border-b-2 border-b-gold rounded-lg bg-gradient-to-b from-[#1f222a] to-[#0d0f12] shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
            {padZero(timeLeft.seconds || 0)}
          </div>
          <span className="mt-1.5 text-[0.7rem] font-semibold uppercase text-text-secondary">
            Giây
          </span>
        </div>
      </div>

      <p className="pt-2 text-center text-[0.9rem] italic text-text-secondary border-t border-dashed border-white/5">
        {slogan}
      </p>
    </div>
  );
}
