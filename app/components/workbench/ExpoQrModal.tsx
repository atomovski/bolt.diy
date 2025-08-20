import React from 'react';
import { Dialog, DialogTitle, DialogDescription, DialogRoot } from '~/components/ui/Dialog';
import { useStore } from '@nanostores/react';
import { expoUrlAtom } from '~/lib/stores/qrCodeStore';
import { QRCode } from 'react-qrcode-logo';

interface ExpoQrModalProps {
  open: boolean;
  onClose: () => void;
}

export const ExpoQrModal: React.FC<ExpoQrModalProps> = ({ open, onClose }) => {
  const expoUrl = useStore(expoUrlAtom);

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog
        className="mx-auto! max-w-md! flex-col! text-center text-center!"
        showCloseButton={true}
        onClose={onClose}
      >
        <div className="border-bolt-elements-border-color! bg-bolt-elements-background-depth-2 flex flex-col items-center justify-center gap-5 rounded-md border p-6">
          <div className="i-bolt:expo-brand dark:invert-none h-10 w-full invert"></div>
          <DialogTitle className="text-bolt-elements-text-tertiary text-lg leading-6 font-semibold">
            Preview on your own mobile device
          </DialogTitle>
          <DialogDescription className="bg-darken-50 border-bolt-elements-border-color max-w-sm rounded-md border p-1">
            Scan this QR code with the Expo Go app on your mobile device to open your project.
          </DialogDescription>
          <div className="my-6 flex flex-col items-center">
            {expoUrl ? (
              <QRCode
                logoImage="/favicon.svg"
                removeQrCodeBehindLogo={true}
                logoPadding={3}
                logoHeight={50}
                logoWidth={50}
                logoPaddingStyle="square"
                style={{
                  borderRadius: 16,
                  padding: 2,
                  backgroundColor: '#8a5fff',
                }}
                value={expoUrl}
                size={200}
              />
            ) : (
              <div className="text-center text-gray-500">No Expo URL detected.</div>
            )}
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
};
