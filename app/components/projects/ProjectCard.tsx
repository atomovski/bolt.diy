import { Icon } from '~/components/ui';
import { cn } from '~/utils/cn';

interface ProjectCardProps {
  id: string;
  title: string;
  imageUrl?: string;
  type?: 'design' | 'figma' | 'figjam';
  lastModified?: Date;
  isFavorite?: boolean;
  onClick?: () => void;
}

export function ProjectCard({ title, imageUrl, type = 'design', isFavorite, onClick }: ProjectCardProps) {
  const getTypeIcon = () => {
    switch (type) {
      case 'figma':
        return <Icon.Figma className="h-4 w-4" />;
      case 'figjam':
        return <Icon.EditPencil className="h-4 w-4" />;
      default:
        return <Icon.DesignNib className="h-4 w-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'figma':
        return 'FigJam board';
      case 'figjam':
        return 'FigJam file';
      default:
        return 'Design file';
    }
  };

  return (
    <div
      className={cn(
        'group bg-bolt-elements-background-depth-2 relative overflow-hidden rounded-xl',
        'border-bolt-elements-border-color border',
        'hover:border-bolt-elements-border-color-active hover:shadow-lg',
        'cursor-pointer transition-all duration-200',
      )}
      onClick={onClick}
    >
      {/* Favorite button */}
      <button
        className={cn(
          'absolute top-3 left-3 z-10 rounded-lg p-2',
          'bg-white/90 backdrop-blur-sm dark:bg-black/50',
          'opacity-0 transition-opacity group-hover:opacity-100',
          'hover:bg-white dark:hover:bg-black/70',
        )}
        onClick={(e) => {
          e.stopPropagation();

          // Handle favorite toggle
        }}
      >
        <Icon.Star
          className={cn('h-4 w-4', isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-bolt-elements-text-tertiary')}
        />
      </button>

      {/* Project thumbnail */}
      <div className="relative h-[200px] overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10 dark:from-purple-500/20 dark:via-blue-500/20 dark:to-pink-500/20">
            <div className="relative flex h-full w-full items-center justify-center">
              {/* Abstract design elements */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-1/4 left-1/4 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 blur-3xl" />
                <div className="absolute right-1/4 bottom-1/4 h-40 w-40 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 blur-3xl" />
              </div>
              <div className="text-bolt-elements-text-tertiary z-10 text-6xl opacity-40">{getTypeIcon()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Project info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-black">{title}</h3>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-bolt-elements-text-tertiary flex items-center gap-1 text-xs">
                {getTypeIcon()}
                <span>{getTypeLabel()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
