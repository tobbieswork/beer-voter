export interface User {
  id: string;
  nickname: string;
  realName: string;
  username: string;
  name: string;
  role?: string;
  email?: string;
  avatar?: string;
  googleId?: string;
  authMethod?: 'google' | 'guest';
  googleToken?: string;
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
  hasPin?: boolean;
  partyPin?: string;
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

// Payload types cho WebSocket messages
export interface OptionPayload {
  eventId: string;
  optType: 'datetime' | 'location' | 'beer';
  value: string;
  creatorId: string;
  creatorName: string;
  userNickname?: string;
  userRealName?: string;
  userEmail?: string;
}

export interface CommentPayload {
  eventId: string;
  userId: string;
  userName: string;
  userRole?: string;
  content: string;
  userNickname?: string;
  userRealName?: string;
  userEmail?: string;
}

export interface LockPayload {
  eventId: string;
  finalDateTime: string;
  finalLocation: string;
  finalBeerStyle: string;
}
