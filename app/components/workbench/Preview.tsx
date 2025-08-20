import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import {
  showDeviceModeAtom,
  selectedWindowSizeAtom,
  isLandscapeAtom,
  widthPercentAtom,
  currentWidthAtom,
  currentHeightAtom,
  customWidthAtom,
  customHeightAtom,
  previewContainerRefAtom,
  WINDOW_SIZES,
} from '~/lib/stores/previews';
import { ScreenshotSelector } from './ScreenshotSelector';

import type { ElementInfo } from './Inspector';
import { cn } from '~/utils/cn';
import { DeviceSizePanel } from './device-size-panel';
import { LoadingSpinner } from '~/components/ui/loading-spinner';

type ResizeSide = 'left' | 'right' | 'bottom' | null;

interface PreviewProps {
  setSelectedElement?: (element: ElementInfo | null) => void;
  isInspectorMode?: boolean;
  toggleInspectorMode?: () => void;
}

const SCALING_FACTOR = 1;

export const Preview = memo(({ setSelectedElement, isInspectorMode = false }: PreviewProps) => {
  // Use store states for device responsiveness
  const showDeviceMode = useStore(showDeviceModeAtom);
  const selectedWindowSize = useStore(selectedWindowSizeAtom);
  const isLandscape = useStore(isLandscapeAtom);

  const widthPercent = useStore(widthPercentAtom);
  const currentWidth = useStore(currentWidthAtom);
  const currentHeight = useStore(currentHeightAtom);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const hasSelectedPreview = useRef(false);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [iframeUrl, setIframeUrl] = useState<string | undefined>();
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const resizingState = useRef({
    isResizing: false,
    side: null as ResizeSide,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    pointerId: null as number | null,
  });

  useEffect(() => {
    if (!activePreview) {
      setIframeUrl(undefined);

      return;
    }

    const { baseUrl } = activePreview;
    setIframeUrl(baseUrl);
  }, [activePreview]);

  const findMinPortIndex = useCallback(
    (minIndex: number, preview: { port: number }, index: number, array: { port: number }[]) => {
      return preview.port < array[minIndex].port ? index : minIndex;
    },
    [],
  );

  useEffect(() => {
    if (previews.length > 1 && !hasSelectedPreview.current) {
      const minPortIndex = previews.reduce(findMinPortIndex, 0);
      setActivePreviewIndex(minPortIndex);
    }
  }, [previews, findMinPortIndex]);

  const startResizing = (e: React.PointerEvent, side: ResizeSide) => {
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    document.body.style.userSelect = 'none';

    // Set cursor based on resize direction
    if (side === 'left' || side === 'right') {
      document.body.style.cursor = 'ew-resize';
    } else if (side === 'bottom') {
      document.body.style.cursor = 'ns-resize';
    }

    resizingState.current = {
      isResizing: true,
      side,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      pointerId: e.pointerId,
    };
  };

  const ResizeHandle = ({ side }: { side: ResizeSide }) => {
    if (!side) {
      return null;
    }

    const isVertical = side === 'left' || side === 'right';

    return (
      <div
        className={`resize-handle-${side} bg-darken-400 flex touch-none items-center justify-center rounded-full select-none`}
        onPointerDown={(e) => startResizing(e, side)}
        style={{
          position: 'absolute',
          ...(isVertical
            ? {
                top: '45%',
                height: '80px',
                width: '6px',
                ...(side === 'left' ? { left: '-10px' } : { right: '-10px' }),
              }
            : {
                left: '45%',
                width: '80px',
                height: '6px',
                cursor: 'ns-resize',
                bottom: '-10px',
              }),
          transition: 'scale 0.2s',
          cursor: isVertical ? 'ew-resize' : 'ns-resize',
          zIndex: 10,
        }}
        onMouseOver={(e) => (e.currentTarget.style.scale = '1.1')}
        onMouseOut={(e) => (e.currentTarget.style.scale = '1')}
        title={`Drag to resize ${isVertical ? 'width' : 'height'}`}
      />
    );
  };

  /**
   * Lifecycle
   */
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const state = resizingState.current;

      if (!state.isResizing || e.pointerId !== state.pointerId) {
        return;
      }

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      let newWidth = state.startWidth;
      let newHeight = state.startHeight;

      // Handle width resizing
      if (state.side === 'right') {
        newWidth = state.startWidth + dx;
      } else if (state.side === 'left') {
        newWidth = state.startWidth - dx;
      }

      // Handle height resizing
      if (state.side === 'bottom') {
        newHeight = state.startHeight + dy;
      }

      // Limit dimensions to reasonable bounds
      newWidth = Math.max(200, Math.min(newWidth, 2000));
      newHeight = Math.max(150, Math.min(newHeight, 1500));

      // Update dimensions and switch to custom mode
      currentWidthAtom.set(newWidth);
      currentHeightAtom.set(newHeight);
      customWidthAtom.set(newWidth);
      customHeightAtom.set(newHeight);

      // Switch to Custom device size when manually resizing
      const customDevice = WINDOW_SIZES[0]; // Custom is first in array
      selectedWindowSizeAtom.set({
        ...customDevice,
        width: newWidth,
        height: newHeight,
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      const state = resizingState.current;

      if (!state.isResizing || e.pointerId !== state.pointerId) {
        return;
      }

      // Find all resize handles
      const handles = document.querySelectorAll('.resize-handle-left, .resize-handle-right, .resize-handle-bottom');

      // Release pointer capture from any handle that has it
      handles.forEach((handle) => {
        if ((handle as HTMLElement).hasPointerCapture?.(e.pointerId)) {
          (handle as HTMLElement).releasePointerCapture(e.pointerId);
        }
      });

      // Reset state
      resizingState.current = {
        ...resizingState.current,
        isResizing: false,
        side: null,
        pointerId: null,
      };

      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    // Add event listeners
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

    // Define cleanup function
    function cleanupResizeListeners() {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);

      // Release any lingering pointer captures
      if (resizingState.current.pointerId !== null) {
        const handles = document.querySelectorAll('.resize-handle-left, .resize-handle-right, .resize-handle-bottom');
        handles.forEach((handle) => {
          if ((handle as HTMLElement).hasPointerCapture?.(resizingState.current.pointerId!)) {
            (handle as HTMLElement).releasePointerCapture(resizingState.current.pointerId!);
          }
        });

        // Reset state
        resizingState.current = {
          ...resizingState.current,
          isResizing: false,
          side: null,
          pointerId: null,
        };

        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    }

    // Return the cleanup function

    return cleanupResizeListeners;
  }, [SCALING_FACTOR]);

  useEffect(() => {
    const handleWindowResize = () => {
      // Update the window width in the resizing state
      resizingState.current.windowWidth = window.innerWidth;

      // Update the current width in pixels
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        currentWidthAtom.set(Math.round((containerWidth * widthPercent) / 100));
      }
    };

    window.addEventListener('resize', handleWindowResize);

    // Initial calculation of current width
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      currentWidthAtom.set(Math.round((containerWidth * widthPercent) / 100));
    }

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [widthPercent]);

  // Update current width and height when device mode is toggled or window size changes
  useEffect(() => {
    if (showDeviceMode && selectedWindowSize) {
      // Set dimensions based on selected window size
      const width = isLandscape ? selectedWindowSize.height : selectedWindowSize.width;
      const height = isLandscape ? selectedWindowSize.width : selectedWindowSize.height;

      currentWidthAtom.set(width);
      currentHeightAtom.set(height);

      // Calculate width percentage based on container and selected size
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const targetWidthPercent = (width / containerWidth) * 100;

        // Limit to reasonable bounds
        const boundedPercent = Math.max(10, Math.min(targetWidthPercent, 90));
        widthPercentAtom.set(boundedPercent);
      }
    } else if (containerRef.current) {
      // Not in device mode, use full container
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      currentWidthAtom.set(containerWidth);
      currentHeightAtom.set(containerHeight);
      widthPercentAtom.set(100);
    }
  }, [showDeviceMode, selectedWindowSize, isLandscape]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'INSPECTOR_READY') {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            {
              type: 'INSPECTOR_ACTIVATE',
              active: isInspectorMode,
            },
            '*',
          );
        }
      } else if (event.data.type === 'INSPECTOR_CLICK') {
        const element = event.data.elementInfo;

        navigator.clipboard.writeText(element.displayText).then(() => {
          setSelectedElement?.(element);
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [isInspectorMode]);

  // Send message to iframe when inspector mode changes
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'INSPECTOR_ACTIVATE',
          active: isInspectorMode,
        },
        '*',
      );
    }
  }, [isInspectorMode]);

  // Set container ref in the atom for use by other components
  useEffect(() => {
    previewContainerRefAtom.set(containerRef.current);
  }, []);

  return (
    <div ref={containerRef} className={`relative flex h-full w-full flex-col rounded-tl-xl border-t border-l`}>
      {showDeviceMode && <DeviceSizePanel />}

      <div className="flex flex-1 overflow-auto rounded-tl-xl">
        <div
          className={cn(
            'bg-darken-100 relative flex h-full w-full justify-center overflow-clip',
            showDeviceMode ? 'items-start pt-3' : 'items-center',
          )}
        >
          <div
            className={cn(
              'overflow-initial relative flex max-w-full items-center justify-center',
              showDeviceMode ? `max-h-[calc(100% - 3rem)]` : `h-full max-h-full w-full`,
            )}
            style={{
              width: showDeviceMode ? `${currentWidth}px` : '100%',
              height: showDeviceMode ? `${currentHeight}px` : '100%',
            }}
          >
            <div
              className={cn('relative overflow-hidden bg-white', showDeviceMode ? `rounded-2xl` : 'h-full w-full')}
              style={{
                width: showDeviceMode ? `${currentWidth}px` : '100%',
                height: showDeviceMode ? `${currentHeight}px` : '100%',
              }}
            >
              {activePreview ? (
                <>
                  <iframe
                    ref={iframeRef}
                    title="preview"
                    className="no-scrollbar h-full w-full border-none"
                    src={iframeUrl}
                    style={{
                      zoom: showDeviceMode ? '0.65' : '1',
                      transformOrigin: 'top left',
                    }}
                    sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
                    allow="geolocation; ch-ua-full-version-list; cross-origin-isolated; screen-wake-lock; publickey-credentials-get; shared-storage-select-url; ch-ua-arch; bluetooth; compute-pressure; ch-prefers-reduced-transparency; deferred-fetch; usb; ch-save-data; publickey-credentials-create; shared-storage; deferred-fetch-minimal; run-ad-auction; ch-ua-form-factors; ch-downlink; otp-credentials; payment; ch-ua; ch-ua-model; ch-ect; autoplay; camera; private-state-token-issuance; accelerometer; ch-ua-platform-version; idle-detection; private-aggregation; interest-cohort; ch-viewport-height; local-fonts; ch-ua-platform; midi; ch-ua-full-version; xr-spatial-tracking; clipboard-read; gamepad; display-capture; keyboard-map; join-ad-interest-group; ch-width; ch-prefers-reduced-motion; browsing-topics; encrypted-media; gyroscope; serial; ch-rtt; ch-ua-mobile; window-management; unload; ch-dpr; ch-prefers-color-scheme; ch-ua-wow64; attribution-reporting; fullscreen; identity-credentials-get; private-state-token-redemption; hid; ch-ua-bitness; storage-access; sync-xhr; ch-device-memory; ch-viewport-width; picture-in-picture; magnetometer; clipboard-write; microphone"
                  />

                  <ScreenshotSelector
                    isSelectionMode={isSelectionMode}
                    setIsSelectionMode={setIsSelectionMode}
                    containerRef={iframeRef}
                  />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <LoadingSpinner spinnerSize="md" />
                </div>
              )}
            </div>

            {showDeviceMode && (
              <>
                <ResizeHandle side="left" />
                <ResizeHandle side="right" />
                <ResizeHandle side="bottom" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
