"""Contact information extraction service for parsing resume data"""

import re
import logging
from typing import Dict, Optional, List

logger = logging.getLogger(__name__)


class ContactExtractor:
    """Extract contact information from resume text"""
    
    # Common Indian phone patterns
    PHONE_PATTERNS = [
        r'\+91[-\s]?\d{10}',  # +91 with 10 digits
        r'\+91[-\s]?\d{5}[-\s]?\d{5}',  # +91 XXXXX XXXXX
        r'91[-\s]?\d{10}',  # 91 with 10 digits
        r'\d{10}',  # Plain 10 digits
        r'\d{5}[-\s]\d{5}',  # XXXXX-XXXXX or XXXXX XXXXX
        r'\(\d{3}\)[-\s]?\d{3}[-\s]?\d{4}',  # (XXX) XXX-XXXX (US format)
        r'\d{3}[-\.\s]\d{3}[-\.\s]\d{4}',  # XXX-XXX-XXXX
    ]
    
    # Email pattern
    EMAIL_PATTERN = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    
    # Name extraction patterns - look at beginning of resume
    NAME_INDICATORS = [
        r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})',  # Capitalized words at start
    ]
    
    def extract_all(self, text: str) -> Dict[str, Optional[str]]:
        """
        Extract all contact information from resume text.
        Returns dict with name, email, phone.
        """
        if not text:
            return {"name": None, "email": None, "phone": None}
        
        return {
            "name": self.extract_name(text),
            "email": self.extract_email(text),
            "phone": self.extract_phone(text)
        }
    
    def extract_email(self, text: str) -> Optional[str]:
        """Extract primary email from text"""
        emails = re.findall(self.EMAIL_PATTERN, text, re.IGNORECASE)
        
        if not emails:
            return None
        
        # Filter out common non-personal emails
        filtered = [
            e for e in emails 
            if not any(x in e.lower() for x in ['noreply', 'support', 'info@', 'contact@', 'hr@', 'careers@'])
        ]
        
        # Prefer gmail/personal domains
        personal_emails = [e for e in filtered if any(x in e.lower() for x in ['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud'])]
        
        if personal_emails:
            return personal_emails[0].lower()
        
        return filtered[0].lower() if filtered else emails[0].lower()
    
    def extract_phone(self, text: str) -> Optional[str]:
        """Extract primary phone number from text"""
        # Try patterns in order of specificity
        for pattern in self.PHONE_PATTERNS:
            matches = re.findall(pattern, text)
            if matches:
                # Clean and format the phone number
                phone = matches[0]
                # Remove all non-digit characters except leading +
                cleaned = re.sub(r'[^\d+]', '', phone)
                
                # Ensure it looks like a valid phone
                digits_only = re.sub(r'\D', '', cleaned)
                if len(digits_only) >= 10:
                    # Format nicely
                    if cleaned.startswith('+91'):
                        return cleaned
                    elif len(digits_only) == 10:
                        return f"+91{digits_only}"
                    elif digits_only.startswith('91') and len(digits_only) == 12:
                        return f"+{digits_only}"
                    else:
                        return cleaned
        
        return None
    
    def extract_name(self, text: str) -> Optional[str]:
        """
        Extract candidate name from resume.
        Names are typically at the very top of the resume.
        """
        if not text:
            return None
        
        # Take first 500 chars - name is always at top
        header_text = text[:500]
        lines = header_text.split('\n')
        
        for line in lines[:5]:  # Check first 5 lines
            line = line.strip()
            if not line:
                continue
            
            # Skip if line is email or phone
            if '@' in line or re.search(r'\d{5,}', line):
                continue
            
            # Skip common headers
            skip_words = ['resume', 'cv', 'curriculum', 'vitae', 'objective', 'summary', 'experience', 'education', 'skills']
            if any(word in line.lower() for word in skip_words):
                continue
            
            # Check if line looks like a name (2-4 capitalized words)
            words = line.split()
            if 1 <= len(words) <= 4:
                # All words should start with capital or be connectors like "de", "van"
                name_words = []
                for word in words:
                    clean_word = re.sub(r'[^\w]', '', word)
                    if clean_word and (clean_word[0].isupper() or clean_word.lower() in ['de', 'van', 'von', 'la', 'el']):
                        name_words.append(clean_word)
                
                if len(name_words) >= 1 and len(name_words) == len(words):
                    name = ' '.join(name_words)
                    # Final validation - should be reasonable length
                    if 2 <= len(name) <= 50:
                        return name
        
        return None
    
    def get_extraction_confidence(self, extracted: Dict[str, Optional[str]]) -> Dict[str, float]:
        """
        Return confidence scores for each extracted field.
        Useful for deciding whether to auto-populate or ask user.
        """
        confidence = {}
        
        # Email confidence - regex is fairly reliable
        if extracted.get('email'):
            email = extracted['email']
            if any(x in email for x in ['gmail', 'yahoo', 'hotmail', 'outlook']):
                confidence['email'] = 0.95
            else:
                confidence['email'] = 0.85
        else:
            confidence['email'] = 0.0
        
        # Phone confidence - depends on format match
        if extracted.get('phone'):
            phone = extracted['phone']
            if phone.startswith('+91') and len(re.sub(r'\D', '', phone)) == 12:
                confidence['phone'] = 0.95  # Clear Indian mobile
            elif len(re.sub(r'\D', '', phone)) == 10:
                confidence['phone'] = 0.85
            else:
                confidence['phone'] = 0.70
        else:
            confidence['phone'] = 0.0
        
        # Name confidence - lower since names are trickier
        if extracted.get('name'):
            name = extracted['name']
            words = name.split()
            if 2 <= len(words) <= 3:  # First + Last or First + Middle + Last
                confidence['name'] = 0.80
            else:
                confidence['name'] = 0.60
        else:
            confidence['name'] = 0.0
        
        return confidence


# Singleton instance
contact_extractor = ContactExtractor()
