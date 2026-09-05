/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';
import BeerBubbles from './components/BeerBubbles';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import EventDetail from './components/EventDetail';
import GuestJoinModal from './components/GuestJoinModal';
import CreateEvent from './components/CreateEvent';
import PartyPinModal from './components/PartyPinModal';

import { User, EventData } from './types';
import { useUser } from './hooks/useUser';
import { useWebSocket } from './hooks/useWebSocket';
import {
  getVisitedEvents,
  addVisitedEvent,
  getPinToken,
  savePinToken,
  clearPinToken,
} from './utils/storage';

function AppContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [events, setEvents] = useState<EventData[]>([]);
  const [_visitedEventIds, setVisitedEventIds] = useState<string[]>(() => getVisitedEvents());

  const currentEventId = useMemo(() => {
    const match = location.pathname.match(/^\/events\/([^/]+)/);
    if (match) return match[1];
    const params = new URLSearchParams(location.search);
    return params.get('eventId') || null;
  }, [location.pathname, location.search]);

  const [currentEventData, setCurrentEventData] = useState<EventData | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [triggerCreateAfterJoin, setTriggerCreateAfterJoin] = useState(false);

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // Encapsulate user state & logic inside custom hook
  const { currentUser, loginUser, logoutUser } = useUser(showToast, setIsJoinModalOpen);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const authDataParam = urlParams.get('authData');
    const syncUserParam = urlParams.get('syncUser');
    const targetUserParam = authDataParam || syncUserParam;
    const creatorTokenParam = urlParams.get('creatorToken');
    const eventIdParam = urlParams.get('eventId') || currentEventId;

    if (targetUserParam) {
      let decodedUser: User | null = null;
      try {
        decodedUser = JSON.parse(decodeURIComponent(escape(atob(targetUserParam))));
      } catch (err) {
        console.error('Failed to decode user data from sync parameters:', err);
      }

      if (decodedUser && decodedUser.id) {
        const performLogin = () => {
          loginUser(decodedUser!);
          if (syncUserParam && creatorTokenParam && eventIdParam) {
            localStorage.setItem(`beervote_creator_token_${eventIdParam}`, creatorTokenParam);
          }
          showToast(
            '🍻 ' +
              (authDataParam
                ? 'Đồng bộ tài khoản thành công!'
                : 'Đồng bộ tài khoản người tạo thành công!')
          );
        };

        if (!currentUser) {
          // Auto login if not logged in
          performLogin();
        } else if (currentUser.id !== decodedUser.id) {
          // Prompt switch account if logged in with different ID
          if (window.confirm(t('header.sync_confirm'))) {
            logoutUser();
            performLogin();
          }
        } else {
          // If already logged in as the same user, just make sure to store creator token if available
          if (syncUserParam && creatorTokenParam && eventIdParam) {
            localStorage.setItem(`beervote_creator_token_${eventIdParam}`, creatorTokenParam);
          }
        }
      }

      // Clean the query parameters from URL safely
      urlParams.delete('authData');
      urlParams.delete('syncUser');
      urlParams.delete('creatorToken');
      const newSearch = urlParams.toString();
      navigate(location.pathname + (newSearch ? `?${newSearch}` : '') + location.hash, {
        replace: true,
      });
    }
  }, [currentUser, currentEventId, loginUser, logoutUser, showToast, t, location, navigate]);

  // 1. Tự động đồng bộ URL (Router mini) -> Giờ dùng react-router
  const navigateToEvent = useCallback(
    (eventId: string | null) => {
      if (eventId) {
        navigate(`/events/${eventId}`);
        if (!currentUser) setIsJoinModalOpen(true);
      } else {
        navigate('/');
        setIsJoinModalOpen(false);
      }
    },
    [currentUser, navigate]
  );

  // Encapsulate WebSocket logic inside custom hook
  const {
    wsRef,
    handleVoteToggle,
    handleAddOption,
    handleAddComment,
    handleLockEvent,
    handleUnlockEvent,
    handleDeleteEvent,
  } = useWebSocket({
    currentEventId,
    currentUser,
    setCurrentEventData,
    setEvents,
    navigateToEvent,
    setIsJoinModalOpen,
  });

  // Lắng nghe nút Back/Forward của trình duyệt (React Router tự xử lý)
  useEffect(() => {
    if (currentEventId && !currentUser) {
      setIsJoinModalOpen(true);
    }
  }, [currentEventId, currentUser]);

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
          // If we are verified as creator via userId/Google/GitHub on another device, send JOIN_EVENT now that data is loaded
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
    [currentUser, wsRef]
  );

  // Tải dữ liệu khi chuyển trang
  useEffect(() => {
    if (currentEventId) {
      // Check for creatorToken query parameter to securely sync creator status
      const urlParams = new URLSearchParams(window.location.search);
      const urlCreatorToken = urlParams.get('creatorToken');
      const syncUserParam = urlParams.get('syncUser');
      if (urlCreatorToken && !syncUserParam) {
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
  }, [currentEventId, fetchEventDetail, fetchEvents, currentUser, wsRef]);

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
    loginUser(user);
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
    loginUser(user);
    setIsJoinModalOpen(false);
    if (triggerCreateAfterJoin) {
      setTriggerCreateAfterJoin(false);
      setIsCreateModalOpen(true);
    }
  };

  const handleSignOut = () => {
    logoutUser();
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
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                events={events}
                onSelectEvent={navigateToEvent}
                onCreateEventClick={handleCreateEventClick}
                currentUser={currentUser}
              />
            }
          />
          <Route
            path="/events/:id"
            element={
              currentEventId && showPinModal ? (
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
              ) : null
            }
          />
        </Routes>
      </main>

      {/* Modal yêu cầu nhập biệt danh và định danh khi vào sòng hoặc tạo kèo */}
      <GuestJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
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

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
