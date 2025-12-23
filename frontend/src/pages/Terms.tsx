import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Users, AlertTriangle, Scale, CreditCard, Ban } from "lucide-react";

const Terms = () => {
    const lastUpdated = "December 23, 2025";

    const sections = [
        {
            icon: Users,
            title: "Acceptance of Terms",
            content: [
                "By accessing ApplyX, you agree to these Terms of Service",
                "You must be at least 16 years old to use our services",
                "You are responsible for maintaining account security",
                "One account per person - no shared accounts"
            ]
        },
        {
            icon: FileText,
            title: "Use of Services",
            content: [
                "Use ApplyX for personal, non-commercial purposes",
                "Do not upload malicious content or malware",
                "Respect intellectual property rights",
                "Do not attempt to reverse engineer our AI systems"
            ]
        },
        {
            icon: Scale,
            title: "User Content",
            content: [
                "You retain ownership of your resume content",
                "You grant us license to process your content for analysis",
                "We may use anonymized data to improve our AI",
                "You are responsible for the accuracy of your data"
            ]
        },
        {
            icon: CreditCard,
            title: "Payments & Subscriptions",
            content: [
                "Free tier includes basic resume analysis",
                "Premium features require paid subscription",
                "Subscriptions auto-renew unless cancelled",
                "Refunds handled per our refund policy"
            ]
        },
        {
            icon: AlertTriangle,
            title: "Limitation of Liability",
            content: [
                "ApplyX is provided 'as is' without warranties",
                "We are not liable for job application outcomes",
                "Resume suggestions are AI-generated recommendations",
                "Use our service at your own discretion"
            ]
        },
        {
            icon: Ban,
            title: "Termination",
            content: [
                "We may suspend accounts violating these terms",
                "You can delete your account at any time",
                "Data deletion follows our Privacy Policy",
                "Termination does not affect accrued rights"
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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
                        <p className="text-xl text-gray-400">
                            Please read these terms carefully before using ApplyX.
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
                            Welcome to ApplyX! These Terms of Service ("Terms") govern your use of our
                            AI-powered resume analysis and job search platform. By using our services,
                            you agree to be bound by these Terms.
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
                                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                                        <section.icon className="w-6 h-6 text-accent" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {section.title}
                                    </h2>
                                </div>
                                <ul className="space-y-3">
                                    {section.content.map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                                            <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>

                    {/* Contact & Updates */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-8 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg"
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Changes to Terms
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300">
                            We may update these Terms from time to time. We will notify you of any
                            material changes by posting the new Terms on this page. Your continued
                            use of ApplyX after changes constitutes acceptance of the new Terms.
                        </p>
                    </motion.div>

                    {/* Footer */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                        className="mt-12 text-center text-gray-500 dark:text-gray-400"
                    >
                        <p>
                            Questions about these Terms? Contact us at{" "}
                            <a href="mailto:contact@applyx.in" className="text-primary hover:underline">
                                contact@applyx.in
                            </a>
                        </p>
                        <p className="mt-4">
                            <Link to="/privacy" className="text-primary hover:underline">
                                View our Privacy Policy
                            </Link>
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Terms;
