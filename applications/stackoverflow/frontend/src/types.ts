export interface SavedFilter { id: string; title: string; unanswered: boolean; sort: string; tags: string; }
export interface ReputationEntry { reason: string; change: number; post: string; time: string; }
export interface VoteEntry { action: string; post: string; time: string; }
export interface ResponseEntry { body: string; question: string; }
export interface User {
  id: string; email: string; displayName: string; fullName: string; location: string; title: string;
  about: string; website: string; x: string; github: string; reputation: number; verified: boolean;
  watchedTags: string[]; filters: SavedFilter[]; reputationHistory: ReputationEntry[];
  privateVotes: VoteEntry[]; responses: ResponseEntry[]; earnedBadges: string[];
  lastProfileUpdateAt?: string;
}
export interface CommentReply { id: string; body: string; authorId: string; posted: string; mention?: string; }
export interface Comment {
  id: string; body: string; authorId: string; posted: string; edited: boolean;
  upvotes: number; voters: string[]; replies: CommentReply[]; deleted?: boolean;
}
export interface Revision {
  id: string; summary: string; body: string; previousBody?: string; time: string; authorId: string;
  title?: string; previousTitle?: string; tags?: string[]; previousTags?: string[];
}
export interface Answer {
  id: string; body: string; authorId: string; score: number; accepted: boolean; created: string;
  modified: string; edited: boolean; votes: Record<string, number>; comments: Comment[];
  revisions: Revision[]; deleted?: boolean;
}
export interface Question {
  id: string; title: string; body: string; tags: string[]; authorId: string; score: number; views: number;
  asked: string; modified: string; edited: boolean; votes: Record<string, number>; answers: Answer[];
  comments: Comment[]; revisions: Revision[]; initialSort?: string; deleted?: boolean;
}
export interface Tag { name: string; description: string; question_count: number; }
export interface Badge { name: string; category: string; description: string; earn_count: number; }
export interface AppData {
  currentUser: User | null;
  users: User[];
  questions: Question[];
  tags: Tag[];
  badges: Badge[];
  appNow: string;
  focusedQuestionId?: string;
  message?: string;
}
