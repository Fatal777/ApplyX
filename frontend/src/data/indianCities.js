/**
 * Comprehensive Indian Cities Data
 * ALL major cities across India with job availability tracking
 */

export const ALL_INDIAN_CITIES = [
    // Tech Hubs & Metro Cities
    { name: "Bangalore", state: "Karnataka", tier: 1, techHub: true },
    { name: "Bengaluru", state: "Karnataka", tier: 1, techHub: true }, // Alternate name
    { name: "Mumbai", state: "Maharashtra", tier: 1, techHub: true },
    { name: "Delhi", state: "Delhi", tier: 1, techHub: true },
    { name: "Hyderabad", state: "Telangana", tier: 1, techHub: true },
    { name: "Pune", state: "Maharashtra", tier: 1, techHub: true },
    { name: "Chennai", state: "Tamil Nadu", tier: 1, techHub: true },
    { name: "Kolkata", state: "West Bengal", tier: 1, techHub: true },

    // Tier 1 Cities
    { name: "Gurgaon", state: "Haryana", tier: 1, techHub: true },
    { name: "Gurugram", state: "Haryana", tier: 1, techHub: true }, // Alternate name
    { name: "Noida", state: "Uttar Pradesh", tier: 1, techHub: true },
    { name: "Greater Noida", state: "Uttar Pradesh", tier: 1 },
    { name: "Ghaziabad", state: "Uttar Pradesh", tier: 1 },
    { name: "Ahmedabad", state: "Gujarat", tier: 1 },
    { name: "Jaipur", state: "Rajasthan", tier: 1 },
    { name: "Chandigarh", state: "Chandigarh", tier: 1 },

    // Tier 2 Cities - Major
    { name: "Kochi", state: "Kerala", tier: 2 },
    { name: "Cochin", state: "Kerala", tier: 2 }, // Alternate name
    { name: "Thiruvananthapuram", state: "Kerala", tier: 2 },
    { name: "Trivandrum", state: "Kerala", tier: 2 }, // Alternate name
    { name: "Coimbatore", state: "Tamil Nadu", tier: 2 },
    { name: "Indore", state: "Madhya Pradesh", tier: 2 },
    { name: "Nagpur", state: "Maharashtra", tier: 2 },
    { name: "Visakhapatnam", state: "Andhra Pradesh", tier: 2 },
    { name: "Vizag", state: "Andhra Pradesh", tier: 2 }, // Alternate name
    { name: "Bhopal", state: "Madhya Pradesh", tier: 2 },
    { name: "Lucknow", state: "Uttar Pradesh", tier: 2 },
    { name: "Vadodara", state: "Gujarat", tier: 2 },
    { name: "Surat", state: "Gujarat", tier: 2 },
    { name: "Mysore", state: "Karnataka", tier: 2 },
    { name: "Mysuru", state: "Karnataka", tier: 2 }, // Alternate name
    { name: "Mangalore", state: "Karnataka", tier: 2 },
    { name: "Mangaluru", state: "Karnataka", tier: 2 }, // Alternate name

    // Tier 2 Cities - Growing
    { name: "Bhubaneswar", state: "Odisha", tier: 2 },
    { name: "Mohali", state: "Punjab", tier: 2 },
    { name: "Panchkula", state: "Haryana", tier: 2 },
    { name: "Guwahati", state: "Assam", tier: 2 },
    { name: "Patna", state: "Bihar", tier: 2 },
    { name: "Kanpur", state: "Uttar Pradesh", tier: 2 },
    { name: "Agra", state: "Uttar Pradesh", tier: 2 },
    { name: "Varanasi", state: "Uttar Pradesh", tier: 2 },
    { name: "Ranchi", state: "Jharkhand", tier: 2 },
    { name: "Raipur", state: "Chhattisgarh", tier: 2 },
    { name: "Bhubaneshwar", state: "Odisha", tier: 2 },

    // Tier 3 Cities
    { name: "Nashik", state: "Maharashtra", tier: 3 },
    { name: "Aurangabad", state: "Maharashtra", tier: 3 },
    { name: "Rajkot", state: "Gujarat", tier: 3 },
    { name: "Ludhiana", state: "Punjab", tier: 3 },
    { name: "Jalandhar", state: "Punjab", tier: 3 },
    { name: "Amritsar", state: "Punjab", tier: 3 },
    { name: "Madurai", state: "Tamil Nadu", tier: 3 },
    { name: "Trichy", state: "Tamil Nadu", tier: 3 },
    { name: "Tiruchirappalli", state: "Tamil Nadu", tier: 3 },
    { name: "Salem", state: "Tamil Nadu", tier: 3 },
    { name: "Vellore", state: "Tamil Nadu", tier: 3 },
    { name: "Pondicherry", state: "Puducherry", tier: 3 },
    { name: "Puducherry", state: "Puducherry", tier: 3 },
    { name: "Dehradun", state: "Uttarakhand", tier: 3 },
    { name: "Haridwar", state: "Uttarakhand", tier: 3 },
    { name: "Shimla", state: "Himachal Pradesh", tier: 3 },
    { name: "Jammu", state: "Jammu and Kashmir", tier: 3 },
    { name: "Srinagar", state: "Jammu and Kashmir", tier: 3 },
    { name: "Imphal", state: "Manipur", tier: 3 },
    { name: "Shillong", state: "Meghalaya", tier: 3 },
    { name: "Gangtok", state: "Sikkim", tier: 3 },
    { name: "Agartala", state: "Tripura", tier: 3 },
    { name: "Aizawl", state: "Mizoram", tier: 3 },
    { name: "Itanagar", state: "Arunachal Pradesh", tier: 3 },
    { name: "Kohima", state: "Nagaland", tier: 3 },
    { name: "Panaji", state: "Goa", tier: 3 },
    { name: "Panjim", state: "Goa", tier: 3 },
    { name: "Port Blair", state: "Andaman and Nicobar Islands", tier: 3 },
];

export const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
    "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
    "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
    "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Chandigarh", "Jammu and Kashmir", "Puducherry", "Andaman and Nicobar Islands"
];

// Engineering Job Roles
export const JOB_ROLES = [
    "Software Engineer", "Software Developer", "SDE", "SDE-1", "SDE-2", "SDE-3",
    "Backend Developer", "Backend Engineer",
    "Frontend Developer", "Frontend Engineer", "UI Developer",
    "Full Stack Developer", "Full Stack Engineer", "Fullstack Developer",
    "DevOps Engineer", "DevOps Specialist", "Site Reliability Engineer", "SRE",
    "QA Engineer", "QA Automation Engineer", "Test Engineer", "SDET",
    "Data Engineer", "Data Scientist", "ML Engineer", "Machine Learning Engineer",
    "AI Engineer", "Artificial Intelligence Engineer",
    "Cloud Engineer", "AWS Engineer", "Azure Engineer", "GCP Engineer",
    "Mobile Developer", "Android Developer", "iOS Developer", "React Native Developer",
    "Tech Lead", "Engineering Manager", "Architect", "Solution Architect",
    "Security Engineer", "Cybersecurity Engineer", "InfoSec Engineer",
    "Embedded Engineer", "Firmware Engineer", "Hardware Engineer",
    "Network Engineer", "Systems Engineer", "Platform Engineer",
];

// Technology Fields
export const TECH_FIELDS = [
    "Software Development", "Web Development", "Mobile Development",
    "Data Science", "Machine Learning", "Artificial Intelligence",
    "DevOps", "Cloud Computing", "Cybersecurity",
    "Quality Assurance", "Backend Development", "Frontend Development",
    "Full Stack Development", "Database Administration", "System Administration",
];

// Programming Languages
export const PROGRAMMING_LANGUAGES = [
    "Python", "JavaScript", "Java", "TypeScript", "C++", "C#", "C",
    "Go", "Golang", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
    "Scala", "R", "MATLAB", "Perl", "Shell", "Bash",
    "SQL", "HTML", "CSS", "Dart", "Elixir", "Haskell",
];

// Tech Stack / Frameworks
export const TECH_STACK = [
    "React", "React.js", "Angular", "Vue.js", "Vue", "Svelte",
    "Node.js", "Express.js", "Next.js", "Nest.js",
    "Django", "Flask", "FastAPI", "Spring Boot", "Spring",
    "ASP.NET", ".NET Core", "Laravel", "Ruby on Rails",
    "TensorFlow", "PyTorch", "Keras", "Scikit-learn",
    "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes",
    "MongoDB", "PostgreSQL", "MySQL", "Redis", "Elasticsearch",
    "Git", "Jenkins", "CI/CD", "Terraform", "Ansible",
];

// Search Categories
export const SEARCH_CATEGORIES = [
    { value: "location", label: "Location", icon: "📍" },
    { value: "role", label: "Job Role", icon: "💼" },
    { value: "field", label: "Field", icon: "🎯" },
    { value: "language", label: "Language", icon: "💻" },
    { value: "stack", label: "Tech Stack", icon: "🛠️" },
];

// Get data for specific category
export const getCategoryData = (category) => {
    const dataMap = {
        location: ALL_INDIAN_CITIES.map(c => c.name),
        role: JOB_ROLES,
        field: TECH_FIELDS,
        language: PROGRAMMING_LANGUAGES,
        stack: TECH_STACK,
    };
    return dataMap[category] || [];
};

// Group cities by state
export const citiesByState = ALL_INDIAN_CITIES.reduce((acc, city) => {
    const state = city.state;
    if (!acc[state]) {
        acc[state] = [];
    }
    if (!acc[state].includes(city.name)) {
        acc[state].push(city.name);
    }
    return acc;
}, {});

// Tech hubs only
export const TECH_HUBS = ALL_INDIAN_CITIES
    .filter(city => city.techHub)
    .map(city => city.name)
    .filter((name, index, self) => self.indexOf(name) === index); // Remove duplicates
