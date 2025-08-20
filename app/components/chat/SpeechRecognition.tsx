import { Button } from '~/components/ui/Button';
import { Icon } from '~/components/ui';

export const SpeechRecognitionButton = ({
  isListening,
  onStart,
  onStop,
  disabled,
  speechRecognitionSupported = true,
}: {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
  speechRecognitionSupported?: boolean;
}) => {
  const getTitle = () => {
    if (!speechRecognitionSupported) {
      return 'Speech recognition not supported in this browser';
    }

    if (disabled) {
      return 'Speech recognition unavailable while streaming';
    }

    return isListening ? 'Stop listening' : 'Start speech recognition';
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      title={getTitle()}
      disabled={disabled}
      onClick={
        isListening
          ? onStop
          : () => {
              console.log('Hey');
              onStart();
            }
      }
    >
      {isListening ? <Icon.MicrophoneMute /> : <Icon.Microphone />}
    </Button>
  );
};
