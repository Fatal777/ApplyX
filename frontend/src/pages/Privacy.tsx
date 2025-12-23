import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Database, Mail, FileText } from "lucide-react";

const Privacy = () => {
    const lastUpdated = "December 23, 2025";

    const sections = [
        {
            icon: Database,
            title: "Information We Collect",
            content: [
                "Account information (email, name) when you sign up",
                "Resume data you upload for analysis",
                "Usage data to improve our services",
                "Authentication data via Google OAuth"
            ]
        },
        {
            icon: Lock,
            title: "How We Use Your Information",
            content: [
                "To provide AI-powered resume analysis and feedback",
                "To enable mock interview features",
                "To personalize job recommendations",
                "To improve our services and user experience"
            ]
        },
        {
            icon: Shield,
            title: "Data Protection",
            content: [
                "All data is encrypted in transit and at rest",
                "We use industry-standard security practices",
                "Access to user data is strictly controlled",
                "Regular security audits and updates"
            ]
        },
        {
            icon: Eye,
            title: "Your Privacy Rights",
            content: [
                "Access your personal data at any time",
                "Request deletion of your account and data",
                "Opt-out of marketing communications",
                "Export your data in a portable format"
            ]
        },
        {
            icon: FileText,
            title: "Third-Party Services",
            content: [
                "Google OAuth for secure authentication",
                "Supabase for data storage",
                "AI services for resume analysis",
                "Analytics to improve user experience"
            ]
        },
        {
            icon: Mail,
            title: "Contact Us",
            content: [
                "For privacy concerns: contact@applyx.in",
                "We respond to all inquiries within 48 hours",
                "Report data breaches immediately",
                "Request data access or deletion"
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="bg-black text-white py-16">
                <div className="container mx-auto px-4">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
                        <p className="text-xl text-gray-400">
                            Your privacy matters to us. Here's how we protect your data.
                        </p>
                        <p className="text-sm text-gray-500 mt-4">Last updated: {lastUpdated}</p>
                    </motion.div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto">
                    {/* Introduction */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg mb-8"
                    >
                        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                            ApplyX ("we", "our", or "us") is committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, disclose, and safeguard
                            your information when you use our resume analysis and job search platform.
                        </p>
                    </motion.div>

                    {/* Sections */}
                    <div className="grid gap-6">
                        {sections.map((section, index) => (
                            <motion.div
                                key={section.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (index + 2) }}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <section.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {section.title}
                                    </h2>
                                </div>
                                <ul className="space-y-3">
                                    {section.content.map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                                            <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>

                    {/* Footer */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-12 text-center text-gray-500 dark:text-gray-400"
                    >
                        <p>
                            By using ApplyX, you agree to this Privacy Policy.
                            If you have questions, contact us at{" "}
                            <a href="mailto:contact@applyx.in" className="text-primary hover:underline">
                                contact@applyx.in
                            </a>
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
