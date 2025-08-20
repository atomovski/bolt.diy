import { memo, useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import {
  selectedWindowSizeAtom,
  customWidthAtom,
  customHeightAtom,
  WINDOW_SIZES,
  isLandscapeAtom,
} from '~/lib/stores/previews';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Icon, Input, Toggle, Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui';

const CUSTOM_DEVICE_NAME = 'Custom';
const MIN_DIMENSION = 1;
const CUSTOM_DEVICE_INDEX = 0;

export const DeviceSizePanel = memo(() => {
  /**
   * State
   */
  const selectedWindowSize = useStore(selectedWindowSizeAtom);
  const customWidth = useStore(customWidthAtom);
  const customHeight = useStore(customHeightAtom);
  const isLandscape = useStore(isLandscapeAtom);

  const [widthInput, setWidthInput] = useState<string>('');
  const [heightInput, setHeightInput] = useState<string>('');

  const customDevice = useMemo(() => WINDOW_SIZES[CUSTOM_DEVICE_INDEX], []);

  /**
   * Functions
   */
  const handleDeviceSelect = useCallback((value: string) => {
    const device = WINDOW_SIZES.find((size) => size.name === value);

    if (device) {
      selectedWindowSizeAtom.set(device);

      if (device.name !== CUSTOM_DEVICE_NAME) {
        customWidthAtom.set(device.width);
        customHeightAtom.set(device.height);
      }
    }
  }, []);

  const updateDimensions = useCallback(
    (width: number, height: number) => {
      selectedWindowSizeAtom.set({
        ...customDevice,
        width,
        height,
      });
      customWidthAtom.set(width);
      customHeightAtom.set(height);
    },
    [customDevice],
  );

  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setWidthInput(value);

      const numValue = parseInt(value, 10);

      if (!isNaN(numValue) && numValue >= MIN_DIMENSION) {
        const currentHeight = parseInt(heightInput, 10) || customHeight;
        updateDimensions(numValue, currentHeight);
      }
    },
    [heightInput, customHeight, updateDimensions],
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setHeightInput(value);

      const numValue = parseInt(value, 10);

      if (!isNaN(numValue) && numValue >= MIN_DIMENSION) {
        const currentWidth = parseInt(widthInput, 10) || customWidth;
        updateDimensions(currentWidth, numValue);
      }
    },
    [widthInput, customWidth, updateDimensions],
  );

  const handleInputBlur = useCallback(() => {
    // Ensure valid values on blur
    const width = parseInt(widthInput, 10);
    const height = parseInt(heightInput, 10);

    if (isNaN(width) || width < MIN_DIMENSION) {
      setWidthInput(selectedWindowSize.width.toString());
    }

    if (isNaN(height) || height < MIN_DIMENSION) {
      setHeightInput(selectedWindowSize.height.toString());
    }
  }, [widthInput, heightInput, selectedWindowSize]);

  /**
   * Lifecycle
   */
  useEffect(() => {
    const width = selectedWindowSize.name === CUSTOM_DEVICE_NAME ? customWidth : selectedWindowSize.width;
    const height = selectedWindowSize.name === CUSTOM_DEVICE_NAME ? customHeight : selectedWindowSize.height;

    setWidthInput(width.toString());
    setHeightInput(height.toString());
  }, [selectedWindowSize, customWidth, customHeight]);

  const dimensionInputs = useMemo(
    () => [
      { label: 'W', value: widthInput, onChange: handleWidthChange },
      { label: 'H', value: heightInput, onChange: handleHeightChange },
    ],
    [widthInput, heightInput, handleWidthChange, handleHeightChange],
  );

  /**
   * Return
   */
  return (
    <div className="flex w-full items-center justify-between p-2">
      <div className="flex items-center">
        <Select value={selectedWindowSize.name} onValueChange={handleDeviceSelect}>
          <SelectTrigger className="w-[180px] data-[size=default]:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOW_SIZES.map((size) => (
              <SelectItem key={size.name} value={size.name}>
                {size.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 text-base">
        {dimensionInputs.map(({ label, value, onChange }) => (
          <div key={label} className="relative">
            <span className="absolute top-2 left-2.5 text-sm opacity-70">{label}</span>
            <Input
              type="number"
              value={value}
              inputSize="sm"
              onChange={onChange}
              onBlur={handleInputBlur}
              className="bg-darken-100 max-w-[88px] [appearance:textfield] border-none pl-7.5 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              min={MIN_DIMENSION}
            />
          </div>
        ))}
      </div>

      <div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={isLandscape}
              onPressedChange={() => isLandscapeAtom.set(!isLandscape)}
              aria-label="Toggle landscape view"
            >
              <Icon.SmartphoneDevice className="size-4 rotate-90" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent align="end" side="bottom" sideOffset={4}>
            Landscape
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});
