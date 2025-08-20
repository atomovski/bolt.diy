import React from 'react';

interface FilePreviewProps {
  files: File[];
  imageDataList: string[];
  onRemove: (index: number) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ files, imageDataList, onRemove }) => {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className="bg-darken-50 border-b-none border-bolt-elements-border-color mx-2 -mt-1 flex flex-row overflow-x-auto rounded-lg rounded-b-none border p-2">
      {files.map((file, index) => (
        <div key={file.name + file.size} className="relative mr-2">
          {imageDataList[index] && (
            <div className="relative">
              <img src={imageDataList[index]} alt={file.name} className="max-h-20 rounded-lg" />
              <button
                onClick={() => onRemove(index)}
                className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black shadow-md transition-colors hover:bg-gray-900"
              >
                <div className="i-ph:x h-3 w-3 text-gray-200" />
              </button>
              <div className="text-bolt-elements-text-tertiary bg-bolt-elements-background-depth-2 absolute bottom-0 flex h-5 w-full items-center rounded-b-lg px-2 text-xs font-thin">
                <span className="truncate">{file.name}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FilePreview;
