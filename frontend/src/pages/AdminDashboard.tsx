import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Users, CreditCard, FileText, Mic, TrendingUp,
    DollarSign, Activity, Lock, RefreshCw, LogOut
} from 'lucide-react';

// Types
interface DashboardData {
    generated_at: string;
    users: { total: number; today: number; this_week: number; this_month: number };
    subscriptions: { free: number; basic: number; pro: number; pro_plus: number };
    revenue: { total: number; today: number; this_week: number; this_month: number };
    interviews: { total: number; today: number; completed: number; completion_rate: number };
    resumes: { total: number; today: number };
    applications: { total: number; today: number };
}

interface DailyData {
    date: string;
    signups: number;
    revenue: number;
    interviews: number;
    resumes: number;
}

// Simple Chart Components (no external dependencies)
const BarChart = ({ data, dataKey, color }: { data: DailyData[]; dataKey: keyof DailyData; color: string }) => {
    const max = Math.max(...data.map(d => Number(d[dataKey]) || 0), 1);

    return (
        <div className="flex items-end gap-1 h-40 w-full">
            {data.slice(-14).map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                        className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                        style={{
                            height: `${Math.max((Number(d[dataKey]) / max) * 100, 2)}%`,
                            backgroundColor: color
                        }}
                        title={`${d.date}: ${d[dataKey]}`}
                    />
                    <span className="text-[8px] text-gray-500 mt-1 rotate-[-45deg] origin-center">
                        {d.date.slice(5)}
                    </span>
                </div>
            ))}
        </div>
    );
};

const StatCard = ({ title, value, subtitle, icon: Icon, color }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color: string;
}) => (
    <Card className="relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-20 h-20 ${color} opacity-10 rounded-full -mr-8 -mt-8`} />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </CardContent>
    </Card>
);

const AdminDashboard = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [dailyData, setDailyData] = useState<DailyData[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('overview');

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const getAuthHeader = () => ({
        'Authorization': 'Basic ' + btoa(`${username}:${password}`),
        'Content-Type': 'application/json'
    });

    const fetchData = async (endpoint: string) => {
        const response = await fetch(`${API_BASE}/api/v1/nexus-control${endpoint}`, {
            headers: getAuthHeader()
        });
        if (!response.ok) {
            if (response.status === 401) {
                setIsAuthenticated(false);
                throw new Error('Session expired');
            }
            throw new Error('Failed to fetch');
        }
        return response.json();
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await fetchData('/dashboard');
            setDashboard(data);
            setIsAuthenticated(true);

            // Fetch additional data
            const [daily, usersData, paymentsData, interviewsData] = await Promise.all([
                fetchData('/analytics/daily?days=30'),
                fetchData('/users?limit=20'),
                fetchData('/payments?limit=20'),
                fetchData('/interviews?limit=20')
            ]);

            setDailyData(daily.daily_analytics);
            setUsers(usersData.users);
            setPayments(paymentsData.payments);
            setInterviews(interviewsData.interviews);
        } catch (err: any) {
            setError('Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        setLoading(true);
        try {
            const [data, daily, usersData, paymentsData, interviewsData] = await Promise.all([
                fetchData('/dashboard'),
                fetchData('/analytics/daily?days=30'),
                fetchData('/users?limit=20'),
                fetchData('/payments?limit=20'),
                fetchData('/interviews?limit=20')
            ]);

            setDashboard(data);
            setDailyData(daily.daily_analytics);
            setUsers(usersData.users);
            setPayments(paymentsData.payments);
            setInterviews(interviewsData.interviews);
        } catch (err) {
            console.error('Failed to refresh', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setUsername('');
        setPassword('');
        setDashboard(null);
    };

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-gray-800 border-gray-700">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-lime-500/20 rounded-full flex items-center justify-center mb-4">
                            <Lock className="h-6 w-6 text-lime-400" />
                        </div>
                        <CardTitle className="text-white">Admin Access</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <Input
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white"
                            />
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white"
                            />
                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            <Button
                                type="submit"
                                className="w-full bg-lime-500 hover:bg-lime-600 text-black"
                                disabled={loading}
                            >
                                {loading ? 'Authenticating...' : 'Access Dashboard'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Main Dashboard
    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold">ApplyX Admin Dashboard</h1>
                    <p className="text-gray-400 text-sm">
                        Last updated: {dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleString() : 'N/A'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={refreshData} variant="outline" size="sm" disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={handleLogout} variant="destructive" size="sm">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Total Users"
                    value={dashboard?.users.total || 0}
                    subtitle={`+${dashboard?.users.today || 0} today`}
                    icon={Users}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Total Revenue"
                    value={`₹${(dashboard?.revenue.total || 0).toLocaleString()}`}
                    subtitle={`+₹${dashboard?.revenue.today || 0} today`}
                    icon={DollarSign}
                    color="bg-green-500"
                />
                <StatCard
                    title="Interviews"
                    value={dashboard?.interviews.total || 0}
                    subtitle={`${dashboard?.interviews.completion_rate || 0}% completion`}
                    icon={Mic}
                    color="bg-purple-500"
                />
                <StatCard
                    title="Resumes"
                    value={dashboard?.resumes.total || 0}
                    subtitle={`+${dashboard?.resumes.today || 0} today`}
                    icon={FileText}
                    color="bg-orange-500"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-gray-800 p-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="users" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                        Payments
                    </TabsTrigger>
                    <TabsTrigger value="interviews" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                        Interviews
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Subscription Breakdown */}
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Subscription Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-gray-700 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-400">{dashboard?.subscriptions.free || 0}</div>
                                    <div className="text-sm text-gray-500">Free</div>
                                </div>
                                <div className="text-center p-4 bg-blue-900/50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-400">{dashboard?.subscriptions.basic || 0}</div>
                                    <div className="text-sm text-blue-300">Basic</div>
                                </div>
                                <div className="text-center p-4 bg-lime-900/50 rounded-lg">
                                    <div className="text-2xl font-bold text-lime-400">{dashboard?.subscriptions.pro || 0}</div>
                                    <div className="text-sm text-lime-300">Pro</div>
                                </div>
                                <div className="text-center p-4 bg-purple-900/50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-400">{dashboard?.subscriptions.pro_plus || 0}</div>
                                    <div className="text-sm text-purple-300">Pro+</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-blue-400" />
                                    Daily Signups (14 days)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarChart data={dailyData} dataKey="signups" color="#3B82F6" />
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-green-400" />
                                    Daily Revenue (14 days)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarChart data={dailyData} dataKey="revenue" color="#22C55E" />
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Mic className="h-5 w-5 text-purple-400" />
                                    Daily Interviews (14 days)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarChart data={dailyData} dataKey="interviews" color="#A855F7" />
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-orange-400" />
                                    Daily Resumes (14 days)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarChart data={dailyData} dataKey="resumes" color="#F97316" />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users">
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Recent Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-gray-400 border-b border-gray-700">
                                        <tr>
                                            <th className="text-left p-3">Email</th>
                                            <th className="text-left p-3">Name</th>
                                            <th className="text-left p-3">Plan</th>
                                            <th className="text-left p-3">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user, i) => (
                                            <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                                                <td className="p-3">{user.email}</td>
                                                <td className="p-3">{user.full_name || '-'}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${user.subscription?.plan === 'pro_plus' ? 'bg-purple-500/20 text-purple-300' :
                                                        user.subscription?.plan === 'pro' ? 'bg-lime-500/20 text-lime-300' :
                                                            user.subscription?.plan === 'basic' ? 'bg-blue-500/20 text-blue-300' :
                                                                'bg-gray-500/20 text-gray-300'
                                                        }`}>
                                                        {user.subscription?.plan || 'free'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-400">
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments">
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Recent Payments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-gray-400 border-b border-gray-700">
                                        <tr>
                                            <th className="text-left p-3">User</th>
                                            <th className="text-left p-3">Amount</th>
                                            <th className="text-left p-3">Plan</th>
                                            <th className="text-left p-3">Status</th>
                                            <th className="text-left p-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((payment, i) => (
                                            <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                                                <td className="p-3">{payment.user_email}</td>
                                                <td className="p-3 font-mono">₹{payment.amount}</td>
                                                <td className="p-3">{payment.plan || '-'}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${payment.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                                        payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                                            'bg-red-500/20 text-red-300'
                                                        }`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-400">
                                                    {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Interviews Tab */}
                <TabsContent value="interviews">
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Recent Interviews</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-gray-400 border-b border-gray-700">
                                        <tr>
                                            <th className="text-left p-3">User</th>
                                            <th className="text-left p-3">Type</th>
                                            <th className="text-left p-3">Score</th>
                                            <th className="text-left p-3">Status</th>
                                            <th className="text-left p-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {interviews.map((interview, i) => (
                                            <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                                                <td className="p-3">{interview.user_email}</td>
                                                <td className="p-3">{interview.type || '-'}</td>
                                                <td className="p-3 font-mono">
                                                    {interview.score ? `${interview.score}%` : '-'}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${interview.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                                        interview.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                                                            'bg-gray-500/20 text-gray-300'
                                                        }`}>
                                                        {interview.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-400">
                                                    {interview.created_at ? new Date(interview.created_at).toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminDashboard;
