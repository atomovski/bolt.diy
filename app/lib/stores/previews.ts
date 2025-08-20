import type { Sandbox } from 'e2b';
import { atom } from 'nanostores';

// Extend Window interface to include our custom property
declare global {
  interface Window {
    _tabId?: string;
  }
}

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

export interface WindowSize {
  name: string;
  width: number;
  height: number;
}

// Create a broadcast channel for preview updates
const PREVIEW_CHANNEL = 'preview-updates';

export const WINDOW_SIZES: WindowSize[] = [
  { name: 'Custom', width: 1024, height: 768 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12/13', width: 390, height: 844 },
  {
    name: 'iPhone 12/13 Pro Max',
    width: 428,
    height: 926,
  },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Air', width: 820, height: 1180 },
  { name: 'iPad Pro 11"', width: 834, height: 1194 },
  {
    name: 'iPad Pro 12.9"',
    width: 1024,
    height: 1366,
  },
];

export const showDeviceModeAtom = atom<boolean>(false);
export const selectedWindowSizeAtom = atom<WindowSize>(WINDOW_SIZES[1]); // Default to iPhone SE instead of Custom
export const isLandscapeAtom = atom<boolean>(false);
export const widthPercentAtom = atom<number>(37.5);
export const currentWidthAtom = atom<number>(0);
export const currentHeightAtom = atom<number>(0);
export const customWidthAtom = atom<number>(1024);
export const customHeightAtom = atom<number>(768);

// Container ref for fullscreen functionality
export const previewContainerRefAtom = atom<HTMLDivElement | null>(null);

export class PreviewsStore {
  #availablePreviews = new Map<number, PreviewInfo>();
  #sandbox: Promise<Sandbox>;
  #broadcastChannel: BroadcastChannel;
  #lastUpdate = new Map<string, number>();
  #watchedFiles = new Set<string>();
  #refreshTimeouts = new Map<string, NodeJS.Timeout>();
  #REFRESH_DELAY = 300;
  #storageChannel: BroadcastChannel;

  previews = atom<PreviewInfo[]>([]);

  constructor(sandboxPromise: Promise<Sandbox>) {
    this.#sandbox = sandboxPromise;
    this.#broadcastChannel = new BroadcastChannel(PREVIEW_CHANNEL);
    this.#storageChannel = new BroadcastChannel('storage-sync-channel');

    // Listen for preview updates from other tabs
    this.#broadcastChannel.onmessage = (event) => {
      const { type, previewId } = event.data;

      if (type === 'file-change') {
        const timestamp = event.data.timestamp;
        const lastUpdate = this.#lastUpdate.get(previewId) || 0;

        if (timestamp > lastUpdate) {
          this.#lastUpdate.set(previewId, timestamp);
          this.refreshPreview(previewId);
        }
      }
    };

    // Listen for storage sync messages
    this.#storageChannel.onmessage = (event) => {
      const { storage, source } = event.data;

      if (storage && source !== this._getTabId()) {
        this._syncStorage(storage);
      }
    };

    // Override localStorage setItem to catch all changes
    if (typeof window !== 'undefined') {
      const originalSetItem = localStorage.setItem;

      localStorage.setItem = (...args) => {
        originalSetItem.apply(localStorage, args);
        this._broadcastStorageSync();
      };
    }

    this.#init();
  }

  // Generate a unique ID for this tab
  private _getTabId(): string {
    if (typeof window !== 'undefined') {
      if (!window._tabId) {
        window._tabId = Math.random().toString(36).substring(2, 15);
      }

      return window._tabId;
    }

    return '';
  }

  // Sync storage data between tabs
  private _syncStorage(storage: Record<string, string>) {
    if (typeof window !== 'undefined') {
      Object.entries(storage).forEach(([key, value]) => {
        try {
          const originalSetItem = Object.getPrototypeOf(localStorage).setItem;
          originalSetItem.call(localStorage, key, value);
        } catch (error) {
          console.error('[Preview] Error syncing storage:', error);
        }
      });

      // Force a refresh after syncing storage
      const previews = this.previews.get();
      previews.forEach((preview) => {
        const previewId = this.getPreviewId(preview.baseUrl);

        if (previewId) {
          this.refreshPreview(previewId);
        }
      });

      // Reload the page content
      if (typeof window !== 'undefined' && window.location) {
        const iframe = document.querySelector('iframe');

        if (iframe) {
          iframe.src = iframe.src;
        }
      }
    }
  }

  // Broadcast storage state to other tabs
  private _broadcastStorageSync() {
    if (typeof window !== 'undefined') {
      const storage: Record<string, string> = {};

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key) {
          storage[key] = localStorage.getItem(key) || '';
        }
      }

      this.#storageChannel.postMessage({
        type: 'storage-sync',
        storage,
        source: this._getTabId(),
        timestamp: Date.now(),
      });
    }
  }

  async #init() {
    /*
     * TODO: E2B doesn't have the same server/port event system as WebContainer
     * This will need to be implemented differently using E2B's preview capabilities
     * For POC, we'll create a basic preview URL
     */

    const sandbox = await this.#sandbox;

    /*
     * E2B preview URLs are different - they use getHost(port)
     * We'll set up a basic preview for common development ports
     */
    const commonPorts = [5173];

    for (const port of commonPorts) {
      try {
        /*
         * Use E2B's getHost() method to get proper preview URLs
         */
        const baseUrl = `https://${sandbox.getHost(port)}`;

        const previewInfo = { port, ready: true, baseUrl };
        this.#availablePreviews.set(port, previewInfo);

        const previews = this.previews.get();
        previews.push(previewInfo);
        this.previews.set([...previews]);
      } catch (error) {
        console.warn(`Failed to set up preview for port ${port}:`, error);
      }
    }
  }

  // Helper to extract preview ID from URL
  getPreviewId(url: string): string | null {
    // E2B preview URLs have a different format
    const match = url.match(/^https?:\/\/([^.]+)\.e2b\.dev/);
    return match ? match[1] : null;
  }

  // Broadcast state change to all tabs
  broadcastStateChange(previewId: string) {
    const timestamp = Date.now();
    this.#lastUpdate.set(previewId, timestamp);

    this.#broadcastChannel.postMessage({
      type: 'state-change',
      previewId,
      timestamp,
    });
  }

  // Broadcast file change to all tabs
  broadcastFileChange(previewId: string) {
    const timestamp = Date.now();
    this.#lastUpdate.set(previewId, timestamp);

    this.#broadcastChannel.postMessage({
      type: 'file-change',
      previewId,
      timestamp,
    });
  }

  // Broadcast update to all tabs
  broadcastUpdate(url: string) {
    const previewId = this.getPreviewId(url);

    if (previewId) {
      const timestamp = Date.now();
      this.#lastUpdate.set(previewId, timestamp);

      this.#broadcastChannel.postMessage({
        type: 'file-change',
        previewId,
        timestamp,
      });
    }
  }

  // Method to refresh a specific preview
  refreshPreview(previewId: string) {
    // Clear any pending refresh for this preview
    const existingTimeout = this.#refreshTimeouts.get(previewId);

    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set a new timeout for this refresh
    const timeout = setTimeout(() => {
      const previews = this.previews.get();
      const preview = previews.find((p) => this.getPreviewId(p.baseUrl) === previewId);

      if (preview) {
        preview.ready = false;
        this.previews.set([...previews]);

        requestAnimationFrame(() => {
          preview.ready = true;
          this.previews.set([...previews]);
        });
      }

      this.#refreshTimeouts.delete(previewId);
    }, this.#REFRESH_DELAY);

    this.#refreshTimeouts.set(previewId, timeout);
  }

  refreshAllPreviews() {
    const previews = this.previews.get();

    for (const preview of previews) {
      const previewId = this.getPreviewId(preview.baseUrl);

      if (previewId) {
        this.broadcastFileChange(previewId);
      }
    }
  }
}

// Create a singleton instance
let previewsStore: PreviewsStore | null = null;

export function usePreviewStore() {
  if (!previewsStore) {
    /*
     * Initialize with a Promise that resolves to WebContainer
     * This should match how you're initializing WebContainer elsewhere
     */
    previewsStore = new PreviewsStore(Promise.resolve({} as Sandbox));
  }

  return previewsStore;
}
