import React, { useState } from 'react';
import { Plus, FileText, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onAddArchive: () => void;
  onAddFolder: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onAddArchive,
  onAddFolder
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-24 right-6 z-40">
      {/* Action Menu */}
      <div className={cn(
        "absolute bottom-16 right-0 transition-all duration-200 transform",
        isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2 pointer-events-none"
      )}>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => handleAction(onAddArchive)}
            className="h-12 px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground shadow-lg"
            size="sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            Add Archive
          </Button>
          <Button
            onClick={() => handleAction(onAddFolder)}
            className="h-12 px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground shadow-lg"
            size="sm"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Add Folder
          </Button>
        </div>
      </div>

      {/* Main FAB */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200",
          isOpen && "rotate-45"
        )}
        size="sm"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
};