import { Calculator, Database, BookOpen, FolderOpen, ShoppingCart, Shield, LogOut, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Profile } from '@/hooks/useAuth';

export type TabType = 'calculator' | 'ingredients' | 'recipes' | 'categories' | 'orders';

interface AppNavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  profile?: Profile | null;
  role?: 'super_admin' | 'admin' | 'user' | null;
  onSignOut?: () => void;
  onAdmin?: () => void;
}

const AppNavbar = ({ activeTab, onTabChange, profile, role, onSignOut, onAdmin }: AppNavbarProps) => {
  const tabs = [
    { id: 'calculator' as TabType, label: 'คำนวณสูตร', icon: Calculator },
    { id: 'ingredients' as TabType, label: 'ฐานข้อมูล', icon: Database },
    { id: 'recipes' as TabType, label: 'สูตรที่บันทึก', icon: BookOpen },
    { id: 'categories' as TabType, label: 'หมวดหมู่', icon: FolderOpen },
    { id: 'orders' as TabType, label: 'ใบสั่งซื้อ', icon: ShoppingCart },
  ];

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : profile?.username?.slice(0, 2)?.toUpperCase() || 'U';

  return (
    <nav className="nav-bar shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Calculator className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-wide text-primary-foreground">
                Pro Recipe Costing
              </h1>
              <p className="text-xs text-primary-foreground/60">
                ระบบคำนวณต้นทุนอาหารมืออาชีพ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-all border-b-[3px] ${
                  activeTab === tab.id ? 'tab-active' : 'tab-inactive border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors outline-none">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium leading-tight">{profile.full_name || profile.username}</p>
                  <p className="text-[10px] text-primary-foreground/50">{profile.position || role}</p>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                  <User className="w-3 h-3 mr-2" /> {profile.username}
                </DropdownMenuItem>
                {(role === 'admin' || role === 'super_admin') && onAdmin && (
                  <DropdownMenuItem onClick={onAdmin}>
                    <Shield className="w-4 h-4 mr-2" /> จัดการระบบ (Admin)
                  </DropdownMenuItem>
                )}
                {onSignOut && (
                  <DropdownMenuItem onClick={onSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> ออกจากระบบ
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="status-online text-primary-foreground/70">
              <span className="status-dot" />
              Online
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AppNavbar;
