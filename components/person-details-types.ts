import type { AppColors } from '@/constants/theme';

export interface Person {
  id: number;
  name: string;
  biography?: string;
  profile_path?: string | null;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  known_for_department?: string;
  gender?: number;
  also_known_as?: string[];
}

export interface Credit {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  character?: string;
  job?: string;
  department?: string;
  episode_count?: number;
  popularity?: number;
}

export interface PersonDetailsContentProps {
  colors: AppColors;
  loading: boolean;
  error: string | null;
  person: Person | null;
  castCredits: Credit[];
  crewCredits: Credit[];
  profileImage: string | null;
  profileImageLoading: boolean;
  profileImageError: boolean;
  onProfileImageLoad: () => void;
  onProfileImageError: () => void;
  onRetry: () => void;
  onClose: () => void;
  onCreditPress: (credit: Credit) => void;
}
