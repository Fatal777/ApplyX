import React from 'react';
import { motion } from "framer-motion";

// --- Types ---
interface Testimonial {
    text: string;
    image: string;
    name: string;
    role: string;
}

// --- Data - Updated testimonials for ApplyX job platform ---
const testimonials: Testimonial[] = [
    {
        text: "ApplyX completely transformed my job search. The AI resume analysis helped me optimize my CV, and I landed my dream job at a top tech company within 3 weeks!",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Priya Sharma",
        role: "Software Engineer at Google",
    },
    {
        text: "The job matching algorithm is incredibly accurate. It understood my skills and only showed me relevant positions. Saved me hours of scrolling through irrelevant listings.",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Rahul Verma",
        role: "Product Manager at Meta",
    },
    {
        text: "As a fresh graduate, I was struggling to get interviews. ApplyX's resume builder and ATS optimization tips helped me get 5 interview calls in my first week!",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Ananya Patel",
        role: "Data Analyst at Amazon",
    },
    {
        text: "The mock interview feature with AI is a game-changer. It helped me practice and build confidence before my actual interviews. Highly recommended!",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Vikram Singh",
        role: "Backend Developer at Flipkart",
    },
    {
        text: "I switched from traditional job portals to ApplyX and the difference is night and day. The AI-powered insights are unmatched in the industry.",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Sneha Reddy",
        role: "UX Designer at Swiggy",
    },
    {
        text: "What I love most is how it aggregates jobs from multiple sources. One platform, all the opportunities. Plus, the UI is beautifully designed!",
        image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Neha Gupta",
        role: "Marketing Manager at Zomato",
    },
    {
        text: "The job-specific resume analysis is brilliant. It showed me exactly which keywords I was missing for each application. My callback rate tripled!",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Arjun Menon",
        role: "DevOps Engineer at Razorpay",
    },
    {
        text: "ApplyX made my career transition smooth. The skill gap analysis and personalized recommendations were exactly what I needed.",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Kavitha Iyer",
        role: "Cloud Architect at Microsoft",
    },
    {
        text: "Finally, a job platform that understands the Indian market! Remote jobs, startup opportunities, and enterprise roles - all in one place.",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Aditya Joshi",
        role: "Full Stack Developer at CRED",
    },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

// --- Sub-Components ---
const TestimonialsColumn = (props: {
    className?: string;
    testimonials: Testimonial[];
    duration?: number;
}) => {
    return (
        <div className={props.className}>
            <motion.ul
                animate={{
                    translateY: "-50%",
                }}
                transition={{
                    duration: props.duration || 10,
                    repeat: Infinity,
                    ease: "linear",
                    repeatType: "loop",
                }}
                className="flex flex-col gap-6 pb-6 bg-transparent transition-colors duration-300 list-none m-0 p-0"
            >
                {[
                    ...new Array(2).fill(0).map((_, index) => (
                        <React.Fragment key={index}>
                            {props.testimonials.map(({ text, image, name, role }, i) => (
                                <motion.li
                                    key={`${index}-${i}`}
                                    aria-hidden={index === 1 ? "true" : "false"}
                                    tabIndex={index === 1 ? -1 : 0}
                                    whileHover={{
                                        scale: 1.03,
                                        y: -8,
                                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                                        transition: { type: "spring", stiffness: 400, damping: 17 }
                                    }}
                                    whileFocus={{
                                        scale: 1.03,
                                        y: -8,
                                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                                        transition: { type: "spring", stiffness: 400, damping: 17 }
                                    }}
                                    className="p-8 md:p-10 rounded-3xl border border-neutral-200 shadow-lg shadow-black/5 max-w-xs w-full bg-white transition-all duration-300 cursor-default select-none group focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                    <blockquote className="m-0 p-0">
                                        <p className="text-neutral-600 leading-relaxed font-normal m-0 transition-colors duration-300 text-sm md:text-base">
                                            {text}
                                        </p>
                                        <footer className="flex items-center gap-3 mt-6">
                                            <img
                                                width={40}
                                                height={40}
                                                src={image}
                                                alt={`Avatar of ${name}`}
                                                className="h-10 w-10 rounded-full object-cover ring-2 ring-neutral-100 group-hover:ring-primary/30 transition-all duration-300 ease-in-out"
                                            />
                                            <div className="flex flex-col">
                                                <cite className="font-semibold not-italic tracking-tight leading-5 text-neutral-900 transition-colors duration-300">
                                                    {name}
                                                </cite>
                                                <span className="text-xs md:text-sm leading-5 tracking-tight text-neutral-500 mt-0.5 transition-colors duration-300">
                                                    {role}
                                                </span>
                                            </div>
                                        </footer>
                                    </blockquote>
                                </motion.li>
                            ))}
                        </React.Fragment>
                    )),
                ]}
            </motion.ul>
        </div>
    );
};

const TestimonialsSection = () => {
    return (
        <section
            aria-labelledby="testimonials-heading"
            className="bg-white py-16 md:py-24 relative overflow-hidden"
        >
            <motion.div
                initial={{ opacity: 0, y: 50, rotate: -2 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                    duration: 1.2,
                    ease: [0.16, 1, 0.3, 1],
                    opacity: { duration: 0.8 }
                }}
                className="container px-4 z-10 mx-auto"
            >
                <div className="flex flex-col items-center justify-center max-w-[540px] mx-auto mb-12 md:mb-16">
                    <div className="flex justify-center">
                        <div className="border border-neutral-300 py-1 px-4 rounded-full text-xs font-semibold tracking-wide uppercase text-neutral-600 bg-neutral-100/50">
                            Testimonials
                        </div>
                    </div>

                    <h2 id="testimonials-heading" className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mt-6 text-center text-neutral-900">
                        Loved by Job Seekers
                    </h2>
                    <p className="text-center mt-4 md:mt-5 text-neutral-500 text-base md:text-lg leading-relaxed max-w-sm">
                        Discover how thousands of candidates landed their dream jobs with ApplyX.
                    </p>
                </div>

                <div
                    className="flex justify-center gap-4 md:gap-6 mt-8 md:mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[600px] md:max-h-[740px] overflow-hidden"
                    role="region"
                    aria-label="Scrolling Testimonials"
                >
                    <TestimonialsColumn testimonials={firstColumn} duration={15} />
                    <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
                    <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
                </div>
            </motion.div>
        </section>
    );
};

export default TestimonialsSection;
