/**
 * Dashboard Sidebar Component
 * Glassmorphism navigation with smooth animations and neon accents
 */

import { motion } from 'framer-motion';
import {
  Home,
  Play,
  History,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  User
} from 'lucide-react';

type DashboardView = 'overview' | 'practice' | 'history' | 'analytics' | 'settings';

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'practice', label: 'Practice', icon: Play },
  { id: 'history', label: 'History', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface DashboardSidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  userName: string;
}

const DashboardSidebar = ({
  currentView,
  onViewChange,
  collapsed,
  onToggleCollapse,
  onLogout,
  userName
}: DashboardSidebarProps) => {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col relative z-10"
    >
      {/* Glass Background */}
      <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-xl border-r border-white/[0.08]" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-4">
        {/* Logo/Brand */}
        <div className="flex items-center justify-between mb-8">
          <motion.div 
            className="flex items-center gap-3"
            animate={{ opacity: collapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
          >
            {!collapsed && (
              <>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c7ff6b] to-[#a8e063] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div>
                  <span className="font-bold text-white text-lg">ApplyX</span>
                  <span className="block text-[10px] text-[#c7ff6b] uppercase tracking-widest">Interview</span>
                </div>
              </>
            )}
            {collapsed && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c7ff6b] to-[#a8e063] flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
            )}
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-300 relative overflow-hidden
                  ${isActive 
                    ? 'text-black' 
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                  }
                `}
              >
                {/* Active Background */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] rounded-xl"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                
                {/* Glow Effect for Active */}
                {isActive && (
                  <div className="absolute inset-0 bg-[#c7ff6b]/20 blur-xl rounded-xl" />
                )}
                
                <Icon className={`w-5 h-5 relative z-10 ${collapsed ? 'mx-auto' : ''}`} />
                
                {!collapsed && (
                  <span className="relative z-10 font-medium">{item.label}</span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="mt-auto space-y-4">
          {/* Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 rounded-lg
              text-gray-500 hover:text-white hover:bg-white/[0.05]
              transition-all duration-300"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>

          {/* User Profile */}
          <div className={`
            flex items-center gap-3 p-3 rounded-xl
            bg-white/[0.03] border border-white/[0.08]
            ${collapsed ? 'justify-center' : ''}
          `}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{userName}</p>
                <p className="text-gray-500 text-xs">Pro Member</p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              text-gray-400 hover:text-red-400 hover:bg-red-500/10
              transition-all duration-300
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
