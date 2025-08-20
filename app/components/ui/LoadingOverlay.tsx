export const LoadingOverlay = ({
  message = 'Loading...',
  progress,
  progressText,
}: {
  message?: string;
  progress?: number;
  progressText?: string;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs">
      <div className="bg-bolt-elements-background-depth-2 relative flex flex-col items-center gap-4 rounded-lg p-8 shadow-lg">
        <div
          className={'i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress'}
          style={{ fontSize: '2rem' }}
        ></div>
        <p className="text-bolt-elements-text-tertiary text-lg">{message}</p>
        {progress !== undefined && (
          <div className="flex w-64 flex-col gap-2">
            <div className="bg-bolt-elements-background-depth-1 h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-bolt-elements-loader-progress h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            {progressText && <p className="text-bolt-elements-text-tertiary text-center text-sm">{progressText}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
