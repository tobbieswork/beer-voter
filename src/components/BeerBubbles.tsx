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
        }
      };
    });
  });

  return (
    <div className="beer-bg">
      <div className="bubbles-container">
        {bubbles.map(bubble => (
          <div 
            key={bubble.id} 
            className="bubble" 
            style={bubble.style}
          />
        ))}
      </div>
    </div>
  );
}
