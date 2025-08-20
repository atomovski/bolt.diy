import { useState } from 'react';

interface ElementInfo {
  tagName: string;
  className: string;
  id: string;
  textContent: string;
  styles: Record<string, string>; // Changed from CSSStyleDeclaration
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
  };
}

interface InspectorPanelProps {
  selectedElement: ElementInfo | null;
  isVisible: boolean;
  onClose: () => void;
}

export const InspectorPanel = ({ selectedElement, isVisible, onClose }: InspectorPanelProps) => {
  const [activeTab, setActiveTab] = useState<'styles' | 'computed' | 'box'>('styles');

  if (!isVisible || !selectedElement) {
    return null;
  }

  const getRelevantStyles = (styles: Record<string, string>) => {
    const relevantProps = [
      'display',
      'position',
      'width',
      'height',
      'margin',
      'padding',
      'border',
      'background',
      'color',
      'font-size',
      'font-family',
      'text-align',
      'flex-direction',
      'justify-content',
      'align-items',
    ];

    return relevantProps.reduce(
      (acc, prop) => {
        const value = styles[prop];

        if (value) {
          acc[prop] = value;
        }

        return acc;
      },
      {} as Record<string, string>,
    );
  };

  return (
    <div className="bg-bolt-elements-bg-depth-1 border-bolt-elements-border-color fixed top-20 right-4 z-40 max-h-[calc(100vh-6rem)] w-80 overflow-hidden rounded-lg border shadow-lg">
      {/* Header */}
      <div className="border-bolt-elements-border-color flex items-center justify-between border-b p-3">
        <h3 className="font-medium text-black">Element Inspector</h3>
        <button onClick={onClose} className="text-bolt-elements-text-secondary hover:text-black">
          ✕
        </button>
      </div>

      {/* Element Info */}
      <div className="border-bolt-elements-border-color border-b p-3">
        <div className="text-sm">
          <div className="font-mono text-blue-500">
            {selectedElement.tagName.toLowerCase()}
            {selectedElement.id && <span className="text-green-500">#{selectedElement.id}</span>}
            {selectedElement.className && (
              <span className="text-yellow-500">.{selectedElement.className.split(' ')[0]}</span>
            )}
          </div>
          {selectedElement.textContent && (
            <div className="text-bolt-elements-text-secondary mt-1 truncate text-xs">
              "{selectedElement.textContent}"
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-bolt-elements-border-color flex border-b">
        {(['styles', 'computed', 'box'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm capitalize ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-bolt-elements-text-secondary hover:text-black'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto p-3">
        {activeTab === 'styles' && (
          <div className="space-y-2">
            {Object.entries(getRelevantStyles(selectedElement.styles)).map(([prop, value]) => (
              <div key={prop} className="flex justify-between text-sm">
                <span className="text-bolt-elements-text-secondary">{prop}:</span>
                <span className="font-mono text-black">{value}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'box' && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-bolt-elements-text-secondary">Width:</span>
              <span className="text-black">{Math.round(selectedElement.rect.width)}px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bolt-elements-text-secondary">Height:</span>
              <span className="text-black">{Math.round(selectedElement.rect.height)}px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bolt-elements-text-secondary">Top:</span>
              <span className="text-black">{Math.round(selectedElement.rect.top)}px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bolt-elements-text-secondary">Left:</span>
              <span className="text-black">{Math.round(selectedElement.rect.left)}px</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
