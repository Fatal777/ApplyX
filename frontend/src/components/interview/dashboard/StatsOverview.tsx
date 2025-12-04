/**
 * Stats Overview Component
 * Clean, minimal performance metrics - Notion/Wellfound inspired
 * Aligned with ApplyX light theme design system
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
  MessageSquare,
  Award,
  Brain,
  Mic,
  Users
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

// Progress Ring Component - Light Theme
const ProgressRing = ({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  color = '#22c55e'
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
        stroke="#e5e7eb"
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
      />
    </svg>
  );
};

// Stat Card Component - Light Theme
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  suffix = '',
  trend,
  iconBg = 'bg-lime-100',
  iconColor = 'text-lime-600',
  delay = 0
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  trend?: number;
  iconBg?: string;
  iconColor?: string;
  delay?: number;
}) => {
  const animatedValue = useAnimatedCounter(value, 2000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          
          {/* Value */}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{animatedValue}</span>
            <span className="text-sm text-gray-400">{suffix}</span>
          </div>
          
          {/* Label */}
          <p className="text-gray-500 text-sm mt-1">{label}</p>
          
          {/* Trend */}
          {trend !== undefined && (
            <div className={`
              flex items-center gap-1 mt-2 text-xs font-medium
              ${trend >= 0 ? 'text-green-600' : 'text-red-500'}
            `}>
              <TrendingUp className={`w-3.5 h-3.5 ${trend < 0 ? 'rotate-180' : ''}`} />
              <span>{trend >= 0 ? '+' : ''}{trend}% this week</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const StatsOverview = ({ detailed = false }: StatsOverviewProps) => {
  // Fetch interview sessions for stats
  const { data: sessions } = useQuery({
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
      iconBg: 'bg-lime-100',
      iconColor: 'text-lime-600',
      trend: 15
    },
    { 
      icon: Target, 
      label: 'Average Score', 
      value: stats.avgScore, 
      suffix: '%',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: stats.improvementRate
    },
    { 
      icon: Clock, 
      label: 'Hours Practiced', 
      value: stats.hoursSpent, 
      suffix: 'hrs',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    { 
      icon: Zap, 
      label: 'Day Streak', 
      value: stats.streak, 
      suffix: 'days',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
  ];

  // Detailed stats for analytics view
  const detailedStats = [
    { icon: Award, label: 'Best Score', value: 95, suffix: '%', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { icon: Brain, label: 'Questions Answered', value: 247, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    { icon: Mic, label: 'Voice Quality', value: 88, suffix: '%', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { icon: Users, label: 'Compared to Others', value: 78, suffix: '%', iconBg: 'bg-pink-100', iconColor: 'text-pink-600' },
    { icon: Star, label: 'Top Skill', value: 92, suffix: '%', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
    { icon: MessageSquare, label: 'Follow-ups Handled', value: 156, iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryStats.map((stat, index) => (
          <StatCard
            key={stat.label}
            {...stat}
            delay={index * 0.05}
          />
        ))}
      </div>

      {/* Detailed View - Additional Stats & Charts */}
      {detailed && (
        <>
          {/* Secondary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {detailedStats.map((stat, index) => (
                <StatCard
                  key={stat.label}
                  {...stat}
                  delay={0.4 + index * 0.05}
                />
              ))}
            </div>
          </motion.div>

          {/* Performance Overview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Overall Progress Ring */}
            <Card className="border border-gray-200 rounded-xl">
              <CardContent className="p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Overall Performance</h3>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <ProgressRing progress={stats.avgScore || 75} size={180} strokeWidth={12} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-gray-900">{stats.avgScore || 75}</span>
                      <span className="text-gray-500 text-sm">Overall Score</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills Breakdown */}
            <Card className="border border-gray-200 rounded-xl">
              <CardContent className="p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Skills Breakdown</h3>
                <div className="space-y-5">
                  {[
                    { skill: 'Communication', score: 85, color: '#22c55e' },
                    { skill: 'Technical Knowledge', score: 78, color: '#6366f1' },
                    { skill: 'Problem Solving', score: 82, color: '#f59e0b' },
                    { skill: 'Confidence', score: 70, color: '#ef4444' },
                  ].map((item) => (
                    <div key={item.skill}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 font-medium">{item.skill}</span>
                        <span className="text-gray-900 font-semibold">{item.score}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* Quick Progress Bar (for overview) */}
      {!detailed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border border-gray-200 rounded-xl bg-gradient-to-r from-lime-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-gray-900 font-semibold">Weekly Goal Progress</h3>
                  <p className="text-gray-500 text-sm">3 of 5 interviews completed</p>
                </div>
                <span className="text-lime-600 font-bold text-lg">60%</span>
              </div>
              <div className="h-3 bg-white/60 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-lime-400 to-lime-500"
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ duration: 1, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default StatsOverview;
