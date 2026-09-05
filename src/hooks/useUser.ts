import { useState, useEffect } from 'react';
import { User } from '../types';

export function getInitialUser(): User | null {
  const userId = localStorage.getItem('beervote_user_id');
  const nickname = localStorage.getItem('beervote_user_nickname');
  const realName = localStorage.getItem('beervote_user_real_name');
  const username = localStorage.getItem('beervote_user_username');
  const avatar = localStorage.getItem('beervote_user_avatar') || undefined;
  const googleId = localStorage.getItem('beervote_user_google_id') || undefined;
  const token = localStorage.getItem('beervote_auth_token') || undefined;
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
      authMethod,
      token,
    };
  }
  return null;
}

export function saveUserToStorage(user: User) {
  localStorage.setItem('beervote_user_id', user.id);
  localStorage.setItem('beervote_user_nickname', user.nickname);
  localStorage.setItem('beervote_user_real_name', user.realName);
  localStorage.setItem('beervote_user_username', user.username);
  if (user.avatar) localStorage.setItem('beervote_user_avatar', user.avatar);
  else localStorage.removeItem('beervote_user_avatar');
  if (user.googleId) localStorage.setItem('beervote_user_google_id', user.googleId);
  else localStorage.removeItem('beervote_user_google_id');
  if (user.token) localStorage.setItem('beervote_auth_token', user.token);
  else localStorage.removeItem('beervote_auth_token');
  localStorage.setItem('beervote_user_auth_method', user.authMethod || 'guest');
}

export function clearUserFromStorage() {
  [
    'beervote_user_id',
    'beervote_user_nickname',
    'beervote_user_real_name',
    'beervote_user_username',
    'beervote_user_avatar',
    'beervote_user_google_id',
    'beervote_user_auth_method',
    'beervote_auth_token',
  ].forEach((k) => localStorage.removeItem(k));
}

export function useUser(
  showToast: (msg: string) => void,
  setIsJoinModalOpen: (open: boolean) => void
) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getInitialUser());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Google Redirect Callback handling
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
              id: 'usr_google_' + sub,
              nickname: displayName,
              realName,
              username: email,
              name: realName ? `${displayName} (${realName})` : displayName,
              email,
              avatar: picture,
              googleId: sub,
              authMethod: 'google',
              token: data.token,
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

    // GitHub Redirect Callback handling
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
              id: 'usr_github_' + sub,
              nickname: displayName,
              realName,
              username: login || email || '',
              name: realName ? `${displayName} (${realName})` : displayName,
              email,
              avatar: picture,
              authMethod: 'github',
              token: data.token,
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
  }, [showToast, setIsJoinModalOpen]);

  const loginUser = (user: User) => {
    saveUserToStorage(user);
    setCurrentUser(user);
  };

  const logoutUser = () => {
    clearUserFromStorage();
    setCurrentUser(null);
  };

  return {
    currentUser,
    setCurrentUser,
    loginUser,
    logoutUser,
  };
}
