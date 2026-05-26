/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import BeerBubbles from './components/BeerBubbles';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import EventDetail from './components/EventDetail';
import GuestJoinModal from './components/GuestJoinModal';
import CreateEvent from './components/CreateEvent';

export interface User {
  id: string;
  nickname: string;
  realName: string;
  username: string;
  name: string;
  role?: string;
  email?: string;
}

export interface EventOption {
  id: string;
  eventId: string;
  type: 'datetime' | 'location' | 'beer';
  value: string;
  creatorId: string;
  creatorName: string;
  creatorNickname?: string;
  creatorRealName?: string;
  creatorUsername?: string;
  creatorEmail?: string;
  createdAt: string;
}

export interface EventVote {
  id: string;
  eventId: string;
  optionId: string;
  userId: string;
  userName: string;
  userNickname?: string;
  userRealName?: string;
  userUsername?: string;
  userEmail?: string;
  createdAt: string;
}

export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userRole?: string;
  content: string;
  userNickname?: string;
  userRealName?: string;
  userUsername?: string;
  userEmail?: string;
  createdAt: string;
}

export interface EventData {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  creatorNickname?: string;
  creatorRealName?: string;
  creatorUsername?: string;
  status: 'voting' | 'locked';
  createdAt: string;
  lockedAt?: string | null;
  finalDateTime?: string | null;
  finalLocation?: string | null;
  finalBeerStyle?: string | null;
  votesCount?: number;
  commentsCount?: number;
  optionsCount?: number;
  options?: EventOption[];
  votes?: EventVote[];
  comments?: EventComment[];
}

function getVisitedEvents(): string[] {
  try {
    const data = localStorage.getItem('beervote_visited_events');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function addVisitedEvent(eventId: string) {
  try {
    const events = getVisitedEvents();
    if (!events.includes(eventId)) {
      events.push(eventId);
      localStorage.setItem('beervote_visited_events', JSON.stringify(events));
    }
  } catch (e) {
    console.error(e);
  }
}

function getInitialUser(): User | null {
  const userId = localStorage.getItem('beervote_user_id');
  const nickname = localStorage.getItem('beervote_user_nickname');
  const realName = localStorage.getItem('beervote_user_real_name');
  const username = localStorage.getItem('beervote_user_username');
  if (userId && nickname) {
    return {
      id: userId,
      nickname,
      realName: realName || '',
      username: username || '',
      name: realName ? `${nickname} (${realName})` : nickname
    };
  }
  return null;
}

export default function App() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [visitedEventIds, setVisitedEventIds] = useState<string[]>(() => getVisitedEvents());
  
  const [currentEventId, setCurrentEventId] = useState<string | null>(() => {
    // Đọc eventId từ URL lúc khởi chạy
    const params = new URLSearchParams(window.location.search);
    return params.get('eventId') || null;
  });
  
  const [currentEventData, setCurrentEventData] = useState<EventData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getInitialUser());
  
  // Trạng thái Modal
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(() => {
    const user = getInitialUser();
    const params = new URLSearchParams(window.location.search);
    return params.get('eventId') ? !user : false;
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [triggerCreateAfterJoin, setTriggerCreateAfterJoin] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectWsRef = useRef<(() => void) | null>(null);

  // 1. Tự động đồng bộ URL (Router mini)
  const navigateToEvent = (eventId: string | null) => {
    setCurrentEventId(eventId);
    const newUrl = eventId 
      ? `${window.location.origin}${window.location.pathname}?eventId=${eventId}`
      : `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ eventId }, '', newUrl);

    // Sync modal state on navigation
    if (eventId && !currentUser) {
      setIsJoinModalOpen(true);
    } else {
      setIsJoinModalOpen(false);
    }
  };

  // Lắng nghe nút Back/Forward của trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const eventId = params.get('eventId') || null;
      setCurrentEventId(eventId);
      
      if (eventId && !currentUser) {
        setIsJoinModalOpen(true);
      } else {
        setIsJoinModalOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  // 2. Gọi API lấy dữ liệu ban đầu
  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Không thể gọi API lấy danh sách kèo:', error);
    }
  }, []);

  const fetchEventDetail = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const response = await fetch(`/api/events/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentEventData(data);
      }
    } catch (error) {
      console.error(`Không thể gọi API lấy chi tiết kèo ${id}:`, error);
    }
  }, []);

  // Tải dữ liệu khi chuyển trang
  useEffect(() => {
    if (currentEventId) {
      addVisitedEvent(currentEventId);
      setVisitedEventIds(getVisitedEvents());
      fetchEventDetail(currentEventId);
      // Đăng ký WebSocket JOIN_EVENT
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'JOIN_EVENT', eventId: currentEventId }));
      }
    } else {
      setVisitedEventIds(getVisitedEvents());
      fetchEvents();
      setCurrentEventData(null);
      // Đăng ký WebSocket JOIN_DASHBOARD
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'JOIN_DASHBOARD' }));
      }
    }
  }, [currentEventId, fetchEventDetail, fetchEvents]);

  // 3. Thiết lập Kết nối WebSockets Real-time
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) return;

    // Tự động định vị địa chỉ WebSocket server dựa trên hostname và port hiện tại
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl: string;
    if (window.location.port === '5173') {
      // Trong môi trường dev: React chạy ở 5173, WebSocket chạy ở 3001
      wsUrl = `${protocol}//${window.location.hostname}:3001`;
    } else {
      // Trong môi trường production / LAN share qua 3001: WebSockets chạy chung cổng với web
      wsUrl = `${protocol}//${window.location.host}`;
    }

    console.log(`Đang kết nối WebSockets tới: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Đã kết nối WebSockets thành công tới BeerVote Server!');
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

      // Đăng ký phòng khi kết nối mở
      if (currentEventId) {
        ws.send(JSON.stringify({ type: 'JOIN_EVENT', eventId: currentEventId }));
      } else {
        ws.send(JSON.stringify({ type: 'JOIN_DASHBOARD' }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Nhận WebSocket Event:', message.type);

        if (message.type === 'EVENT_UPDATED') {
          if (message.eventId === currentEventId) {
            setCurrentEventData(message.eventData);
          }
        } else if (message.type === 'DASHBOARD_UPDATED') {
          if (!currentEventId) {
            setEvents(message.events);
          }
        }
      } catch (err) {
        console.error('Lỗi phân tích tin nhắn WebSocket:', err);
      }
    };

    ws.onclose = () => {
      console.log('Kết nối WebSocket đã bị ngắt. Đang thử kết nối lại sau 3s...');
      wsRef.current = null;
      reconnectTimerRef.current = setTimeout(() => {
        if (connectWsRef.current) {
          connectWsRef.current();
        }
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('Lỗi kết nối WebSocket:', err);
      ws.close();
    };
  }, [currentEventId]);

  useEffect(() => {
    connectWsRef.current = connectWebSocket;
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connectWebSocket]);

  // 4. Thao tác gửi dữ liệu qua WebSockets
  const handleVoteToggle = (eventId: string, optionId: string, userId?: string, userName?: string) => {
    if (!currentUser) {
      setIsJoinModalOpen(true);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'VOTE_TOGGLE',
        eventId,
        optionId,
        userId: userId || currentUser.id,
        userName: userName || currentUser.name,
        userNickname: currentUser.nickname || userName || currentUser.name,
        userRealName: currentUser.realName || '',
        userUsername: currentUser.username || '',
        userEmail: currentUser.username || ''
      }));
    } else {
      alert('Mất kết nối WebSocket tới Server. Vui lòng đợi trong giây lát!');
    }
  };

  const handleAddOption = (optionData: any) => {
    if (!currentUser) {
      setIsJoinModalOpen(true);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ADD_OPTION',
        ...optionData,
        creatorId: currentUser.id,
        creatorName: currentUser.name,
        userNickname: currentUser.nickname || currentUser.name,
        userRealName: currentUser.realName || '',
        userUsername: currentUser.username || '',
        userEmail: currentUser.username || ''
      }));
    }
  };

  const handleAddComment = (commentData: any) => {
    if (!currentUser) {
      setIsJoinModalOpen(true);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ADD_COMMENT',
        ...commentData,
        userId: currentUser.id,
        userName: currentUser.name,
        userNickname: currentUser.nickname || currentUser.name,
        userRealName: currentUser.realName || '',
        userUsername: currentUser.username || '',
        userEmail: currentUser.username || ''
      }));
    }
  };

  const handleLockEvent = (lockData: any) => {
    if (!currentUser) {
      setIsJoinModalOpen(true);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'LOCK_EVENT',
        ...lockData,
        userId: currentUser.id,
        userName: currentUser.name,
        userNickname: currentUser.nickname || currentUser.name,
        userRealName: currentUser.realName || '',
        userUsername: currentUser.username || '',
        userEmail: currentUser.username || ''
      }));
    }
  };

  // Xử lý mở Modal tạo kèo nhậu (kiểm tra hồ sơ)
  const handleCreateEventClick = () => {
    if (!currentUser) {
      setTriggerCreateAfterJoin(true);
      setIsJoinModalOpen(true);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  // Xử lý nộp biệt danh của người dùng
  const handleGuestJoinSubmit = ({ nickname, realName, username }: { nickname: string; realName: string; username: string }) => {
    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    // Lưu thông tin người dùng vào localStorage thay vì sessionStorage
    localStorage.setItem('beervote_user_id', userId);
    localStorage.setItem('beervote_user_nickname', nickname);
    localStorage.setItem('beervote_user_real_name', realName);
    localStorage.setItem('beervote_user_username', username);
    
    const user: User = {
      id: userId,
      nickname,
      realName,
      username,
      name: realName ? `${nickname} (${realName})` : nickname
    };
    setCurrentUser(user);
    setIsJoinModalOpen(false);

    if (triggerCreateAfterJoin) {
      setTriggerCreateAfterJoin(false);
      setIsCreateModalOpen(true);
    }
  };

  // Trích xuất danh sách các biệt danh đang được dùng trong kèo
  const getUsedNicknames = (eventData: EventData | null) => {
    if (!eventData) return [];
    const names = new Set<string>();
    
    if (eventData.options) {
      eventData.options.forEach(opt => {
        if (opt.creatorNickname) {
          names.add(opt.creatorNickname);
        }
      });
    }
    
    if (eventData.votes) {
      eventData.votes.forEach(v => {
        if (v.userNickname) {
          names.add(v.userNickname);
        }
      });
    }
    
    if (eventData.comments) {
      eventData.comments.forEach(c => {
        if (c.userNickname) {
          names.add(c.userNickname);
        }
      });
    }
    
    return Array.from(names);
  };

  return (
    <>
      {/* Background sủi bọt bia cực chill */}
      <BeerBubbles />

      {/* Header điều khiển và thông tin người dùng */}
      <Header 
        currentUser={currentUser}
        onGoHome={() => navigateToEvent(null)}
      />

      {/* Phần nội dung chính của sòng nhậu */}
      <main className="main-content">
        {currentEventId ? (
          <EventDetail 
            eventId={currentEventId}
            eventData={currentEventData}
            currentUser={currentUser}
            onBack={() => navigateToEvent(null)}
            onVoteToggle={handleVoteToggle}
            onAddOption={handleAddOption}
            onAddComment={handleAddComment}
            onLockEvent={handleLockEvent}
          />
        ) : (
          <Dashboard 
            events={events.filter(evt => visitedEventIds.includes(evt.id))}
            onSelectEvent={navigateToEvent}
            onCreateEventClick={handleCreateEventClick}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Modal yêu cầu nhập biệt danh và định danh khi vào sòng hoặc tạo kèo */}
      <GuestJoinModal 
        isOpen={isJoinModalOpen}
        onSubmit={handleGuestJoinSubmit}
        usedNicknames={currentEventData ? getUsedNicknames(currentEventData) : []}
      />

      {/* Modal tạo Kèo mới dành cho mọi người */}
      <CreateEvent 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSuccess={(newEventId) => {
          fetchEvents(); // Tải lại danh sách
          navigateToEvent(newEventId); // Chuyển thẳng tới chi tiết kèo mới tạo
        }}
        currentUser={currentUser}
      />
    </>
  );
}
