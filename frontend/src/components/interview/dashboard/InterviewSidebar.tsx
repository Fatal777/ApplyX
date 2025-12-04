/**
 * Interview Sidebar Component
 * Clean, minimal Notion/Wellfound-inspired navigation
 * Aligned with ApplyX design system - light theme
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  User,
  ArrowLeft,
  MessageSquare,
  Mic,
  HelpCircle,
  BookOpen
} from 'lucide-react';

type DashboardView = 'overview' | 'practice' | 'history' | 'analytics' | 'settings';

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'practice', label: 'New Interview', icon: Play, badge: 'Start' },
  { id: 'history', label: 'Past Sessions', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const bottomNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface InterviewSidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  userName: string;
  userEmail?: string;
}

const InterviewSidebar = ({
  currentView,
  onViewChange,
  collapsed,
  onToggleCollapse,
  onLogout,
  userName,
  userEmail
}: InterviewSidebarProps) => {
  const navigate = useNavigate();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col bg-white border-r border-gray-200 relative z-10"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {!collapsed && (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
        
        {!collapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center shadow-sm">
                <MessageSquare className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Interview Prep</h2>
                <p className="text-xs text-gray-500">AI-powered practice</p>
              </div>
            </div>
          </motion.div>
        )}
        
        {collapsed && (
          <div className="mt-4 flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center shadow-sm">
              <MessageSquare className="w-5 h-5 text-black" />
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Section Label */}
        {!collapsed && (
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Main
          </p>
        )}
        
        {mainNavItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-150 relative group
                ${isActive 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              {/* Active Indicator */}
              {isActive && !collapsed && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-lime-500 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-gray-900' : ''}`} />
              
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className={`
                      text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${isActive 
                        ? 'bg-lime-400 text-black' 
                        : 'bg-gray-200 text-gray-600 group-hover:bg-lime-400 group-hover:text-black'
                      }
                      transition-colors
                    `}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="
                  absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible
                  transition-all whitespace-nowrap z-50
                ">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}

        {/* Resources Section */}
        {!collapsed && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Resources
              </p>
            </div>
            
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all">
              <BookOpen className="w-[18px] h-[18px]" />
              <span className="text-sm font-medium">Interview Tips</span>
            </button>
            
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all">
              <HelpCircle className="w-[18px] h-[18px]" />
              <span className="text-sm font-medium">Help & FAQ</span>
            </button>
          </>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        {/* Settings */}
        {bottomNavItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-150 relative group
                ${isActive 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className="w-[18px] h-[18px]" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}

        {/* User Profile */}
        <div className={`
          flex items-center gap-3 p-2.5 rounded-lg mt-2
          bg-gray-50 border border-gray-100
          ${collapsed ? 'justify-center' : ''}
        `}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{userEmail || 'Pro Member'}</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle & Logout */}
        <div className={`flex items-center gap-2 pt-2 ${collapsed ? 'flex-col' : ''}`}>
          <button
            onClick={onToggleCollapse}
            className="flex-1 flex items-center justify-center p-2 rounded-lg
              text-gray-400 hover:text-gray-600 hover:bg-gray-100
              transition-all duration-150"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={onLogout}
            className={`
              flex items-center justify-center gap-2 p-2 rounded-lg
              text-gray-400 hover:text-red-500 hover:bg-red-50
              transition-all duration-150
              ${collapsed ? 'w-full' : ''}
            `}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

export default InterviewSidebar;
