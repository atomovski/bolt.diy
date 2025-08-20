import { useState, useEffect } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';
import { cn } from '~/utils/cn';
import { Checkbox } from '~/components/ui/Checkbox';
import { toast } from '~/components/ui/use-toast';

interface LockedItem {
  path: string;
  type: 'file' | 'folder';
}

export function LockManager() {
  const [lockedItems, setLockedItems] = useState<LockedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'files' | 'folders'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load locked items
  useEffect(() => {
    const loadLockedItems = () => {
      // We don't need to filter by chat ID here as we want to show all locked files
      const items: LockedItem[] = [];

      // Get all files and folders from the workbench store
      const allFiles = workbenchStore.files.get();

      // Check each file/folder for locks
      Object.entries(allFiles).forEach(([path, item]) => {
        if (!item) {
          return;
        }

        if (item.type === 'file' && item.isLocked) {
          items.push({
            path,
            type: 'file',
          });
        } else if (item.type === 'folder' && item.isLocked) {
          items.push({
            path,
            type: 'folder',
          });
        }
      });

      setLockedItems(items);
    };

    loadLockedItems();

    // Set up an interval to refresh the list periodically
    const intervalId = setInterval(loadLockedItems, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Filter and sort the locked items
  const filteredAndSortedItems = lockedItems
    .filter((item) => {
      // Apply type filter
      if (filter === 'files' && item.type !== 'file') {
        return false;
      }

      if (filter === 'folders' && item.type !== 'folder') {
        return false;
      }

      // Apply search filter
      if (searchTerm && !item.path.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      return a.path.localeCompare(b.path);
    });

  // Handle selecting/deselecting a single item
  const handleSelectItem = (path: string) => {
    const newSelectedItems = new Set(selectedItems);

    if (newSelectedItems.has(path)) {
      newSelectedItems.delete(path);
    } else {
      newSelectedItems.add(path);
    }

    setSelectedItems(newSelectedItems);
  };

  // Handle selecting/deselecting all visible items
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      // Select all filtered items
      const allVisiblePaths = new Set(filteredAndSortedItems.map((item) => item.path));
      setSelectedItems(allVisiblePaths);
    } else {
      // Deselect all (clear selection)
      setSelectedItems(new Set());
    }
  };

  // Handle unlocking selected items
  const handleUnlockSelected = () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected to unlock.');
      return;
    }

    let unlockedCount = 0;
    selectedItems.forEach((path) => {
      const item = lockedItems.find((i) => i.path === path);

      if (item) {
        if (item.type === 'file') {
          workbenchStore.unlockFile(path);
        } else {
          workbenchStore.unlockFolder(path);
        }

        unlockedCount++;
      }
    });

    if (unlockedCount > 0) {
      toast.success(`Unlocked ${unlockedCount} selected item(s).`);
      setSelectedItems(new Set()); // Clear selection after unlocking
    }
  };

  // Determine the state of the "Select All" checkbox
  const isAllSelected = filteredAndSortedItems.length > 0 && selectedItems.size === filteredAndSortedItems.length;
  const isSomeSelected = selectedItems.size > 0 && selectedItems.size < filteredAndSortedItems.length;
  const selectAllCheckedState: boolean | 'indeterminate' = isAllSelected
    ? true
    : isSomeSelected
      ? 'indeterminate'
      : false;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Controls */}
      <div className="border-bolt-elements-border-color flex items-center gap-1 border-b px-2 py-1">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="text-bolt-elements-text-tertiary i-ph:magnifying-glass pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-bolt-elements-background-depth-2 border-bolt-elements-border-color h-6 w-full rounded-sm border py-0.5 pr-2 pl-6 text-xs text-black focus:outline-hidden"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: 0 }}
          />
        </div>
        {/* Filter Select */}
        <select
          className="bg-bolt-elements-background-depth-2 border-bolt-elements-border-color h-6 rounded-sm border px-1 py-0.5 text-xs text-black focus:outline-hidden"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">All</option>
          <option value="files">Files</option>
          <option value="folders">Folders</option>
        </select>
      </div>

      {/* Header Row with Select All */}
      <div className="text-bolt-elements-text-secondary flex items-center justify-between px-2 py-1 text-xs">
        <div>
          <Checkbox
            checked={selectAllCheckedState}
            onCheckedChange={handleSelectAll}
            className="border-bolt-elements-border-color mr-2 h-3 w-3 rounded-sm"
            aria-label="Select all items"
            disabled={filteredAndSortedItems.length === 0} // Disable if no items to select
          />
          <span>All</span>
        </div>
        {selectedItems.size > 0 && (
          <button
            className="bg-bolt-elements-button-secondary-background hover:bg-bolt-elements-button-secondary-background-hover text-bolt-elements-button-secondary-text ml-auto flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs"
            onClick={handleUnlockSelected}
            title="Unlock all selected items"
          >
            Unlock all
          </button>
        )}
        <div></div>
      </div>

      {/* List of locked items */}
      <div className="modern-scrollbar flex-1 overflow-auto px-1 py-1">
        {filteredAndSortedItems.length === 0 ? (
          <div className="text-bolt-elements-text-tertiary flex h-full flex-col items-center justify-center gap-2 text-xs">
            <span className="i-ph:lock-open-duotone text-lg opacity-50" />
            <span>No locked items found</span>
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredAndSortedItems.map((item) => (
              <li
                key={item.path}
                className={cn(
                  'text-bolt-elements-text-tertiary hover:bg-bolt-elements-background-depth-2 group flex items-center gap-2 rounded-sm px-2 py-1 transition-colors',
                  selectedItems.has(item.path) ? 'bg-bolt-elements-background-depth-2' : '',
                )}
              >
                <Checkbox
                  checked={selectedItems.has(item.path)}
                  onCheckedChange={() => handleSelectItem(item.path)}
                  className="border-bolt-elements-border-color h-3 w-3 rounded-sm"
                  aria-labelledby={`item-label-${item.path}`} // For accessibility
                />
                <span
                  className={cn(
                    'text-bolt-elements-text-tertiary shrink-0 text-xs',
                    item.type === 'file' ? 'i-ph:file-text-duotone' : 'i-ph:folder-duotone',
                  )}
                />
                <span id={`item-label-${item.path}`} className="flex-1 truncate text-xs" title={item.path}>
                  {item.path.replace('/home/project/', '')}
                </span>
                {/* ... rest of the item details and buttons ... */}
                <span
                  className={cn('inline-flex items-center rounded-xs px-1 text-xs', 'bg-red-500/10 text-red-500')}
                ></span>
                <button
                  className="hover:bg-darken-50 flex items-center rounded-sm bg-transparent px-1 py-0.5 text-xs"
                  onClick={() => {
                    if (item.type === 'file') {
                      workbenchStore.unlockFile(item.path);
                    } else {
                      workbenchStore.unlockFolder(item.path);
                    }

                    toast.success(`${item.path.replace('/home/project/', '')} unlocked`);
                  }}
                  title="Unlock"
                >
                  <span className="i-ph:lock-open text-xs" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-bolt-elements-border-color bg-bolt-elements-background-depth-2 text-bolt-elements-text-tertiary flex items-center justify-between border-t px-2 py-1 text-xs">
        <div>
          {filteredAndSortedItems.length} item(s) • {selectedItems.size} selected
        </div>
      </div>
    </div>
  );
}
