
export interface Term {
  id: number;
  name: string;
  category: string;
  subCategory?: string;
  definition: string;
  tags: string[];
  // Custom Term Fields
  isCustom?: boolean;
  createdBy?: string;
  isUniversal?: boolean;
}
export interface Term {
  id: number;
  name: string;
  category: string;
  subCategory?: string;
  definition: string;
  tags: string[];
  // Custom Term Fields
  isCustom?: boolean;
  createdBy?: string;
  isUniversal?: boolean;
}

export interface User {
  name: string;
  email?: string;
  connectId: string;
  isVerifiedAdult: boolean;
  isDemo?: boolean;
  publicKey?: string; // Base64 RSA Public Key
  uid?: string;
  partnerId?: string;
  partnerName?: string;
  sharedKeyBase64?: string; // Legacy: Encrypted Shared Key (if no partner) or raw (bad)
  encryptedSharedKey?: string; // New: Wrapped Shared Key (RSA-OAEP)
  sharingSettings?: SharingSettings;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface Thread {
  id: string;
  subject: string;
  messages: Message[];
  lastTimestamp: number;
}

export interface Flirt {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  category: 'sweet' | 'thoughtful' | 'spicy';
  expiresAt: number;
}
export interface ChatterNote {
  id: string;
  contextId: string; // Added for grouping
  subject?: string;   // For threaded inbox
  author: string;
  text: string;
  timestamp: number;
  photoPath?: string;
  photoIv?: string;
  // ZK Fields
  encryptedKey?: string; // The wrapped AES key (Base64)
  storagePath?: string; // Path to .bin file
  senderId?: string;
  type?: 'text' | 'image_zk' | 'note' | 'reaction';
  // Flirt Features
  expiresAt?: number;
  status?: 'sent' | 'delivered' | 'read';
  readAt?: number;
  audioPath?: string;
  audioIv?: string;
  reactions?: { author: string, emoji: string, timestamp?: number }[];
  firestoreId?: string; // Document ID for updates
  category?: 'sweet' | 'thoughtful' | 'spicy'; // Restoration of mood/hashtags
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

export type Bookmark = 'love' | 'like' | 'work' | 'unsure' | 'skip';

export interface Filters {
  searchTerm: string;
  category: string;
  sortBy: SortOption;
  tags: Set<string>;
  // Partner Filters
  showPartnerLoves?: boolean;
  showPartnerLikes?: boolean;
  showPartnerWork?: boolean;
  showPartnerUnsure?: boolean;
  showPartnerBoundaries?: boolean;
  // My Filters
  showMyLoves?: boolean;
  showMyLikes?: boolean;
  showMyWork?: boolean;
  showMyUnsure?: boolean;
  showMyBoundaries?: boolean;
}

export interface Bounty {
  id: number | string;
  rewardTerm: Term;
  task: string;
  deadline: string;
  status: 'available' | 'claimed' | 'done' | 'archived';
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
  shareUnsure: boolean;
  shareBoundaries: boolean;
  shareFavors: boolean;
}

export interface NotificationSettings {
  chatter: boolean;
  quickFlirts: boolean;
  allFlirts: boolean;
  messages: boolean;
  thoughts: boolean;
  newFavors: boolean;
}

export interface Highlight {
  id: string;
  text: string;
  source: string;
  context?: string;
  timestamp: number;
}
