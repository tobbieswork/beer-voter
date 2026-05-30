// Các kiểu dữ liệu cơ bản cho database quan hệ

export interface DBEvent {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  creatorNickname?: string;
  creatorRealName?: string;
  creatorUsername?: string;
  creatorToken?: string;
  partyPinHash?: string;
  status: 'voting' | 'locked';
  createdAt: string;
  lockedAt: string | null;
  finalDateTime: string | null;
  finalLocation: string | null;
  finalBeerStyle: string | null;
}

export interface DBOption {
  id: string;
  eventId: string;
  type: 'datetime' | 'location' | 'beer';
  value: string;
  creatorId: string;
  creatorName: string;
  creatorNickname?: string;
  creatorRealName?: string;
  creatorUsername?: string;
  createdAt: string;
}

export interface DBVote {
  id: string;
  eventId: string;
  optionId: string;
  userId: string;
  userName: string;
  userNickname?: string;
  userRealName?: string;
  userEmail?: string;
  createdAt: string;
}

export interface DBComment {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userRole?: string;
  content: string;
  userNickname?: string;
  userRealName?: string;
  userEmail?: string;
  createdAt: string;
}

export interface DBGuest {
  id: string;
  username: string;
  nickname: string;
  realName: string;
  passwordHash: string; // SHA-256
  createdAt: string;
}

export interface DatabaseSchema {
  events: DBEvent[];
  options: DBOption[];
  votes: DBVote[];
  comments: DBComment[];
  guests?: DBGuest[];
}
