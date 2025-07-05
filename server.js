const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Google Gemini Configuration
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes
app.post('/api/generate-documents', async (req, res) => {
    try {
        const userData = req.body;
        
        // Validate required data
        if (!userData.personalInfo?.fullName || !userData.personalInfo?.email) {
            return res.status(400).json({ error: 'Missing required personal information' });
        }
        
        console.log('✅ Starting document generation...');
        console.log('User data received:', {
            personalInfo: userData.personalInfo.fullName,
            education: userData.education.length,
            experience: userData.experience.length,
            jobTarget: userData.jobTarget.targetRole
        });
        
        // Generate resume and cover letter using AI
        const [resume, coverLetter] = await Promise.all([
            generateResume(userData),
            generateCoverLetter(userData)
        ]);
        
        console.log('✅ Generated resume length:', resume ? resume.length : 'undefined');
        console.log('✅ Generated cover letter length:', coverLetter ? coverLetter.length : 'undefined');
        
        console.log('✅ Starting HTML formatting...');
        const formattedResume = formatResumeHTML(resume, userData);
        const formattedCoverLetter = formatCoverLetterHTML(coverLetter, userData);
        
        console.log('✅ Formatted resume length:', formattedResume ? formattedResume.length : 'undefined');
        console.log('✅ Formatted cover letter length:', formattedCoverLetter ? formattedCoverLetter.length : 'undefined');
        
        res.json({
            resume: formattedResume,
            coverLetter: formattedCoverLetter
        });
        
    } catch (error) {
        console.error('Error generating documents:', error);
        res.status(500).json({ error: 'Failed to generate documents' });
    }
});

app.post('/api/download-pdf', async (req, res) => {
    console.log('=== PDF DOWNLOAD REQUEST RECEIVED ===');
    
    try {
        const { content, type, filename } = req.body;
        
        console.log('PDF Request data:', {
            contentLength: content ? content.length : 'undefined',
            type: type,
            filename: filename
        });
        
        if (!content) {
            console.error('No content provided for PDF generation');
            return res.status(400).json({ error: 'No content provided' });
        }
        
        if (content.length < 10) {
            console.error('Content too short for PDF generation:', content.length);
            return res.status(400).json({ error: 'Content too short' });
        }
        
        console.log('Starting PDF generation...');
        const pdf = await generatePDF(content);
        console.log('PDF generated successfully, size:', pdf.length);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename || 'document.pdf'}"`);
        res.send(pdf);
        
        console.log('PDF sent to client successfully');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
});

// AI Generation Functions
async function generateResume(userData) {
    const prompt = createResumePrompt(userData);

    
    try {
        const systemPrompt = "You are a professional resume writer with expertise in creating compelling, ATS-friendly resumes. Create content that is professional, concise, and highlights the candidate's strengths.";
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;
        
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        
        const resumeText = response.text();
        console.log('✅ Resume generated by AI');
        
        return resumeText;
    } catch (error) {
        console.error('Gemini API error for resume:', error);
        console.log('Falling back to template-based resume generation');
        // Fallback to template-based generation
        return generateResumeTemplate(userData);
    }
}

async function generateCoverLetter(userData) {
    const prompt = createCoverLetterPrompt(userData);
    console.log('Cover letter prompt created, length:', prompt.length);
    
    try {
        const systemPrompt = "You are a professional cover letter writer. Create compelling, personalized cover letters that connect the candidate's experience to the target role.";
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;
        
        console.log('Sending cover letter request to Gemini API...');
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        
        const coverLetterText = response.text();
        console.log('Cover letter generated successfully, length:', coverLetterText.length);
        
        return coverLetterText;
    } catch (error) {
        console.error('Gemini API error for cover letter:', error);
        console.log('Falling back to template-based cover letter generation');
        // Fallback to template-based generation
        return generateCoverLetterTemplate(userData);
    }
}

function createResumePrompt(userData) {
    const { personalInfo, education, experience, jobTarget } = userData;
    
    return `Create a professional, ATS-friendly resume for ${personalInfo.fullName} applying for a ${jobTarget.targetRole} position. 

CANDIDATE INFORMATION:
Name: ${personalInfo.fullName}
Email: ${personalInfo.email}
Phone: ${personalInfo.phone}
${personalInfo.address ? `Address: ${personalInfo.address}` : ''}
${personalInfo.linkedin ? `LinkedIn: ${personalInfo.linkedin}` : ''}
${personalInfo.website ? `Website: ${personalInfo.website}` : ''}

EDUCATION:
${education.map(edu => `- ${edu.degree} in ${edu.field}, ${edu.school} ${edu.graduationYear ? `(${edu.graduationYear})` : ''} ${edu.gpa ? `GPA: ${edu.gpa}` : ''}`).join('\n')}

WORK EXPERIENCE:
${experience.map(exp => `${exp.jobTitle} at ${exp.company} ${exp.startDate ? `(${exp.startDate}` : ''}${exp.endDate ? ` - ${exp.endDate})` : exp.startDate ? ' - Present)' : ''}
Details: ${exp.responsibilities}`).join('\n\n')}

TARGET POSITION: ${jobTarget.targetRole}
${jobTarget.targetCompany ? `Target Company: ${jobTarget.targetCompany}` : ''}
${jobTarget.industry ? `Industry: ${jobTarget.industry}` : ''}
Experience Level: ${jobTarget.experienceLevel}
${jobTarget.skills ? `Key Skills: ${jobTarget.skills}` : ''}

${jobTarget.jobDescription ? `Job Description to match: ${jobTarget.jobDescription}` : ''}

${personalInfo.summary ? `Existing Summary: ${personalInfo.summary}` : ''}

INSTRUCTIONS:
Create a professional resume with EXACTLY these sections in this order:

1. SUMMARY OF QUALIFICATIONS (3-4 bullet points)
   - Write compelling bullet points that highlight the candidate's strongest qualifications
   - Focus on achievements, skills, and value proposition
   - Make each bullet specific and impactful

2. EDUCATION 
   - Format: University Name, School/College
   - Degree type, Major/Field
   - Location (City, State)
   - Graduation date
   - GPA if provided
   - Any relevant coursework, honors, or achievements

3. RELEVANT COURSEWORK (if applicable)
   - List specific courses related to the target role
   - Separate multiple courses with commas

4. TECHNICAL SKILLS (organize by category)
   - Programming Languages: [list]
   - Operating Systems: [list] 
   - Database: [list]
   - Software: [list]
   - Other relevant categories based on the field

5. RELEVANT EXPERIENCE
   - Format each entry as:
     Company Name, Location
     Job Title                                           Start Date - End Date
     • Specific achievement with quantifiable results
     • Another achievement focusing on impact
     • Technical skills or processes used
   
6. PROJECT EXPERIENCE (if applicable)
   - Similar format to work experience
   - Focus on technical projects, personal projects, or academic projects
   - Include technologies used and outcomes achieved

7. ADDITIONAL EXPERIENCE (if applicable)
   - Other relevant roles that show leadership, responsibility
   - Keep descriptions brief but impactful

FORMATTING REQUIREMENTS:
- Use bullet points (•) for lists
- Be specific with numbers, percentages, and quantifiable achievements
- Use action verbs (Developed, Led, Implemented, Designed, etc.)
- Keep descriptions concise but impactful
- Tailor content to the ${jobTarget.targetRole} position
- Ensure professional tone throughout
- Focus on achievements rather than just responsibilities

Generate high-quality, professional content that would impress hiring managers and pass ATS systems.`;
}

function createCoverLetterPrompt(userData) {
    const { personalInfo, experience, jobTarget } = userData;
    
    return `Write a professional cover letter for ${personalInfo.fullName} applying for a ${jobTarget.targetRole} position${jobTarget.targetCompany ? ` at ${jobTarget.targetCompany}` : ''}.

Candidate Background:
- Current role/experience level: ${jobTarget.experienceLevel}
- Key experience: ${experience.map(exp => `${exp.jobTitle} at ${exp.company}`).join(', ')}
- Key skills: ${jobTarget.skills || 'Not specified'}
- Target role: ${jobTarget.targetRole}
${jobTarget.industry ? `- Industry: ${jobTarget.industry}` : ''}

${jobTarget.jobDescription ? `Job Description: ${jobTarget.jobDescription}` : ''}

Create a compelling cover letter that:
1. Opens with enthusiasm for the specific role and company
2. Highlights relevant experience and achievements
3. Connects their background to the job requirements
4. Shows knowledge of the company/industry
5. Closes with a strong call to action

Keep it professional, engaging, and under 400 words. Use specific examples from their experience.`;
}

// Template-based fallback functions
function generateResumeTemplate(userData) {
    const { personalInfo, education, experience, jobTarget } = userData;
    

    
    let resumeContent = `SUMMARY OF QUALIFICATIONS\n\n`;
    
    // Create compelling summary bullets (NO skills here - only qualifications)
    if (personalInfo.summary) {
        resumeContent += `• ${personalInfo.summary}\n`;
    } else {
        resumeContent += `• ${jobTarget.experienceLevel} with demonstrated ability to deliver high-quality results\n`;
        resumeContent += `• Strong analytical and problem-solving skills with attention to detail\n`;
        if (experience.length > 0) {
            resumeContent += `• Experience in ${experience[0].jobTitle.toLowerCase()} with proven track record of achievement\n`;
        } else {
            resumeContent += `• Excellent communication and teamwork abilities\n`;
        }
        resumeContent += `• Motivated self-starter with ability to work independently and in team environments\n`;
    }
    
    // Education section
    if (education.length > 0) {
        resumeContent += `\n\nEDUCATION\n\n`;
        education.forEach(edu => {
            resumeContent += `${edu.school}, ${edu.field || 'School'}\n`;
            if (edu.degree && edu.field) {
                resumeContent += `${edu.degree}\n`;
            }
            if (edu.graduationYear) {
                resumeContent += `${edu.graduationYear}\n`;
            }
            if (edu.gpa) {
                resumeContent += `GPA: ${edu.gpa}\n`;
            }
            resumeContent += '\n';
        });
        
        // Add relevant coursework only if we have skills and education
        if (jobTarget.skills && education.length > 0) {
            resumeContent += `RELEVANT COURSEWORK\n\n`;
            const skills = jobTarget.skills.split(',').map(s => s.trim());
            const coursework = skills.filter(s => 
                !(/java|python|javascript|c\+\+|c#|php|ruby|swift|kotlin|go|html|css|react|angular|vue|node|sql|mysql|mongodb/i.test(s))
            ).slice(0, 5);
            
            if (coursework.length > 0) {
                resumeContent += coursework.join(', ') + '\n\n';
            } else {
                resumeContent += `Software Engineering, Database Management, Web Development, Computer Programming\n\n`;
            }
        }
    }
    
    // Technical Skills section - ONLY if we have skills
    if (jobTarget.skills) {
        resumeContent += `TECHNICAL SKILLS\n\n`;
        const skills = jobTarget.skills.split(',').map(s => s.trim());
        
        // Categorize skills properly
        const programmingLangs = skills.filter(s => 
            /java|python|javascript|c\+\+|c#|php|ruby|swift|kotlin|go/i.test(s)
        );
        const webTech = skills.filter(s => 
            /html|css|react|angular|vue|node|express|bootstrap|jquery/i.test(s)
        );
        const databases = skills.filter(s => 
            /sql|mysql|postgresql|mongodb|oracle|database/i.test(s)
        );
        const tools = skills.filter(s => 
            /git|github|visual studio|vs code|eclipse|intellij|photoshop|figma|slack|jira/i.test(s)
        );
        const other = skills.filter(s => 
            !programmingLangs.includes(s) && !webTech.includes(s) && !databases.includes(s) && !tools.includes(s)
        );
        
        if (programmingLangs.length > 0) {
            resumeContent += `Programming Languages: ${programmingLangs.join(', ')}\n`;
        }
        if (webTech.length > 0) {
            resumeContent += `Web Technologies: ${webTech.join(', ')}\n`;
        }
        if (databases.length > 0) {
            resumeContent += `Database: ${databases.join(', ')}\n`;
        }
        if (tools.length > 0) {
            resumeContent += `Software/Tools: ${tools.join(', ')}\n`;
        }
        if (other.length > 0) {
            resumeContent += `Other: ${other.join(', ')}\n`;
        }
    }
    
    // Experience section - ONLY if we have actual experience
    if (experience.length > 0) {
        resumeContent += `\n\nRELEVANT EXPERIENCE\n\n`;
        experience.forEach(exp => {
            resumeContent += `${exp.company}\n`;
            resumeContent += `${exp.jobTitle}`;
            if (exp.startDate || exp.endDate) {
                resumeContent += `                                           ${exp.startDate || ''} - ${exp.endDate || 'Present'}`;
            }
            resumeContent += '\n';
            
            // Format responsibilities as bullet points
            if (exp.responsibilities) {
                const responsibilities = exp.responsibilities.split('\n').filter(r => r.trim());
                responsibilities.forEach(resp => {
                    const cleanResp = resp.replace(/^[•\-\*]\s*/, '').trim();
                    if (cleanResp) {
                        resumeContent += `• ${cleanResp}\n`;
                    }
                });
            }
            resumeContent += '\n';
        });
    }
    
    console.log('✅ Professional resume template generated');
    console.log('Template content preview:', resumeContent.substring(0, 200) + '...');
    return resumeContent;
}

function generateCoverLetterTemplate(userData) {
    const { personalInfo, experience, jobTarget } = userData;
    
    console.log('✅ Generating cover letter template for:', personalInfo.fullName);
    
    const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const coverLetter = `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobTarget.targetRole} position${jobTarget.targetCompany ? ` at ${jobTarget.targetCompany}` : ''}. With my background in ${experience[0]?.jobTitle || jobTarget.targetRole} and expertise in ${jobTarget.skills ? jobTarget.skills.split(',').slice(0, 2).join(' and ') : 'relevant technologies'}, I am excited about the opportunity to contribute to your team.

In my current role as ${experience[0]?.jobTitle || 'a professional'} at ${experience[0]?.company || 'my current company'}, I have successfully ${experience[0]?.responsibilities ? experience[0].responsibilities.split('\n')[0] : 'delivered exceptional results'}. This experience has equipped me with the skills necessary to excel in the ${jobTarget.targetRole} position.

I am particularly drawn to this opportunity because it aligns perfectly with my career goals and passion for ${jobTarget.industry || 'technology'}. I am confident that my ${jobTarget.experienceLevel} experience and proven track record make me an ideal candidate for this role.

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and enthusiasm can contribute to your team's success.

Sincerely,
${personalInfo.fullName}`;

    console.log('✅ Cover letter template generated');
    return coverLetter;
}

// HTML formatting functions
function formatResumeHTML(content, userData) {
    const { personalInfo } = userData;
    
    // Split content into sections
    const sections = content.split(/\n\n+/);
    
    let html = `
        <div class="resume-document">
            <div class="resume-header">
                <div class="resume-name">${personalInfo.fullName}</div>
                <div class="resume-contact">
                    ${personalInfo.email}${personalInfo.phone ? ` • ${personalInfo.phone}` : ''}${personalInfo.address ? ` • ${personalInfo.address}` : ''}
                    ${personalInfo.linkedin ? `<br><a href="${personalInfo.linkedin}" target="_blank">LinkedIn Profile</a>` : ''}${personalInfo.website ? ` • <a href="${personalInfo.website}" target="_blank">Portfolio</a>` : ''}
                </div>
            </div>
    `;
    
    sections.forEach((section, index) => {
        if (!section.trim()) return;
        
        const lines = section.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;
        
        const sectionTitle = lines[0].toUpperCase().trim();
        const sectionContent = lines.slice(1);
        
        html += `<div class="resume-section">`;
        
        if (sectionTitle.includes('SUMMARY') || sectionTitle.includes('QUALIFICATIONS')) {
            html += `<h3>SUMMARY OF QUALIFICATIONS</h3>`;
            html += `<ul class="summary-list">`;
            sectionContent.forEach(line => {
                if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                    html += `<li>${line.replace(/^[•\-]\s*/, '').trim()}</li>`;
                } else if (line.trim()) {
                    html += `<li>${line.trim()}</li>`;
                }
            });
            html += `</ul>`;
            
        } else if (sectionTitle.includes('EDUCATION')) {
            html += `<h3>EDUCATION</h3>`;
            html += formatEducationSection(sectionContent);
            
        } else if (sectionTitle.includes('COURSEWORK')) {
            html += `<h3>RELEVANT COURSEWORK</h3>`;
            html += `<p class="coursework">${sectionContent.join(', ').replace(/^[•\-]\s*/, '')}</p>`;
            
        } else if (sectionTitle.includes('TECHNICAL') || sectionTitle.includes('SKILLS')) {
            html += `<h3>TECHNICAL SKILLS</h3>`;
            html += formatTechnicalSkills(sectionContent);
            
        } else if (sectionTitle.includes('RELEVANT EXPERIENCE') || sectionTitle.includes('EXPERIENCE')) {
            html += `<h3>RELEVANT EXPERIENCE</h3>`;
            html += formatExperienceSection(sectionContent);
            
        } else if (sectionTitle.includes('PROJECT')) {
            html += `<h3>PROJECT EXPERIENCE</h3>`;
            html += formatExperienceSection(sectionContent);
            
        } else if (sectionTitle.includes('ADDITIONAL')) {
            html += `<h3>ADDITIONAL EXPERIENCE</h3>`;
            html += formatExperienceSection(sectionContent);
            
        } else {
            // Generic section
            html += `<h3>${sectionTitle}</h3>`;
            if (sectionContent.some(line => line.includes('•') || line.includes('-'))) {
                html += `<ul>`;
                sectionContent.forEach(line => {
                    if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                        html += `<li>${line.replace(/^[•\-]\s*/, '').trim()}</li>`;
                    } else if (line.trim()) {
                        html += `<li>${line.trim()}</li>`;
                    }
                });
                html += `</ul>`;
            } else {
                html += `<p>${sectionContent.join('<br>')}</p>`;
            }
        }
        
        html += `</div>`;
    });
    
    html += `</div>`;
    
    return html;
}

function formatTechnicalSkills(lines) {
    let html = '<div class="technical-skills">';
    
    lines.forEach(line => {
        line = line.trim();
        if (line.includes(':')) {
            const [category, skills] = line.split(':');
            html += `<div class="skill-category">`;
            html += `<strong>${category.trim()}:</strong> ${skills.trim()}`;
            html += `</div>`;
        } else if (line.startsWith('•') || line.startsWith('-')) {
            html += `<div class="skill-item">${line.replace(/^[•\-]\s*/, '')}</div>`;
        } else if (line.trim()) {
            html += `<div class="skill-item">${line}</div>`;
        }
    });
    
    html += '</div>';
    return html;
}

function formatCoverLetterHTML(content, userData) {
    const { personalInfo } = userData;
    const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const paragraphs = content.split('\n\n');
    
    let html = `
        <div class="cover-letter-header">
            <div class="resume-name">${personalInfo.fullName}</div>
            <div class="resume-contact">
                ${personalInfo.email}${personalInfo.phone ? ` | ${personalInfo.phone}` : ''}
                ${personalInfo.address ? `<br>${personalInfo.address}` : ''}
            </div>
        </div>
        <div class="cover-letter-date">${today}</div>
        <div class="cover-letter-body">
    `;
    
    paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
            html += `<p>${paragraph.trim()}</p>`;
        }
    });
    
    html += `</div>`;
    
    return html;
}

function formatExperienceSection(lines) {
    let html = '';
    let currentItem = { details: [] };
    let collectingDetails = false;
    
    lines.forEach(line => {
        line = line.trim();
        
        // Skip empty lines
        if (!line) return;
        
        // Check if this is a new company/position entry
        if ((line.includes(' at ') || line.includes(', ')) && !line.startsWith('•') && !line.startsWith('-')) {
            // Finish previous item if exists
            if (currentItem.company) {
                html += formatExperienceItem(currentItem);
            }
            
            // Parse company and location
            let company, location = '';
            if (line.includes(', ')) {
                [company, location] = line.split(', ');
            } else {
                company = line;
            }
            
            currentItem = { 
                company: company.trim(), 
                location: location.trim(),
                details: [] 
            };
            collectingDetails = false;
            
        } else if (line.includes(' - ') && !collectingDetails) {
            // This is likely a job title and date line
            const parts = line.split(' - ');
            if (parts.length >= 2) {
                currentItem.title = parts[0].trim();
                currentItem.date = parts.slice(1).join(' - ').trim();
            }
            collectingDetails = true;
            
        } else if (line.startsWith('•') || line.startsWith('-') || collectingDetails) {
            // This is a detail/bullet point
            if (currentItem.company) {
                const detail = line.replace(/^[•\-]\s*/, '').trim();
                if (detail) {
                    if (!currentItem.details) {
                        currentItem.details = [];
                    }
                    currentItem.details.push(detail);
                }
            }
            collectingDetails = true;
            
        } else if (line && !currentItem.company) {
            // This might be a standalone company or title
            currentItem.company = line;
            currentItem.details = currentItem.details || [];
        }
    });
    
    // Add the last item
    if (currentItem.company) {
        html += formatExperienceItem(currentItem);
    }
    
    return html;
}

function formatExperienceItem(item) {
    let html = `<div class="experience-item">`;
    
    // Company header with location
    html += `<div class="experience-header">`;
    html += `<div class="experience-company">${item.company}</div>`;
    if (item.location) {
        html += `<div class="experience-location">${item.location}</div>`;
    }
    html += `</div>`;
    
    // Title and date
    if (item.title || item.date) {
        html += `<div class="experience-title-date">`;
        if (item.title) {
            html += `<div class="experience-title">${item.title}</div>`;
        }
        if (item.date) {
            html += `<div class="experience-date">${item.date}</div>`;
        }
        html += `</div>`;
    }
    
    // Details/bullet points
    if (item.details && item.details.length > 0) {
        html += `<ul class="experience-details">`;
        item.details.forEach(detail => {
            if (detail.trim()) {
                html += `<li>${detail}</li>`;
            }
        });
        html += `</ul>`;
    }
    
    html += `</div>`;
    return html;
}

function formatEducationSection(lines) {
    let html = '';
    let currentItem = { details: [] };
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // Check for university/school line
        if ((line.includes('University') || line.includes('College') || line.includes('School') || line.includes('Institute')) && !line.startsWith('•') && !line.startsWith('-')) {
            // Finish previous item
            if (currentItem.institution) {
                html += formatEducationItem(currentItem);
            }
            
            // Parse institution and location
            let institution, location = '';
            if (line.includes(', ')) {
                const parts = line.split(', ');
                institution = parts[0].trim();
                location = parts.slice(1).join(', ').trim();
            } else {
                institution = line;
            }
            
            currentItem = { 
                institution: institution,
                location: location,
                details: []
            };
            
        } else if (line.includes('Bachelor') || line.includes('Master') || line.includes('Associate') || line.includes('Degree') || line.includes('Certificate')) {
            // This is a degree line
            currentItem.degree = line;
            
        } else if (line.includes('GPA') || line.includes('Graduated') || line.includes('Expected')) {
            // Additional details
            if (!currentItem.details) {
                currentItem.details = [];
            }
            currentItem.details.push(line);
            
        } else if (line.match(/\d{4}/)) {
            // This contains a year, likely graduation info
            currentItem.graduationInfo = line;
            
        } else if (line && currentItem.institution) {
            // Other details
            if (!currentItem.details) {
                currentItem.details = [];
            }
            currentItem.details.push(line);
        }
    });
    
    // Add the last item
    if (currentItem.institution) {
        html += formatEducationItem(currentItem);
    }
    
    return html;
}

function formatEducationItem(item) {
    let html = `<div class="education-item">`;
    
    // Institution header with location
    html += `<div class="education-header">`;
    html += `<div class="education-institution">${item.institution}`;
    if (item.department) {
        html += `, ${item.department}`;
    }
    html += `</div>`;
    if (item.location) {
        html += `<div class="education-location">${item.location}</div>`;
    }
    html += `</div>`;
    
    // Degree information
    if (item.degree) {
        html += `<div class="education-degree">${item.degree}</div>`;
    }
    
    // Graduation info and other details
    if (item.graduationInfo) {
        html += `<div class="education-details">${item.graduationInfo}</div>`;
    }
    
    if (item.details && item.details.length > 0) {
        item.details.forEach(detail => {
            html += `<div class="education-details">${detail}</div>`;
        });
    }
    
    html += `</div>`;
    return html;
}

// PDF Generation
async function generatePDF(htmlContent) {
    console.log('=== PDF GENERATION STARTED ===');
    console.log('HTML content length:', htmlContent.length);
    
    let browser;
    try {
        console.log('Launching Puppeteer browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        console.log('Browser launched successfully');
        
        const page = await browser.newPage();
        console.log('New page created');
        
        // Create complete HTML document
        const fullHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Times New Roman', serif; line-height: 1.3; color: #000; margin: 0; padding: 20px; font-size: 11pt; }
                    
                    .resume-document { max-width: 8.5in; margin: 0 auto; background: white; padding: 0.5in; }
                    
                    .resume-header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #000; padding-bottom: 10px; }
                    .resume-name { font-size: 18pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                    .resume-contact { font-size: 10pt; color: #333; line-height: 1.4; }
                    .resume-contact a { color: #000; text-decoration: none; }
                    
                    .resume-section { margin-bottom: 15px; }
                    .resume-section h3 { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0; padding-bottom: 2px; border-bottom: 1px solid #000; letter-spacing: 0.5px; }
                    
                    .summary-list { margin: 0; padding-left: 15px; list-style-type: none; }
                    .summary-list li { margin-bottom: 3px; position: relative; padding-left: 15px; }
                    .summary-list li::before { content: "•"; position: absolute; left: 0; font-weight: bold; }
                    
                    .education-item { margin-bottom: 12px; }
                    .education-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
                    .education-institution { font-weight: bold; }
                    .education-location { font-style: italic; text-align: right; }
                    .education-degree { font-style: italic; margin-bottom: 2px; }
                    .education-details { font-size: 10pt; }
                    
                    .technical-skills { line-height: 1.4; }
                    .skill-category { margin-bottom: 4px; }
                    .skill-category strong { font-weight: bold; }
                    
                    .experience-item { margin-bottom: 15px; page-break-inside: avoid; }
                    .experience-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
                    .experience-company { font-weight: bold; }
                    .experience-location { font-style: italic; text-align: right; }
                    .experience-title-date { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; }
                    .experience-title { font-style: italic; font-weight: normal; }
                    .experience-date { font-style: italic; text-align: right; }
                    .experience-details { margin: 0; padding-left: 15px; list-style-type: none; }
                    .experience-details li { margin-bottom: 3px; position: relative; padding-left: 15px; }
                    .experience-details li::before { content: "•"; position: absolute; left: 0; font-weight: bold; }
                    
                    .coursework { margin: 0; line-height: 1.4; }
                    
                    /* Legacy styling for older resumes */
                    .resume-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000000; padding-bottom: 10px; }
                    .resume-name { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
                    .resume-contact { font-size: 14px; color: #666; }
                    .resume-section { margin-bottom: 20px; }
                    .resume-section h3 { color: #000000; font-size: 16px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 3px; }
                    .experience-item, .education-item { margin-bottom: 15px; }
                    .item-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .item-title { font-weight: bold; font-size: 14px; }
                    .item-company { color: #000000; font-weight: 500; }
                    .item-date { color: #666; font-size: 12px; font-style: italic; }
                    .item-description ul { margin: 5px 0; padding-left: 15px; }
                    .item-description li { margin-bottom: 2px; font-size: 13px; }
                    .skills-list { display: flex; flex-wrap: wrap; gap: 5px; }
                    .skill-tag { background: #000000; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
                    .cover-letter-header { margin-bottom: 20px; }
                    .cover-letter-date { margin-bottom: 15px; color: #666; }
                    .cover-letter-body p { margin-bottom: 12px; text-align: justify; }
                    a { color: #000000; text-decoration: none; }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `;
        
        console.log('Full HTML document length:', fullHTML.length);
        
        await page.setContent(fullHTML, { waitUntil: 'networkidle0' });
        console.log('HTML content loaded into page');
        
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in',
            }
        });
        
        console.log('PDF generated successfully, size:', pdf.length);
        return pdf;
        
    } catch (error) {
        console.error('PDF generation error:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Resume & Cover Letter Writer server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to use the application`);
    
    if (!process.env.GEMINI_API_KEY) {
        console.warn('Warning: GEMINI_API_KEY not found. The application will use template-based generation instead of AI.');
    }
}); 