import { StorageKeys, storageService } from '@/utils/StorageService';

export interface LibraryItem {
  id: string;
  tmdbid: string;
  type: 'movie' | 'series';
  title: string;
  poster: string;
  backdrop: string;
  year?: string;
  rating?: string;
  genres?: string[];
  timestamp: number;
  watched: boolean;
}

const LIBRARY_KEY = StorageKeys.LIBRARY_KEY || '@library';

class LibraryService {
  /**
   * Add item to library
   */
  async addToLibrary(item: Omit<LibraryItem, 'timestamp' | 'watched'>): Promise<boolean> {
    try {
      const library = await this.getLibrary();

      // Check if item already exists
      const exists = library.some(
        l => l.tmdbid === item.tmdbid && l.type === item.type
      );

      if (exists) {
        return false;
      }

      const newItem: LibraryItem = {
        ...item,
        timestamp: Date.now(),
        watched: false, // Default to unwatched
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
  async removeFromLibrary(tmdbid: string, type: 'movie' | 'series'): Promise<boolean> {
    try {
      const library = await this.getLibrary();
      const updatedLibrary = library.filter(
        item => !(item.tmdbid === tmdbid && item.type === type)
      );

      storageService.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
      return true;
    } catch (error) {
      console.error('Failed to remove from library:', error);
      return false;
    }
  }

  /**
   * Mark item as watched
   */
  async markAsWatched(tmdbid: string, type: 'movie' | 'series'): Promise<boolean> {
    try {
      const library = await this.getLibrary();
      const updatedLibrary = library.map(item => {
        if (item.tmdbid === tmdbid && item.type === type) {
          return { ...item, watched: true };
        }
        return item;
      });

      storageService.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
      return true;
    } catch (error) {
      console.error('Failed to mark as watched:', error);
      return false;
    }
  }

  /**
   * Mark item as unwatched
   */
  async markAsUnwatched(tmdbid: string, type: 'movie' | 'series'): Promise<boolean> {
    try {
      const library = await this.getLibrary();
      const updatedLibrary = library.map(item => {
        if (item.tmdbid === tmdbid && item.type === type) {
          return { ...item, watched: false };
        }
        return item;
      });

      storageService.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
      return true;
    } catch (error) {
      console.error('Failed to mark as unwatched:', error);
      return false;
    }
  }

  /**
   * Toggle watch status
   */
  async toggleWatchStatus(tmdbid: string, type: 'movie' | 'series'): Promise<boolean> {
    try {
      const library = await this.getLibrary();
      const updatedLibrary = library.map(item => {
        if (item.tmdbid === tmdbid && item.type === type) {
          return { ...item, watched: !item.watched };
        }
        return item;
      });

      storageService.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
      return true;
    } catch (error) {
      console.error('Failed to toggle watch status:', error);
      return false;
    }
  }

  /**
   * Check if item is in library
   */
  async isInLibrary(tmdbid: string, type: 'movie' | 'series'): Promise<boolean> {
    try {
      const library = await this.getLibrary();
      return library.some(
        item => item.tmdbid === tmdbid && item.type === type
      );
    } catch (error) {
      console.error('Failed to check library:', error);
      return false;
    }
  }

  /**
   * Get watch status of an item
   */
  async getWatchStatus(tmdbid: string, type: 'movie' | 'series'): Promise<boolean | null> {
    try {
      const library = await this.getLibrary();
      const item = library.find(
        i => i.tmdbid === tmdbid && i.type === type
      );
      return item ? item.watched : null;
    } catch (error) {
      console.error('Failed to get watch status:', error);
      return null;
    }
  }

  /**
   * Get all library items
   */
  async getLibrary(type?: 'movie' | 'series', watchedFilter?: boolean): Promise<LibraryItem[]> {
    try {
      const libraryJson = storageService.getItem(LIBRARY_KEY);
      if (!libraryJson) {
        return [];
      }

      let library: LibraryItem[] = JSON.parse(libraryJson);

      // Ensure all items have watched property (for backward compatibility)
      library = library.map(item => ({
        ...item,
        watched: item.watched ?? false
      }));

      if (type) {
        library = library.filter(item => item.type === type);
      }

      if (watchedFilter !== undefined) {
        library = library.filter(item => item.watched === watchedFilter);
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
  async getLibraryCount(watched?: boolean): Promise<number> {
    try {
      const library = await this.getLibrary(undefined, watched);
      return library.length;
    } catch (error) {
      console.error('Failed to get library count:', error);
      return 0;
    }
  }

  /**
   * Get watched items count
   */
  async getWatchedCount(): Promise<number> {
    return this.getLibraryCount(true);
  }

  /**
   * Get unwatched items count
   */
  async getUnwatchedCount(): Promise<number> {
    return this.getLibraryCount(false);
  }
}

export const libraryService = new LibraryService();