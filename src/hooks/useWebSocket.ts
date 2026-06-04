import { useEffect, useRef, useCallback } from 'react';
import { User, EventData, OptionPayload, CommentPayload, LockPayload } from '../types';
import { getPinToken } from '../utils/storage';

interface UseWebSocketProps {
  currentEventId: string | null;
  currentUser: User | null;
  setCurrentEventData: React.Dispatch<React.SetStateAction<EventData | null>>;
  setEvents: React.Dispatch<React.SetStateAction<EventData[]>>;
  navigateToEvent: (id: string | null) => void;
  setIsJoinModalOpen: (open: boolean) => void;
}

export function useWebSocket({
  currentEventId,
  currentUser,
  setCurrentEventData,
  setEvents,
  navigateToEvent,
  setIsJoinModalOpen,
}: UseWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectWsRef = useRef<(() => void) | null>(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl: string;
    if (window.location.port === '5173') {
      wsUrl = `${protocol}//${window.location.hostname}:3001`;
    } else {
      wsUrl = `${protocol}//${window.location.host}`;
    }

    console.log(`Đang kết nối WebSockets tới: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Đã kết nối WebSockets thành công tới BeerVote Server!');
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

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
    setCurrentEventData,
    setEvents,
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
      const creatorToken = localStorage.getItem(`beervote_creator_token_${eventId}`) || '';
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
          creatorToken,
          googleToken: currentUser.googleToken,
          githubToken: currentUser.githubToken,
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
      const creatorToken =
        localStorage.getItem(`beervote_creator_token_${optionData.eventId}`) || '';
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
          creatorToken,
          googleToken: currentUser.googleToken,
          githubToken: currentUser.githubToken,
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
      const creatorToken =
        localStorage.getItem(`beervote_creator_token_${commentData.eventId}`) || '';
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
          creatorToken,
          googleToken: currentUser.googleToken,
          githubToken: currentUser.githubToken,
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

  return {
    wsRef,
    handleVoteToggle,
    handleAddOption,
    handleAddComment,
    handleLockEvent,
    handleUnlockEvent,
    handleDeleteEvent,
  };
}
