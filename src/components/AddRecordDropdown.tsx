import { useState } from 'react';
import { Plus, Upload, Pencil, Building2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AddRecordDropdownProps {
  onAddManually: () => void;
  onAddFromStatement: () => void;
}

const AddRecordDropdown = ({ onAddManually, onAddFromStatement }: AddRecordDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      label: 'Add from Statement',
      description: 'Upload bank statement to extract records',
      icon: Upload,
      onClick: () => {
        onAddFromStatement();
        setIsOpen(false);
      },
      disabled: false,
    },
    {
      label: 'Add Manually',
      description: 'Enter record details by hand',
      icon: Pencil,
      onClick: () => {
        onAddManually();
        setIsOpen(false);
      },
      disabled: false,
    },
    {
      label: 'Refresh from connected bank(s)',
      description: 'Coming soon',
      icon: Building2,
      onClick: () => {},
      disabled: true,
      comingSoon: true,
    },
  ];

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="h-12 px-6 rounded-xl gradient-primary hover:opacity-90 transition-opacity"
      >
        <Plus className="w-5 h-5 mr-2" />
        Add Record
        <ChevronDown className="w-4 h-4 ml-2" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Record</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 pt-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-start gap-3 p-4 rounded-xl transition-colors text-left border border-border",
                  item.disabled
                    ? "opacity-50 cursor-not-allowed bg-muted/30"
                    : "hover:bg-secondary hover:border-primary/20"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  item.disabled 
                    ? "bg-muted" 
                    : "bg-primary/10"
                )}>
                  <item.icon className={cn(
                    "w-5 h-5",
                    item.disabled ? "text-muted-foreground" : "text-primary"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      item.disabled ? "text-muted-foreground" : "text-foreground"
                    )}>
                      {item.label}
                    </span>
                    {item.comingSoon && (
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddRecordDropdown;
