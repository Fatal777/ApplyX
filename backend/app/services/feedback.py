"""Feedback generation service for resume analysis"""

import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class FeedbackService:
    """Service for generating actionable resume feedback"""
    
    @staticmethod
    def generate_feedback(analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive feedback based on analysis"""
        
        score = analysis.get('score', 0)
        sections = analysis.get('sections', {})
        skills = analysis.get('skills', [])
        experience = analysis.get('experience', [])
        education = analysis.get('education', [])
        completeness_score = analysis.get('completeness_score', 0)
        keyword_density_score = analysis.get('keyword_density_score', 0)
        
        # Generate overall feedback
        if score >= 80:
            overall = "Excellent resume! Your resume is well-structured and comprehensive."
        elif score >= 60:
            overall = "Good resume with room for improvement. Consider the suggestions below."
        elif score >= 40:
            overall = "Your resume needs significant improvements to stand out."
        else:
            overall = "Your resume requires major revisions. Focus on the critical areas below."
        
        # Identify strengths
        strengths = []
        if completeness_score >= 80:
            strengths.append("Well-organized with all essential sections")
        if len(skills) >= 10:
            strengths.append(f"Strong skills section with {len(skills)} identified skills")
        if len(experience) >= 2:
            strengths.append(f"Good work history with {len(experience)} positions")
        if 'summary' in sections:
            strengths.append("Includes professional summary")
        if keyword_density_score >= 70:
            strengths.append("Good keyword optimization")
        
        # Identify weaknesses
        weaknesses = []
        if completeness_score < 60:
            weaknesses.append("Missing essential sections")
        if len(skills) < 5:
            weaknesses.append("Limited skills listed - add more relevant skills")
        if len(experience) < 1:
            weaknesses.append("No work experience found - add your professional history")
        if len(education) < 1:
            weaknesses.append("No education information found")
        if keyword_density_score < 50:
            weaknesses.append("Low keyword density - add more industry-relevant terms")
        if 'summary' not in sections:
            weaknesses.append("Missing professional summary")
        
        # Generate suggestions
        suggestions = []
        
        # Section-specific suggestions
        if 'experience' not in sections or len(experience) < 2:
            suggestions.append("Add more detailed work experience with specific achievements and metrics")
        
        if 'skills' not in sections or len(skills) < 8:
            suggestions.append("Expand your skills section with both technical and soft skills")
        
        if 'education' not in sections or len(education) < 1:
            suggestions.append("Include your educational background with degrees and institutions")
        
        if 'summary' not in sections:
            suggestions.append("Add a compelling professional summary at the top of your resume")
        
        if 'certifications' not in sections:
            suggestions.append("Consider adding relevant certifications or licenses")
        
        if 'projects' not in sections:
            suggestions.append("Showcase your projects to demonstrate practical experience")
        
        # Keyword suggestions
        if keyword_density_score < 70:
            suggestions.append("Incorporate more industry-specific keywords and action verbs")
        
        # Formatting suggestions
        suggestions.append("Use bullet points to highlight key achievements")
        suggestions.append("Quantify your accomplishments with numbers and metrics")
        suggestions.append("Keep your resume to 1-2 pages maximum")
        
        # Calculate formatting score (based on text structure)
        formatting_score = 75.0  # Default score
        
        feedback = {
            'overall_feedback': overall,
            'strengths': strengths if strengths else ["Consider adding more content to identify strengths"],
            'weaknesses': weaknesses if weaknesses else ["No major weaknesses identified"],
            'suggestions': suggestions[:10],  # Limit to top 10 suggestions
            'completeness_score': completeness_score,
            'keyword_density_score': keyword_density_score,
            'formatting_score': formatting_score,
            'overall_score': score
        }
        
        logger.info(f"Generated feedback with {len(suggestions)} suggestions")
        return feedback
    
    @staticmethod
    def generate_improvement_tips(analysis: Dict[str, Any]) -> List[str]:
        """Generate specific improvement tips"""
        tips = []
        
        sections = analysis.get('sections', {})
        skills = analysis.get('skills', [])
        experience = analysis.get('experience', [])
        
        # Experience tips
        if len(experience) > 0:
            tips.append("Use action verbs like 'Led', 'Developed', 'Managed', 'Implemented'")
            tips.append("Include specific metrics and results (e.g., 'Increased sales by 25%')")
        
        # Skills tips
        if len(skills) < 15:
            tips.append("Add more relevant technical skills for your industry")
            tips.append("Include both hard skills (technical) and soft skills (communication, leadership)")
        
        # General tips
        tips.extend([
            "Tailor your resume for each job application",
            "Use a clean, professional format with consistent spacing",
            "Proofread carefully for grammar and spelling errors",
            "Use reverse chronological order for experience",
            "Include relevant keywords from the job description",
            "Keep descriptions concise and impactful",
            "Remove outdated or irrelevant information",
            "Use professional email address and contact information"
        ])
        
        return tips[:8]  # Return top 8 tips
