import { useState, CSSProperties } from 'react';

interface Bubble {
  id: number;
  style: CSSProperties;
}

export default function BeerBubbles() {
  const [bubbles] = useState<Bubble[]>(() => {
    // Khởi tạo danh sách bong bóng ngẫu nhiên
    const bubbleCount = 35;
    return Array.from({ length: bubbleCount }).map((_, index) => {
      const size = Math.random() * 12 + 4; // Kích thước từ 4px đến 16px
      const left = Math.random() * 100; // Vị trí ngang % từ 0 đến 100
      const delay = Math.random() * 8; // Độ trễ từ 0 đến 8s
      const duration = Math.random() * 10 + 6; // Thời gian bay từ 6 đến 16s

      return {
        id: index,
        style: {
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
        },
      };
    });
  });

  return (
    <div className="fixed inset-0 -z-20 overflow-hidden bg-gradient-to-b from-[#07080a] via-[#11131a] to-[#1c1304]">
      <div className="absolute inset-x-0 bottom-0 -z-10 h-full w-full pointer-events-none">
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className="absolute bottom-[-20px] rounded-full bg-radial-gradient from-[rgba(255,200,0,0.4)] via-[rgba(255,176,0,0.05)] to-transparent animate-float-up shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),0_2px_10px_rgba(255,176,0,0.1)]"
            style={bubble.style}
          />
        ))}
      </div>
    </div>
  );
}
