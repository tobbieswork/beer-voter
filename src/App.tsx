/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import BeerBubbles from './components/BeerBubbles';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import EventDetail from './components/EventDetail';
import GuestJoinModal from './components/GuestJoinModal';
import CreateEvent from './components/CreateEvent';
import PartyPinModal from './components/PartyPinModal';

import { User, EventData, OptionPayload, CommentPayload, LockPayload } from './types';

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

// Pin token storage helpers
function getPinToken(eventId: string): string | null {
  try {
    return localStorage.getItem(`beervote_pin_token_${eventId}`);
  } catch {
    return null;
  }
}

function savePinToken(eventId: string, token: string) {
  try {
    localStorage.setItem(`beervote_pin_token_${eventId}`, token);
  } catch {
    // Storage full, ignore
  }
}

function clearPinToken(eventId: string) {
  try {
    localStorage.removeItem(`beervote_pin_token_${eventId}`);
  } catch {
    // Ignore
  }
}

function getInitialUser(): User | null {
  const userId = localStorage.getItem('beervote_user_id');
  const nickname = localStorage.getItem('beervote_user_nickname');
  const realName = localStorage.getItem('beervote_user_real_name');
  const username = localStorage.getItem('beervote_user_username');
  const avatar = localStorage.getItem('beervote_user_avatar') || undefined;
  const googleId = localStorage.getItem('beervote_user_google_id') || undefined;
  const googleToken = localStorage.getItem('beervote_user_google_token') || undefined;
  const githubId = localStorage.getItem('beervote_user_github_id') || undefined;
  const githubToken = localStorage.getItem('beervote_user_github_token') || undefined;
  const authMethod = (localStorage.getItem('beervote_user_auth_method') || 'guest') as
    | 'google'
    | 'guest'
    | 'github';
  if (userId && nickname) {
    return {
      id: userId,
      nickname,
      realName: realName || '',
      username: username || '',
      name: realName ? `${nickname} (${realName})` : nickname,
      avatar,
      googleId,
      githubId,
      authMethod,
      googleToken,
      githubToken,
    };
  }
  return null;
}

function saveUserToStorage(user: User) {
  localStorage.setItem('beervote_user_id', user.id);
  localStorage.setItem('beervote_user_nickname', user.nickname);
  localStorage.setItem('beervote_user_real_name', user.realName);
  localStorage.setItem('beervote_user_username', user.username);
  if (user.avatar) localStorage.setItem('beervote_user_avatar', user.avatar);
  else localStorage.removeItem('beervote_user_avatar');
  if (user.googleId) localStorage.setItem('beervote_user_google_id', user.googleId);
  else localStorage.removeItem('beervote_user_google_id');
  if (user.googleToken) localStorage.setItem('beervote_user_google_token', user.googleToken);
  else localStorage.removeItem('beervote_user_google_token');
  if (user.githubId) localStorage.setItem('beervote_user_github_id', user.githubId);
  else localStorage.removeItem('beervote_user_github_id');
  if (user.githubToken) localStorage.setItem('beervote_user_github_token', user.githubToken);
  else localStorage.removeItem('beervote_user_github_token');
  localStorage.setItem('beervote_user_auth_method', user.authMethod || 'guest');
}

function clearUserFromStorage() {
  [
    'beervote_user_id',
    'beervote_user_nickname',
    'beervote_user_real_name',
    'beervote_user_username',
    'beervote_user_avatar',
    'beervote_user_google_id',
    'beervote_user_auth_method',
    'beervote_user_google_token',
    'beervote_user_github_id',
    'beervote_user_github_token',
  ].forEach((k) => localStorage.removeItem(k));
}

export default function App() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [_visitedEventIds, setVisitedEventIds] = useState<string[]>(() => getVisitedEvents());

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
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }, []);

  // Check authData on startup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authData = params.get('authData');
    if (authData) {
      try {
        const decodedUser = JSON.parse(decodeURIComponent(escape(atob(authData))));
        if (decodedUser && decodedUser.id && decodedUser.nickname) {
          saveUserToStorage(decodedUser);
          setCurrentUser(decodedUser);

          // Clean the authData query param while preserving others like eventId
          params.delete('authData');
          const cleanSearch = params.toString();
          const newUrl = cleanSearch
            ? `${window.location.origin}${window.location.pathname}?${cleanSearch}`
            : `${window.location.origin}${window.location.pathname}`;

          window.history.replaceState({}, '', newUrl);
          showToast('🍻 Đăng nhập qua mã QR thành công!');
          setIsJoinModalOpen(false);
        }
      } catch (e) {
        console.error('Lỗi giải mã QR Auth:', e);
      }
    }

    const googleLogin = params.get('googleLogin');
    if (googleLogin === 'true') {
      fetch('/api/auth/session')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch session');
          return res.json();
        })
        .then((data) => {
          const { sub, email, name, given_name, picture, credential } = data;
          if (sub && credential) {
            const displayName = given_name || name || email;
            const realName = name || given_name || '';
            const user: User = {
              id: 'google_' + sub,
              nickname: displayName,
              realName,
              username: email,
              name: realName ? `${displayName} (${realName})` : displayName,
              email,
              avatar: picture,
              googleId: sub,
              authMethod: 'google',
              googleToken: credential,
            };
            saveUserToStorage(user);
            setCurrentUser(user);

            // Clean the query parameters
            params.delete('googleLogin');
            const cleanSearch = params.toString();
            const newUrl = cleanSearch
              ? `${window.location.origin}${window.location.pathname}?${cleanSearch}`
              : `${window.location.origin}${window.location.pathname}`;

            window.history.replaceState({}, '', newUrl);
            showToast('🍻 Đăng nhập Google thành công!');
            setIsJoinModalOpen(false);
          }
        })
        .catch((err) => {
          console.error('Lỗi xử lý Google redirect callback:', err);
        });
    }

    const githubLogin = params.get('githubLogin');
    if (githubLogin === 'true') {
      fetch('/api/auth/session')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch session');
          return res.json();
        })
        .then((data) => {
          const { sub, email, name, login, picture, credential, authMethod } = data;
          if (sub && credential && authMethod === 'github') {
            const displayName = name || login || email || `GitHub User ${sub}`;
            const realName = name || '';
            const user: User = {
              id: 'github_' + sub,
              nickname: displayName,
              realName,
              username: login || email || '',
              name: realName ? `${displayName} (${realName})` : displayName,
              email,
              avatar: picture,
              githubId: sub,
              authMethod: 'github',
              githubToken: credential,
            };
            saveUserToStorage(user);
            setCurrentUser(user);

            // Clean the query parameters
            params.delete('githubLogin');
            const cleanSearch = params.toString();
            const newUrl = cleanSearch
              ? `${window.location.origin}${window.location.pathname}?${cleanSearch}`
              : `${window.location.origin}${window.location.pathname}`;

            window.history.replaceState({}, '', newUrl);
            showToast('🍻 Đăng nhập GitHub thành công!');
            setIsJoinModalOpen(false);
          }
        })
        .catch((err) => {
          console.error('Lỗi xử lý GitHub redirect callback:', err);
        });
    }
  }, [showToast]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectWsRef = useRef<(() => void) | null>(null);

  // 1. Tự động đồng bộ URL (Router mini)
  const navigateToEvent = useCallback(
    (eventId: string | null) => {
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
    },
    [currentUser]
  );

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

  const fetchEventDetail = useCallback(
    async (id: string) => {
      try {
        const pinToken = getPinToken(id);
        const creatorToken = localStorage.getItem(`beervote_creator_token_${id}`);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (pinToken) {
          headers['X-Pin-Token'] = pinToken;
        }
        if (creatorToken) {
          headers['X-Creator-Token'] = creatorToken;
        }
        if (currentUser?.id) {
          headers['X-User-Id'] = currentUser.id;
        }
        if (currentUser?.googleToken) {
          headers['X-Google-Token'] = currentUser.googleToken;
        }
        if (currentUser?.githubToken) {
          headers['X-Github-Token'] = currentUser.githubToken;
        }
        const response = await fetch(`/api/events/${id}`, { headers });
        if (response.ok) {
          const data = await response.json();
          setCurrentEventData(data);
          // If we are verified as creator via userId/Google on another device, send JOIN_EVENT now that data is loaded
          const isCreator = !!creatorToken || (currentUser && currentUser.id === data.creatorId);
          if (
            isCreator &&
            !creatorToken &&
            wsRef.current &&
            wsRef.current.readyState === WebSocket.OPEN
          ) {
            wsRef.current.send(
              JSON.stringify({
                type: 'JOIN_EVENT',
                eventId: id,
                pinToken,
                creatorToken,
                userId: currentUser?.id,
                googleToken: currentUser?.googleToken,
                githubToken: currentUser?.githubToken,
              })
            );
          }
        } else if (response.status === 403) {
          clearPinToken(id);
          setShowPinModal(true);
        }
      } catch (error) {
        console.error(`Không thể gọi API lấy chi tiết kèo ${id}:`, error);
      }
    },
    [currentUser]
  );

  // Tải dữ liệu khi chuyển trang
  useEffect(() => {
    if (currentEventId) {
      // Check for creatorToken query parameter to securely sync creator status
      const urlParams = new URLSearchParams(window.location.search);
      const urlCreatorToken = urlParams.get('creatorToken');
      if (urlCreatorToken) {
        localStorage.setItem(`beervote_creator_token_${currentEventId}`, urlCreatorToken);
        // Clean URL to keep it secure
        urlParams.delete('creatorToken');
        const newSearch = urlParams.toString();
        const newPath =
          window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
        window.history.replaceState(null, '', newPath);
      }

      addVisitedEvent(currentEventId);
      setVisitedEventIds(getVisitedEvents());
      const pinToken = getPinToken(currentEventId);
      const creatorToken = localStorage.getItem(`beervote_creator_token_${currentEventId}`);
      fetchEventDetail(currentEventId);
      // Only send JOIN_EVENT immediately if we already have a valid PIN token or are the creator.
      // Otherwise, defer to PIN gating effect or ws.onopen handler.
      const isCreator = !!creatorToken;
      if ((pinToken || isCreator) && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'JOIN_EVENT',
            eventId: currentEventId,
            pinToken,
            creatorToken,
            userId: currentUser?.id,
            googleToken: currentUser?.googleToken,
            githubToken: currentUser?.githubToken,
          })
        );
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
  }, [currentEventId, fetchEventDetail, fetchEvents, currentUser]);

  // PIN gating: show PIN modal if event is protected and token not present
  useEffect(() => {
    if (!currentEventId || !currentEventData) {
      setShowPinModal(false);
      return;
    }
    if (currentEventData.hasPin) {
      const isCreatorTokenMatched = !!localStorage.getItem(
        `beervote_creator_token_${currentEventId}`
      );
      const isCreatorIdMatched = currentUser && currentUser.id === currentEventData.creatorId;
      const isCreator = isCreatorTokenMatched || isCreatorIdMatched;
      const token = getPinToken(currentEventId);
      setShowPinModal(!token && !isCreator);
    } else {
      setShowPinModal(false);
    }
  }, [currentEventId, currentEventData, currentUser]);

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
        ws.send(
          JSON.stringify({
            type: 'JOIN_EVENT',
            eventId: currentEventId,
            pinToken: getPinToken(currentEventId),
            creatorToken: localStorage.getItem(`beervote_creator_token_${currentEventId}`),
            userId: currentUser?.id,
            googleToken: currentUser?.googleToken,
            githubToken: currentUser?.githubToken,
          })
        );
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
        } else if (message.type === 'EVENT_DELETED') {
          setEvents((prev) => prev.filter((e) => e.id !== message.eventId));
          if (message.eventId === currentEventId) {
            navigateToEvent(null);
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
  }, [
    currentEventId,
    navigateToEvent,
    currentUser?.id,
    currentUser?.googleToken,
    currentUser?.githubToken,
  ]);

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
  const handleVoteToggle = (
    eventId: string,
    optionId: string,
    userId?: string,
    userName?: string
  ) => {
    if (!currentUser) {
      setIsJoinModalOpen(true);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'VOTE_TOGGLE',
          eventId,
          optionId,
          userId: userId || currentUser.id,
          userName: userName || currentUser.name,
          userNickname: currentUser.nickname || userName || currentUser.name,
          userRealName: currentUser.realName || '',
          userUsername: currentUser.username || '',
          userEmail: currentUser.email || currentUser.username || '',
          pinToken: getPinToken(eventId) || '',
        })
      );
    } else {
      alert('Mất kết nối WebSocket tới Server. Vui lòng đợi trong giây lát!');
    }
  };

  const handleAddOption = (optionData: OptionPayload | null) => {
    if (!currentUser) {
      setIsJoinModalOpen(true);
      return;
    }
    if (!optionData) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'ADD_OPTION',
          ...optionData,
          creatorId: currentUser.id,
          creatorName: currentUser.name,
          userNickname: currentUser.nickname || currentUser.name,
          userRealName: currentUser.realName || '',
          userUsername: currentUser.username || '',
          userEmail: currentUser.email || currentUser.username || '',
          pinToken: getPinToken(optionData.eventId) || '',
        })
      );
    }
  };

  const handleAddComment = (commentData: CommentPayload | null) => {
    if (!currentUser) {
      setIsJoinModalOpen(true);
      return;
    }
    if (!commentData) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'ADD_COMMENT',
          ...commentData,
          userId: currentUser.id,
          userName: currentUser.name,
          userNickname: currentUser.nickname || currentUser.name,
          userRealName: currentUser.realName || '',
          userUsername: currentUser.username || '',
          userEmail: currentUser.email || currentUser.username || '',
          pinToken: getPinToken(commentData.eventId) || '',
        })
      );
    }
  };

  const handleLockEvent = (lockData: LockPayload) => {
    if (!currentUser) {
      setIsJoinModalOpen(true);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const creatorToken = localStorage.getItem(`beervote_creator_token_${lockData.eventId}`) || '';
      wsRef.current.send(
        JSON.stringify({
          type: 'LOCK_EVENT',
          ...lockData,
          userId: currentUser.id,
          creatorToken,
          pinToken: getPinToken(lockData.eventId) || '',
          googleToken: currentUser.googleToken,
          githubToken: currentUser.githubToken,
        })
      );
    }
  };

  const handleUnlockEvent = (eventId: string) => {
    if (!currentUser) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const creatorToken = localStorage.getItem(`beervote_creator_token_${eventId}`) || '';
      wsRef.current.send(
        JSON.stringify({
          type: 'UNLOCK_EVENT',
          eventId,
          userId: currentUser.id,
          creatorToken,
          pinToken: getPinToken(eventId) || '',
          googleToken: currentUser.googleToken,
          githubToken: currentUser.githubToken,
        })
      );
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!currentUser) return;
    const creatorToken = localStorage.getItem(`beervote_creator_token_${eventId}`) || '';
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorToken,
          userId: currentUser.id,
          googleToken: currentUser.googleToken,
          githubToken: currentUser.githubToken,
        }),
      });
      if (res.ok) {
        navigateToEvent(null);
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } else {
        alert('Không thể xóa kèo nhậu này. Bạn có phải Chủ Kèo không?');
      }
    } catch {
      alert('Lỗi kết nối khi xóa kèo nhậu!');
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

  const handleGuestJoinSubmit = ({
    id,
    nickname,
    realName,
    username,
  }: {
    id?: string;
    nickname: string;
    realName: string;
    username: string;
  }) => {
    const userId = id || 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    const user: User = {
      id: userId,
      nickname,
      realName,
      username,
      name: realName ? `${nickname} (${realName})` : nickname,
      authMethod: 'guest',
    };
    saveUserToStorage(user);
    setCurrentUser(user);
    setIsJoinModalOpen(false);
    if (triggerCreateAfterJoin) {
      setTriggerCreateAfterJoin(false);
      setIsCreateModalOpen(true);
    }
  };

  const handleGoogleAuthSuccess = ({
    sub,
    email,
    name,
    given_name,
    picture,
    credential,
  }: {
    sub: string;
    email: string;
    name: string;
    given_name: string;
    picture: string;
    credential: string;
  }) => {
    const displayName = given_name || name || email;
    const realName = name || given_name || '';
    const user: User = {
      id: 'google_' + sub,
      nickname: displayName,
      realName,
      username: email,
      name: realName ? `${displayName} (${realName})` : displayName,
      email,
      avatar: picture,
      googleId: sub,
      authMethod: 'google',
      googleToken: credential,
    };
    saveUserToStorage(user);
    setCurrentUser(user);
    setIsJoinModalOpen(false);
    if (triggerCreateAfterJoin) {
      setTriggerCreateAfterJoin(false);
      setIsCreateModalOpen(true);
    }
  };

  const handleSignOut = () => {
    clearUserFromStorage();
    setCurrentUser(null);
    navigateToEvent(null);
  };

  // Trích xuất danh sách các biệt danh đang được dùng trong kèo
  const getUsedNicknames = (eventData: EventData | null) => {
    if (!eventData) return [];
    const names = new Set<string>();

    if (eventData.options) {
      eventData.options.forEach((opt) => {
        if (opt.creatorNickname) {
          names.add(opt.creatorNickname);
        }
      });
    }

    if (eventData.votes) {
      eventData.votes.forEach((v) => {
        if (v.userNickname) {
          names.add(v.userNickname);
        }
      });
    }

    if (eventData.comments) {
      eventData.comments.forEach((c) => {
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
        onSignOut={currentUser ? handleSignOut : undefined}
        onSignIn={() => setIsJoinModalOpen(true)}
      />

      {toastMsg && <div className="toast-msg">{toastMsg}</div>}

      {/* Phần nội dung chính của sòng nhậu */}
      <main className="main-content">
        {currentEventId && showPinModal ? (
          <PartyPinModal
            eventId={currentEventId}
            eventTitle={currentEventData?.title}
            onSuccess={(pinToken) => {
              if (!currentEventId) return;
              savePinToken(currentEventId, pinToken);
              setShowPinModal(false);
              fetchEventDetail(currentEventId);
              // Send JOIN_EVENT with pinToken now that we have it
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: 'JOIN_EVENT',
                    eventId: currentEventId,
                    pinToken,
                    userId: currentUser?.id,
                    googleToken: currentUser?.googleToken,
                  })
                );
              }
            }}
            onBack={() => navigateToEvent(null)}
          />
        ) : currentEventId ? (
          <EventDetail
            eventId={currentEventId}
            eventData={currentEventData}
            currentUser={currentUser}
            onBack={() => navigateToEvent(null)}
            onVoteToggle={handleVoteToggle}
            onAddOption={handleAddOption}
            onAddComment={handleAddComment}
            onLockEvent={handleLockEvent}
            onUnlockEvent={handleUnlockEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        ) : (
          <Dashboard
            events={events}
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
        onGoogleSuccess={handleGoogleAuthSuccess}
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
