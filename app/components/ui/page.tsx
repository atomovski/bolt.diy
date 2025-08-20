import type { ReactNode } from 'react';
import { memo, useEffect, useState } from 'react';

import { cn } from '~/utils/cn';

interface PageHeaderProps {
  left: ReactNode;
  right?: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'full';
  alwaysVisible?: boolean;
  showThreshold?: number;
}
export const PageHeader = memo<PageHeaderProps>(({ left, right, showThreshold = 42, width, alwaysVisible = true }) => {
  const [isVisible, setIsVisible] = useState(alwaysVisible);

  useEffect(() => {
    if (alwaysVisible) {
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > showThreshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }, [showThreshold, alwaysVisible]);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-[10] h-[var(--header-height)] w-full transition-all duration-150',
        !alwaysVisible && (isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'),
      )}
    >
      <div
        className={cn(
          'bg-background/90 mx-auto flex h-[var(--header-height)] w-full max-w-[100vw] flex-row items-center justify-between gap-3.5 border-b px-8 backdrop-blur-[8px]',
          width === 'sm' && 'max-w-xl',
          width === 'md' && 'max-w-3xl',
          width === 'lg' && 'max-w-6xl',
          width === 'full' && 'max-w-8xl',
        )}
      >
        <div>{left}</div>
        <div>{right}</div>
      </div>
    </header>
  );
});

PageHeader.displayName = 'PageHeader';

export const PageHeaderTitle = memo(({ children, className }: { children: ReactNode; className?: string }) => (
  <h1 className={className}>{children}</h1>
));

interface PageInnerHeaderProps {
  left: ReactNode | string;
  right?: ReactNode;
  className?: string;
}

export const PageInnerHeader = memo(({ left, right, className }: PageInnerHeaderProps) => {
  return (
    <div className={cn('mb-6 flex flex-row items-center justify-between', className)}>
      <div>{left}</div>
      {right ?? <></>}
    </div>
  );
});

PageInnerHeader.displayName = 'PageInnerHeader';

export const PageInnerHeaderTitle = memo(({ title, className }: { title: string; className?: string }) => (
  <h2 className={className}>{title}</h2>
));

export const PageContainer = memo(
  ({
    children,
    className,
    width = 'lg',
    hasHeader = false,
  }: {
    children: ReactNode;
    className?: string;
    hasHeader?: boolean;
    width?: 'sm' | 'md' | 'lg' | 'full';
  }) => {
    return (
      <div
        className={cn(
          'container mx-auto flex w-full flex-col py-5 md:py-8 lg:pt-12 lg:pb-12',
          width === 'sm' && 'max-w-xl',
          width === 'md' && 'max-w-3xl',
          width === 'lg' && 'max-w-6xl',
          width === 'full' && 'max-w-8xl',
          hasHeader && 'mt-[var(--header-height)]',
          className,
        )}
      >
        {children}
      </div>
    );
  },
);
