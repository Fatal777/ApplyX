/**
 * AdminPanel Page - Superadmin Dashboard
 * Shows stats, user management, and audit logs
 * Only accessible to superadmin users
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    DollarSign,
    TrendingUp,
    Calendar,
    Search,
    Shield,
    Crown,
    Activity,
    ChevronRight,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Admin API calls with Basic Auth - use the API domain
const API_URL = import.meta.env.VITE_API_URL || 'https://api.applyx.in';
const ADMIN_API_BASE = `${API_URL}/api/v1/nexus-control`;

interface DashboardStats {
    users: {
        total: number;
        today: number;
        this_week: number;
        this_month: number;
    };
    subscriptions: {
        free: number;
        basic: number;
        pro: number;
        pro_plus: number;
    };
    revenue: {
        total: number;
        today: number;
        this_week: number;
        this_month: number;
        currency: string;
    };
    interviews: {
        total: number;
        today: number;
        completed: number;
        completion_rate: number;
    };
    resumes: {
        total: number;
        today: number;
    };
}

interface UserData {
    id: number;
    email: string;
    full_name: string | null;
    phone: string | null;
    created_at: string;
    last_login: string | null;
    subscription: {
        plan: string;
        status: string;
    } | null;
}

const AdminPanel = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' });
    const [showAuthDialog, setShowAuthDialog] = useState(true);

    // Check if user needs to authenticate
    useEffect(() => {
        const savedAuth = sessionStorage.getItem('adminAuth');
        if (savedAuth) {
            const { username, password } = JSON.parse(savedAuth);
            setAdminCredentials({ username, password });
            setShowAuthDialog(false);
        }
    }, []);

    // Fetch dashboard data
    const fetchDashboard = async () => {
        if (!adminCredentials.username) return;

        setLoading(true);
        setError(null);

        const authHeader = 'Basic ' + btoa(`${adminCredentials.username}:${adminCredentials.password}`);

        try {
            const [dashboardRes, usersRes] = await Promise.all([
                fetch(`${ADMIN_API_BASE}/dashboard`, {
                    headers: { Authorization: authHeader }
                }),
                fetch(`${ADMIN_API_BASE}/users?limit=20`, {
                    headers: { Authorization: authHeader }
                })
            ]);

            if (!dashboardRes.ok || !usersRes.ok) {
                if (dashboardRes.status === 401 || usersRes.status === 401) {
                    sessionStorage.removeItem('adminAuth');
                    setShowAuthDialog(true);
                    throw new Error('Invalid admin credentials');
                }
                throw new Error('Failed to fetch admin data');
            }

            const dashboardData = await dashboardRes.json();
            const usersData = await usersRes.json();

            setStats(dashboardData);
            setUsers(usersData.users || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (adminCredentials.username && !showAuthDialog) {
            fetchDashboard();
        }
    }, [adminCredentials, showAuthDialog]);

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        sessionStorage.setItem('adminAuth', JSON.stringify(adminCredentials));
        setShowAuthDialog(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Auth Dialog
    if (showAuthDialog) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-2 border-primary/20">
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#c7ff6b] to-[#a8e063] mx-auto mb-4 flex items-center justify-center">
                                <Shield className="w-8 h-8 text-black" />
                            </div>
                            <CardTitle className="text-2xl">Admin Access</CardTitle>
                            <p className="text-muted-foreground text-sm">Enter your admin credentials to continue</p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAdminLogin} className="space-y-4">
                                <div>
                                    <Input
                                        type="text"
                                        placeholder="Admin Username"
                                        value={adminCredentials.username}
                                        onChange={(e) => setAdminCredentials(prev => ({ ...prev, username: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <Input
                                        type="password"
                                        placeholder="Admin Password"
                                        value={adminCredentials.password}
                                        onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] text-black font-bold">
                                    Access Dashboard
                                </Button>
                                <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/dashboard')}>
                                    Back to Dashboard
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-center min-h-[60vh] pt-24">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center justify-center min-h-[60vh] pt-24">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={fetchDashboard}>Retry</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Crown className="w-8 h-8 text-[#c7ff6b]" />
                            Admin Dashboard
                        </h1>
                        <p className="text-muted-foreground">Manage users, view analytics, and monitor the platform</p>
                    </div>
                    <Button onClick={fetchDashboard} variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </Button>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Total Users */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-blue-100 text-sm">Total Users</p>
                                            <p className="text-4xl font-bold">{stats.users.total}</p>
                                            <p className="text-blue-100 text-xs mt-1">+{stats.users.today} today</p>
                                        </div>
                                        <Users className="w-12 h-12 text-blue-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Revenue */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card className="border-0 shadow-lg bg-gradient-to-br from-[#7fb832] to-[#5aa50f] text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-green-100 text-sm">Total Revenue</p>
                                            <p className="text-4xl font-bold">{formatCurrency(stats.revenue.total)}</p>
                                            <p className="text-green-100 text-xs mt-1">+{formatCurrency(stats.revenue.this_month)} this month</p>
                                        </div>
                                        <DollarSign className="w-12 h-12 text-green-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Interviews */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-purple-100 text-sm">Total Interviews</p>
                                            <p className="text-4xl font-bold">{stats.interviews.total}</p>
                                            <p className="text-purple-100 text-xs mt-1">{stats.interviews.completion_rate}% completion</p>
                                        </div>
                                        <Activity className="w-12 h-12 text-purple-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Subscriptions */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-orange-100 text-sm">Paid Users</p>
                                            <p className="text-4xl font-bold">{stats.subscriptions.basic + stats.subscriptions.pro + stats.subscriptions.pro_plus}</p>
                                            <p className="text-orange-100 text-xs mt-1">{stats.subscriptions.pro_plus} Pro+ users</p>
                                        </div>
                                        <TrendingUp className="w-12 h-12 text-orange-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {/* Subscription Breakdown */}
                {stats && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Subscription Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                    <p className="text-3xl font-bold text-gray-600">{stats.subscriptions.free}</p>
                                    <p className="text-sm text-muted-foreground">Free</p>
                                </div>
                                <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                    <p className="text-3xl font-bold text-blue-600">{stats.subscriptions.basic}</p>
                                    <p className="text-sm text-blue-600">Basic</p>
                                </div>
                                <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                    <p className="text-3xl font-bold text-green-600">{stats.subscriptions.pro}</p>
                                    <p className="text-sm text-green-600">Pro</p>
                                </div>
                                <div className="text-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                    <p className="text-3xl font-bold text-purple-600">{stats.subscriptions.pro_plus}</p>
                                    <p className="text-sm text-purple-600">Pro+</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Users Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Recent Users</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Phone</th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plan</th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Login</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users
                                        .filter(u =>
                                            !searchQuery ||
                                            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        )
                                        .map((u) => (
                                            <tr key={u.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <p className="font-medium">{u.full_name || 'No name'}</p>
                                                        <p className="text-sm text-muted-foreground">{u.email}</p>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm">{u.phone || '—'}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.subscription?.plan === 'pro_plus' ? 'bg-purple-100 text-purple-700' :
                                                        u.subscription?.plan === 'pro' ? 'bg-green-100 text-green-700' :
                                                            u.subscription?.plan === 'basic' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {u.subscription?.plan || 'free'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(u.created_at)}</td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(u.last_login)}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminPanel;
