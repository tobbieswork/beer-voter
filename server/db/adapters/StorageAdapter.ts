import { DBEvent, DBOption, DBVote, DBComment, DBUser } from '../types.js';

export interface EventDetailPayload extends Omit<DBEvent, 'creatorToken' | 'partyPinHash'> {
  hasPin: boolean;
  options: DBOption[];
  votes: DBVote[];
  comments: DBComment[];
}

export interface DashboardEventPayload extends Omit<DBEvent, 'creatorToken' | 'partyPinHash'> {
  hasPin: boolean;
  votesCount: number;
  commentsCount: number;
  optionsCount: number;
}

export interface StorageAdapter {
  init(): Promise<void>;

  // Queries
  getEventDetail(eventId: string): Promise<EventDetailPayload | null>;
  getDashboardEvents(): Promise<DashboardEventPayload[]>;
  getUsers(): Promise<DBUser[]>;
  getEvent(eventId: string): Promise<DBEvent | null>;

  // Mutations
  insertEvent(event: DBEvent): Promise<void>;
  updateEventStatus(eventId: string, fields: Partial<DBEvent>): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;

  insertOption(option: DBOption): Promise<void>;
  insertOptions(options: DBOption[]): Promise<void>;

  insertVote(vote: DBVote): Promise<void>;
  deleteVote(voteId: string): Promise<void>;

  insertComment(comment: DBComment): Promise<void>;

  insertUser(user: DBUser): Promise<void>;
  updateUser(userId: string, fields: Partial<DBUser>): Promise<void>;
}
