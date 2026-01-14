import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

interface SidebarProps {
  onConnectBank?: () => void;
  onCopyCpf?: () => void;
  isWidgetOpen?: boolean;
}

export function Sidebar({ onConnectBank, onCopyCpf, isWidgetOpen }: SidebarProps) {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-card text-foreground border-r border-border flex-col z-50">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-primary" fill="currentColor" />
          <h1 className="text-xl font-semibold">Pluggy Expenses</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {/* Menu items can be added here in the future */}
      </nav>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-3">
        {onCopyCpf && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyCpf}
            className="w-full"
          >
            Copiar CPF
          </Button>
        )}
        {onConnectBank && (
          <Button
            size="lg"
            onClick={onConnectBank}
            disabled={isWidgetOpen}
            className="w-full"
          >
            Conectar Bancos
          </Button>
        )}
      </div>
    </aside>
  );
}
