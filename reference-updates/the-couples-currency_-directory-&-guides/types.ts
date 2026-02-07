
export interface Term {
  id: number;
  name: string;
  category: string;
  subCategory?: string;
  definition: string;
  tags: string[];
}

export interface ChatterNote {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  summary: string;
  rawInput: string;
  category: 'reflection' | 'gratitude' | 'complication' | 'discovery';
  aiPerspective: string;
}

export type SortOption = 'default' | 'az' | 'za';

export type Bookmark = 'love' | 'like';

export interface Filters {
    searchTerm: string;
    category: string;
    sortBy: SortOption;
    tags: Set<string>;
}

export interface Bounty {
  id: number;
  rewardTerm: Term;
  task: string;
  deadline: string;
  status: 'available' | 'claimed' | 'done';
  postedBy: string;
  claimedBy: string | null;
}

export interface Invite {
  id: string;
  from: string;
  code: string;
  status: 'pending' | 'accepted' | 'ignored';
}

export interface SharingSettings {
  shareAll: boolean;
  shareWillWorkFor: boolean;
  shareLoves: boolean;
  shareLikes: boolean;
  shareFavors: boolean;
}
