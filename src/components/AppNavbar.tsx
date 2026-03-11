import { Calculator, Database, BookOpen, FolderOpen } from 'lucide-react';

export type TabType = 'calculator' | 'ingredients' | 'recipes' | 'categories';

interface AppNavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const AppNavbar = ({ activeTab, onTabChange }: AppNavbarProps) => {
  const tabs = [
    { id: 'calculator' as TabType, label: 'คำนวณสูตร', icon: Calculator },
    { id: 'ingredients' as TabType, label: 'ฐานข้อมูล', icon: Database },
    { id: 'recipes' as TabType, label: 'สูตรที่บันทึก', icon: BookOpen },
    { id: 'categories' as TabType, label: 'หมวดหมู่', icon: FolderOpen },
  ];

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
                  activeTab === tab.id
                    ? 'tab-active'
                    : 'tab-inactive border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="status-online text-primary-foreground/70">
            <span className="status-dot" />
            Online
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AppNavbar;
