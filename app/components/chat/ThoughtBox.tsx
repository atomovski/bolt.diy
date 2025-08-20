import { useState, type PropsWithChildren } from 'react';

const ThoughtBox = ({ title, children }: PropsWithChildren<{ title: string }>) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`bg-bolt-elements-background-depth-2 cursor-pointer rounded-lg shadow-md transition-all duration-300 ${isExpanded ? 'max-h-96' : 'max-h-13'} border-bolt-elements-border-color overflow-auto border`}
    >
      <div className="text-bolt-elements-text-secondary border-bolt-elements-border-color flex items-center gap-4 rounded-lg border p-4 text-sm leading-5 font-medium">
        <div className="i-ph:brain-thin text-2xl" />
        <div className="div">
          <span> {title}</span>{' '}
          {!isExpanded && <span className="text-bolt-elements-text-tertiary"> - Click to expand</span>}
        </div>
      </div>
      <div className={`rounded-lg p-4 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'} `}>
        {children}
      </div>
    </div>
  );
};

export default ThoughtBox;
