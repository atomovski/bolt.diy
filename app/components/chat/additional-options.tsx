import {
  Icon,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui';

interface AdditionalOptionsProps {
  handleFileUpload: () => void;
}

export const AdditionalOptions = ({ handleFileUpload }: AdditionalOptionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Icon.Plus />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={5} align="end">
        <DropdownMenuItem
          onClick={() => {
            console.log('Add new feature clicked');
          }}
        >
          <div className="i-ph:code size-4.5"></div>
          <span>Download Code</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFileUpload}>
          <Icon.MediaImage />
          <span>Attach</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
