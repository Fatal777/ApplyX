/**
 * Stats Overview Component
 * Premium performance metrics with animated counters and progress rings
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Zap,
  Star,
  Calendar,
  MessageSquare,
  Award,
  Brain,
  Mic,
  Users
} from 'lucide-react';
import interviewService from '@/services/interviewService';

interface StatsOverviewProps {
  detailed?: boolean;
}

// Animated Counter Hook
const useAnimatedCounter = (target: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return count;
};

// Progress Ring Component
const ProgressRing = ({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  color = '#c7ff6b'
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
        style={{
          filter: `drop-shadow(0 0 10px ${color}40)`
        }}
      />
    </svg>
  );
};

// Stat Card Component
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  suffix = '',
  trend,
  color = '#c7ff6b',
  delay = 0
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  trend?: number;
  color?: string;
  delay?: number;
}) => {
  const animatedValue = useAnimatedCounter(value, 2000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="relative group"
    >
      <div className="
        relative p-6 rounded-2xl overflow-hidden
        bg-white/[0.03] backdrop-blur-xl
        border border-white/[0.08]
        hover:border-white/[0.15] hover:bg-white/[0.05]
        transition-all duration-500
      ">
        {/* Glow Effect */}
        <div 
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `radial-gradient(circle, ${color}20 0%, transparent 70%)` }}
        />
        
        {/* Icon */}
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        
        {/* Value */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">{animatedValue}</span>
          <span className="text-lg text-gray-400">{suffix}</span>
        </div>
        
        {/* Label */}
        <p className="text-gray-400 text-sm mt-1">{label}</p>
        
        {/* Trend */}
        {trend !== undefined && (
          <div className={`
            flex items-center gap-1 mt-3 text-sm
            ${trend >= 0 ? 'text-[#c7ff6b]' : 'text-red-400'}
          `}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{trend >= 0 ? '+' : ''}{trend}% this week</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const StatsOverview = ({ detailed = false }: StatsOverviewProps) => {
  // Fetch interview sessions for stats
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['interviewSessions'],
    queryFn: () => interviewService.listSessions(50, 0),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate stats from sessions
  const stats = {
    totalInterviews: sessions?.length || 0,
    avgScore: sessions?.length 
      ? Math.round(sessions.reduce((acc, s) => acc + ((s.config as any)?.feedback?.overall_score || 0), 0) / sessions.length)
      : 0,
    hoursSpent: Math.round((sessions?.length || 0) * 0.5), // Estimate 30min per interview
    streak: 5, // Placeholder - would need date logic
    completionRate: sessions?.length 
      ? Math.round((sessions.filter(s => s.status === 'completed').length / sessions.length) * 100)
      : 0,
    improvementRate: 12, // Placeholder
  };

  // Primary stats for overview
  const primaryStats = [
    { 
      icon: Trophy, 
      label: 'Total Interviews', 
      value: stats.totalInterviews, 
      color: '#c7ff6b',
      trend: 15
    },
    { 
      icon: Target, 
      label: 'Average Score', 
      value: stats.avgScore, 
      suffix: '%',
      color: '#6366f1',
      trend: stats.improvementRate
    },
    { 
      icon: Clock, 
      label: 'Hours Practiced', 
      value: stats.hoursSpent, 
      suffix: 'hrs',
      color: '#f59e0b'
    },
    { 
      icon: Zap, 
      label: 'Day Streak', 
      value: stats.streak, 
      suffix: 'days',
      color: '#ef4444'
    },
  ];

  // Detailed stats for analytics view
  const detailedStats = [
    { icon: Award, label: 'Best Score', value: 95, suffix: '%', color: '#c7ff6b' },
    { icon: Brain, label: 'Questions Answered', value: 247, color: '#6366f1' },
    { icon: Mic, label: 'Voice Quality', value: 88, suffix: '%', color: '#f59e0b' },
    { icon: Users, label: 'Compared to Others', value: 78, suffix: '%', color: '#ef4444' },
    { icon: Star, label: 'Top Skill', value: 92, suffix: '%', color: '#8b5cf6' },
    { icon: MessageSquare, label: 'Follow-ups Handled', value: 156, color: '#10b981' },
  ];

  return (
    <div className="space-y-8">
      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryStats.map((stat, index) => (
          <StatCard
            key={stat.label}
            {...stat}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Detailed View - Additional Stats & Charts */}
      {detailed && (
        <>
          {/* Secondary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-xl font-semibold text-white mb-4">Detailed Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {detailedStats.map((stat, index) => (
                <StatCard
                  key={stat.label}
                  {...stat}
                  delay={0.6 + index * 0.1}
                />
              ))}
            </div>
          </motion.div>

          {/* Performance Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Overall Progress Ring */}
            <div className="
              p-8 rounded-2xl
              bg-white/[0.03] backdrop-blur-xl
              border border-white/[0.08]
            ">
              <h3 className="text-lg font-semibold text-white mb-6">Overall Performance</h3>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <ProgressRing progress={stats.avgScore || 75} size={180} strokeWidth={12} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-white">{stats.avgScore || 75}</span>
                    <span className="text-gray-400 text-sm">Overall Score</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills Breakdown */}
            <div className="
              p-8 rounded-2xl
              bg-white/[0.03] backdrop-blur-xl
              border border-white/[0.08]
            ">
              <h3 className="text-lg font-semibold text-white mb-6">Skills Breakdown</h3>
              <div className="space-y-4">
                {[
                  { skill: 'Communication', score: 85, color: '#c7ff6b' },
                  { skill: 'Technical Knowledge', score: 78, color: '#6366f1' },
                  { skill: 'Problem Solving', score: 82, color: '#f59e0b' },
                  { skill: 'Confidence', score: 70, color: '#ef4444' },
                ].map((item) => (
                  <div key={item.skill}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{item.skill}</span>
                      <span className="text-white font-medium">{item.score}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: item.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Quick Progress Bar (for overview) */}
      {!detailed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="
            p-6 rounded-2xl
            bg-gradient-to-r from-primary/20 to-purple-600/20
            border border-primary/30
          "
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Weekly Goal Progress</h3>
              <p className="text-gray-400 text-sm">3 of 5 interviews completed</p>
            </div>
            <span className="text-[#c7ff6b] font-bold text-lg">60%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#c7ff6b] to-[#a8e063]"
              initial={{ width: 0 }}
              animate={{ width: '60%' }}
              transition={{ duration: 1, delay: 0.7, ease: [0.4, 0, 0.2, 1] }}
              style={{
                boxShadow: '0 0 20px rgba(199, 255, 107, 0.5)'
              }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default StatsOverview;
