import { StorageKeys, storageService } from '@/utils/StorageService';

export interface LibraryItem {
  id: string;
  moviedbid: string;
  type: 'movie' | 'series';
  title: string;
  poster: string;
  backdrop: string;
  year?: string;
  rating?: string;
  genres?: string[];
  timestamp: number;
}

const LIBRARY_KEY = StorageKeys.LIBRARY_KEY || '@library';

class LibraryService {
  /**
   * Add item to library
   */
  async addToLibrary(item: Omit<LibraryItem, 'timestamp'>): Promise<boolean> {
    try {
      const library = await this.getLibrary();
      
      // Check if item already exists
      const exists = library.some(
        l => l.moviedbid === item.moviedbid && l.type === item.type
      );
      
      if (exists) {
        return false;
      }

      const newItem: LibraryItem = {
        ...item,
        timestamp: Date.now(),
      };

      const updatedLibrary = [newItem, ...library];
      storageService.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
      return true;
    } catch (error) {
      console.error('Failed to add to library:', error);
      return false;
    }
  }

  /**
   * Remove item from library
   */
  async removeFromLibrary(moviedbid: string, type: 'movie' | 'series'): Promise<boolean> {
    try {
      const library = await this.getLibrary();
      const updatedLibrary = library.filter(
        item => !(item.moviedbid === moviedbid && item.type === type)
      );
      
      storageService.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
      return true;
    } catch (error) {
      console.error('Failed to remove from library:', error);
      return false;
    }
  }

  /**
   * Check if item is in library
   */
  async isInLibrary(moviedbid: string, type: 'movie' | 'series'): Promise<boolean> {
    try {
      const library = await this.getLibrary();
      return library.some(
        item => item.moviedbid === moviedbid && item.type === type
      );
    } catch (error) {
      console.error('Failed to check library:', error);
      return false;
    }
  }

  /**
   * Get all library items
   */
  async getLibrary(type?: 'movie' | 'series'): Promise<LibraryItem[]> {
    try {
      const libraryJson = storageService.getItem(LIBRARY_KEY);
      if (!libraryJson) {
        return [];
      }

      const library: LibraryItem[] = JSON.parse(libraryJson);
      
      if (type) {
        return library.filter(item => item.type === type);
      }
      
      return library;
    } catch (error) {
      console.error('Failed to get library:', error);
      return [];
    }
  }

  /**
   * Clear entire library
   */
  async clearLibrary(): Promise<boolean> {
    try {
      storageService.removeItem(LIBRARY_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear library:', error);
      return false;
    }
  }

  /**
   * Get library count
   */
  async getLibraryCount(): Promise<number> {
    try {
      const library = await this.getLibrary();
      return library.length;
    } catch (error) {
      console.error('Failed to get library count:', error);
      return 0;
    }
  }
}

export const libraryService = new LibraryService();