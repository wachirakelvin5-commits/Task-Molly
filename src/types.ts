export type UserRole = 'client' | 'tasker' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  phone?: string;
  role: UserRole;
  displayName?: string;
  photoURL?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  createdAt: string;
  walletBalance?: number;
  services?: string[];
  location?: string;
}

export interface TaskerProfile {
  userId: string;
  serviceCategories: string[];
  experienceYears: number;
  serviceRadius: number;
  hourlyRate: number;
  isApproved: boolean;
  backgroundCheckStatus: string;
  rating: number;
  reviewCount: number;
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  serviceType: string;
  description: string;
  urgency: string;
  location?: { lat: number; lng: number; address: string };
  budget: number;
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Job {
  id: string;
  requestId: string;
  clientId: string;
  taskerId: string;
  agreedPrice: number;
  status: 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  scheduledTime: string;
  completedAt?: string;
  rating?: number;
  review?: string;
}

export interface ChatMessage {
  id: string;
  jobId: string;
  senderId: string;
  text: string;
  timestamp: string;
}
