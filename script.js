// Global variables
let currentStep = 1;
const totalSteps = 4;

// DOM elements
const form = document.getElementById('resumeForm');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const generateBtn = document.getElementById('generateBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const resultsContainer = document.getElementById('results-container');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CONTENT LOADED ===');
    
    // Check if all required elements exist
    console.log('Checking required elements...');
    console.log('Form:', !!form);
    console.log('PrevBtn:', !!prevBtn);
    console.log('NextBtn:', !!nextBtn);
    console.log('GenerateBtn:', !!generateBtn);
    console.log('LoadingOverlay:', !!loadingOverlay);
    console.log('ResultsContainer:', !!resultsContainer);
    
    if (!form || !prevBtn || !nextBtn || !generateBtn || !loadingOverlay || !resultsContainer) {
        console.error('❌ Required DOM elements not found:', {
            form: !!form,
            prevBtn: !!prevBtn,
            nextBtn: !!nextBtn,
            generateBtn: !!generateBtn,
            loadingOverlay: !!loadingOverlay,
            resultsContainer: !!resultsContainer
        });
        return;
    }
    
    console.log('✅ All DOM elements found successfully');
    updateStepDisplay();
    attachEventListeners();
    
    console.log('✅ Initialization complete');
});

// Event listeners
function attachEventListeners() {
    console.log('=== ATTACHING EVENT LISTENERS ===');
    
    form.addEventListener('submit', handleFormSubmit);
    console.log('✅ Form submit listener attached');
    
    // Add navigation button listeners
    prevBtn.addEventListener('click', () => {
        console.log('Previous button clicked');
        changeStep(-1);
    });
    nextBtn.addEventListener('click', () => {
        console.log('Next button clicked');
        changeStep(1);
    });
    console.log('✅ Navigation button listeners attached');
    
    // Add edit and download button listeners (they'll be available after results are displayed)
    document.addEventListener('click', (e) => {
        // Edit button - check for ID or onclick
        if (e.target.id === 'edit-btn' || e.target.matches('[onclick="editDocuments()"]') || e.target.closest('[onclick="editDocuments()"]')) {
            e.preventDefault();
            console.log('Edit button clicked via event listener');
            editDocuments();
        }
        
        // Download button - check for ID or onclick
        if (e.target.id === 'download-btn' || e.target.matches('[onclick="downloadPDF()"]') || e.target.closest('[onclick="downloadPDF()"]')) {
            e.preventDefault();
            console.log('Download button clicked via event listener');
            downloadPDF();
        }
        
        // Tab buttons - check for onclick attributes
        if (e.target.matches('[onclick*="showDocument"]') || e.target.closest('[onclick*="showDocument"]')) {
            e.preventDefault();
            const button = e.target.closest('[onclick*="showDocument"]');
            const onclickAttr = button.getAttribute('onclick');
            const match = onclickAttr.match(/showDocument\('([^']+)'\)/);
            if (match) {
                console.log('Tab button clicked via event listener:', match[1]);
                showDocument(match[1]);
            }
        }
    });
    console.log('✅ Document click listeners attached');
    
    // Add input validation listeners
    const requiredInputs = form.querySelectorAll('input[required], textarea[required]');
    requiredInputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearErrors);
    });
    console.log('✅ Input validation listeners attached to', requiredInputs.length, 'fields');
}

// Step navigation
function changeStep(direction) {
    console.log('=== CHANGE STEP DEBUG ===');
    console.log('Direction:', direction);
    console.log('Current step:', currentStep);
    console.log('Total steps:', totalSteps);
    
    if (direction > 0) {
        console.log('Moving forward - checking validation...');
        const validationResult = validateCurrentStep();
        console.log('Validation result:', validationResult);
        if (!validationResult) {
            console.log('❌ Validation failed, cannot proceed');
            return;
        }
        console.log('✅ Validation passed, proceeding...');
    }
    
    const newStep = currentStep + direction;
    console.log('New step will be:', newStep);
    
    if (newStep >= 1 && newStep <= totalSteps) {
        currentStep = newStep;
        console.log('✅ Step changed to:', currentStep);
        updateStepDisplay();
    } else {
        console.log('❌ New step out of bounds:', newStep, 'Valid range: 1 to', totalSteps);
    }
}

function updateStepDisplay() {
    // Update form steps
    const steps = document.querySelectorAll('.form-step');
    steps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === currentStep);
    });
    
    // Update progress bar
    const progressSteps = document.querySelectorAll('.step');
    progressSteps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === currentStep);
    });
    
    // Update navigation buttons
    prevBtn.style.display = currentStep === 1 ? 'none' : 'flex';
    nextBtn.style.display = currentStep === totalSteps ? 'none' : 'flex';
    generateBtn.style.display = currentStep === totalSteps ? 'flex' : 'none';
}

// Form validation
function validateCurrentStep() {
    console.log('Validating step:', currentStep);
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    const requiredFields = currentStepElement.querySelectorAll('input[required], textarea[required]');
    
    console.log('Found required fields:', requiredFields.length);
    
    let isValid = true;
    
    requiredFields.forEach(field => {
        const fieldValid = validateField({ target: field });
        console.log(`Field ${field.name || field.id} (${field.type}): ${fieldValid ? 'VALID' : 'INVALID'} - Value: "${field.value}"`);
        if (!fieldValid) {
            isValid = false;
        }
    });
    
    console.log('Overall validation result:', isValid);
    return isValid;
}

function validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    const fieldGroup = field.closest('.form-group');
    
    // Remove existing error messages
    const existingError = fieldGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Remove error styling
    field.classList.remove('error');
    
    // Validate required fields
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    // Validate email
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(field, 'Please enter a valid email address');
            return false;
        }
    }
    
    // Validate phone
    if (field.type === 'tel' && value) {
        // Very permissive phone validation - just check it has at least 10 digits
        const digitsOnly = value.replace(/\D/g, '');
        if (digitsOnly.length < 10) {
            showFieldError(field, 'Please enter a valid phone number with at least 10 digits');
            return false;
        }
    }
    
    return true;
}

function showFieldError(field, message) {
    field.classList.add('error');
    const fieldGroup = field.closest('.form-group');
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    fieldGroup.appendChild(errorElement);
}

function clearErrors(event) {
    const field = event.target;
    field.classList.remove('error');
    const fieldGroup = field.closest('.form-group');
    const existingError = fieldGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
}

// Dynamic form sections
function addEducation() {
    const container = document.getElementById('education-container');
    const newEntry = createEducationEntry();
    container.appendChild(newEntry);
}

function addExperience() {
    const container = document.getElementById('experience-container');
    const newEntry = createExperienceEntry();
    container.appendChild(newEntry);
}

function createEducationEntry() {
    const entry = document.createElement('div');
    entry.className = 'education-entry';
    entry.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Degree/Certificate *</label>
                <input type="text" name="degree" required placeholder="e.g., Bachelor of Science">
            </div>
            <div class="form-group">
                <label>Field of Study *</label>
                <input type="text" name="field" required placeholder="e.g., Computer Science">
            </div>
            <div class="form-group">
                <label>School/Institution *</label>
                <input type="text" name="school" required placeholder="e.g., University of Technology">
            </div>
            <div class="form-group">
                <label>Graduation Year</label>
                <input type="number" name="graduationYear" min="1960" max="2030">
            </div>
            <div class="form-group">
                <label>GPA (Optional)</label>
                <input type="text" name="gpa" placeholder="e.g., 3.8/4.0">
            </div>
        </div>
        <div class="form-group full-width">
            <label>Relevant Coursework/Achievements</label>
            <textarea name="achievements" rows="3" placeholder="List relevant courses, honors, awards, or academic achievements..."></textarea>
        </div>
        <button type="button" class="remove-btn" onclick="removeEntry(this)">
            <i class="fas fa-trash"></i> Remove
        </button>
    `;
    return entry;
}

function createExperienceEntry() {
    const entry = document.createElement('div');
    entry.className = 'experience-entry';
    entry.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Job Title *</label>
                <input type="text" name="jobTitle" required placeholder="e.g., Software Developer">
            </div>
            <div class="form-group">
                <label>Company *</label>
                <input type="text" name="company" required placeholder="e.g., Tech Solutions Inc.">
            </div>
            <div class="form-group">
                <label>Start Date</label>
                <input type="month" name="startDate">
            </div>
            <div class="form-group">
                <label>End Date</label>
                <input type="month" name="endDate" placeholder="Leave blank if current">
            </div>
        </div>
        <div class="form-group full-width">
            <label>Key Responsibilities & Achievements</label>
            <textarea name="responsibilities" rows="5" required placeholder="• Developed and maintained web applications using React and Node.js&#10;• Led a team of 3 developers on multiple projects&#10;• Improved system performance by 40% through code optimization&#10;• Collaborated with cross-functional teams to deliver products on time"></textarea>
        </div>
        <button type="button" class="remove-btn" onclick="removeEntry(this)">
            <i class="fas fa-trash"></i> Remove
        </button>
    `;
    return entry;
}

function removeEntry(button) {
    const entry = button.closest('.education-entry, .experience-entry');
    entry.remove();
}

// Form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    console.log('Form submission started');
    
    if (!validateCurrentStep()) {
        console.log('Final validation failed, cannot submit');
        return;
    }
    
    const formData = collectFormData();
    console.log('Form data collected:', formData);
    
    try {
        showLoading(true);
        console.log('Sending request to generate documents...');
        
        const response = await fetch('/api/generate-documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        console.log('✅ Response status:', response.status);
        console.log('✅ Response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error:', errorText);
            throw new Error(`Failed to generate documents: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Documents generated successfully');
        console.log('✅ Response data:', {
            resumeLength: result.resume ? result.resume.length : 'undefined',
            coverLetterLength: result.coverLetter ? result.coverLetter.length : 'undefined'
        });
        displayResults(result);
        
    } catch (error) {
        console.error('Error generating documents:', error);
        alert('Failed to generate documents. Please try again.');
    } finally {
        showLoading(false);
    }
}

function collectFormData() {
    const formData = new FormData(form);
    const data = {
        personalInfo: {},
        education: [],
        experience: [],
        jobTarget: {}
    };
    
    // Collect personal information
    data.personalInfo = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        linkedin: formData.get('linkedin'),
        website: formData.get('website'),
        summary: formData.get('summary')
    };
    
    // Collect education
    const educationEntries = document.querySelectorAll('.education-entry');
    educationEntries.forEach(entry => {
        const inputs = entry.querySelectorAll('input, textarea');
        const edu = {};
        inputs.forEach(input => {
            if (input.value.trim()) {
                edu[input.name] = input.value.trim();
            }
        });
        if (edu.degree && edu.field && edu.school) {
            data.education.push(edu);
        }
    });
    
    // Collect experience
    const experienceEntries = document.querySelectorAll('.experience-entry');
    experienceEntries.forEach(entry => {
        const inputs = entry.querySelectorAll('input, textarea');
        const exp = {};
        inputs.forEach(input => {
            if (input.value.trim()) {
                exp[input.name] = input.value.trim();
            }
        });
        if (exp.jobTitle && exp.company) {
            data.experience.push(exp);
        }
    });
    
    // Collect job target information
    data.jobTarget = {
        targetRole: formData.get('targetRole'),
        targetCompany: formData.get('targetCompany'),
        industry: formData.get('industry'),
        experienceLevel: formData.get('experienceLevel'),
        skills: formData.get('skills'),
        jobDescription: formData.get('jobDescription')
    };
    
    return data;
}

// Test functions for debugging
function testButtonFunctionality() {
    console.log('=== TESTING BUTTON FUNCTIONALITY (MANUAL) ===');
    
    const editBtn = document.getElementById('edit-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    console.log('Edit button found:', !!editBtn);
    console.log('Download button found:', !!downloadBtn);
    
    if (editBtn) {
        console.log('Edit button is visible:', editBtn.offsetParent !== null);
        console.log('Edit button text:', editBtn.textContent);
    }
    
    if (downloadBtn) {
        console.log('Download button is visible:', downloadBtn.offsetParent !== null);
        console.log('Download button text:', downloadBtn.textContent);
        console.log('To test download, click the button manually after generating documents');
    }
}

// Results display
function displayResults(result) {
    console.log('✅ Documents received from server');
    console.log('✅ Result object:', result);
    
    // Set the content
    const resumeElement = document.getElementById('resume-content');
    const coverLetterElement = document.getElementById('cover-letter-content');
    
    console.log('✅ Resume element found:', !!resumeElement);
    console.log('✅ Cover letter element found:', !!coverLetterElement);
    
    if (resumeElement) {
        console.log('✅ Setting resume content, length:', result.resume ? result.resume.length : 'undefined');
        resumeElement.innerHTML = result.resume || '<p>No resume content generated</p>';
        console.log('✅ Resume content set successfully');
    }
    
    if (coverLetterElement) {
        console.log('✅ Setting cover letter content, length:', result.coverLetter ? result.coverLetter.length : 'undefined');
        coverLetterElement.innerHTML = result.coverLetter || '<p>No cover letter content generated</p>';
        console.log('✅ Cover letter content set successfully');
    }
    
    // Hide form and show results
    document.querySelector('.form-container').style.display = 'none';
    resultsContainer.style.display = 'block';
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
    
        // Ensure documents are displayed properly
    setTimeout(() => {
        console.log('✅ Documents displayed successfully');
        
        // Test button functionality now that they're visible
        testButtonFunctionality();
    }, 100);
}

function showDocument(type) {
    console.log('showDocument called with type:', type);
    
    // Update tab buttons
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        console.log('Removed active from tab:', tab.textContent);
    });
    
    // Find the clicked tab and make it active
    const clickedTab = document.querySelector(`[onclick="showDocument('${type}')"]`);
    if (clickedTab) {
        clickedTab.classList.add('active');
        console.log('Added active to tab:', clickedTab.textContent);
    }
    
    // Update document content
    const contents = document.querySelectorAll('.document-content');
    contents.forEach(content => {
        content.classList.remove('active');
        console.log('Removed active from content:', content.id);
    });
    
    const targetContent = document.getElementById(`${type}-content`);
    if (targetContent) {
        targetContent.classList.add('active');
        console.log('Added active to content:', targetContent.id);
        console.log('Content length:', targetContent.innerHTML.length);
    } else {
        console.error('Target content not found:', `${type}-content`);
    }
}

function editDocuments() {
    console.log('=== EDIT DOCUMENTS STARTED ===');
    
    const formContainer = document.querySelector('.form-container');
    const resultsContainer = document.getElementById('results-container');
    
    console.log('Form container element:', formContainer);
    console.log('Results container element:', resultsContainer);
    
    if (!formContainer || !resultsContainer) {
        console.error('Required elements not found:', {
            formContainer: !!formContainer,
            resultsContainer: !!resultsContainer
        });
        alert('Unable to return to editing. Please refresh the page.');
        return;
    }
    
    // Show form and hide results
    formContainer.style.display = 'block';
    resultsContainer.style.display = 'none';
    
    console.log('Switched to edit mode');
    console.log('Form container display:', formContainer.style.display);
    console.log('Results container display:', resultsContainer.style.display);
    
    // Scroll to form
    formContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Reset to last step for easy modification
    currentStep = totalSteps;
    updateStepDisplay();
    
    console.log('Reset to step:', currentStep);
    console.log('Edit mode activated successfully');
}

async function downloadPDF() {
    console.log('=== PDF DOWNLOAD STARTED ===');
    
    try {
        showLoading(true);
        
        const activeContent = document.querySelector('.document-content.active');
        console.log('Active content element:', activeContent);
        
        if (!activeContent) {
            console.error('No active content found');
            alert('No document content found. Please generate documents first.');
            return;
        }
        
        const documentType = activeContent.id.includes('resume') ? 'resume' : 'cover-letter';
        console.log('Document type:', documentType);
        console.log('Content length:', activeContent.innerHTML.length);
        
        const requestData = {
            content: activeContent.innerHTML,
            type: documentType,
            filename: `${documentType}-${Date.now()}.pdf`
        };
        
        console.log('Sending PDF request with data:', {
            contentLength: requestData.content.length,
            type: requestData.type,
            filename: requestData.filename
        });
        
        const response = await fetch('/api/download-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('PDF Response status:', response.status);
        console.log('PDF Response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('PDF generation failed:', errorText);
            throw new Error(`Failed to generate PDF: ${response.status} ${errorText}`);
        }
        
        const blob = await response.blob();
        console.log('PDF blob size:', blob.size);
        
        if (blob.size === 0) {
            throw new Error('PDF generation returned empty file');
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentType}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        console.log('Triggering download for:', a.download);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            console.log('PDF download cleanup completed');
        }, 100);
        
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert(`Failed to download PDF: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Add CSS for error states
const style = document.createElement('style');
style.textContent = `
    .form-group input.error,
    .form-group textarea.error,
    .form-group select.error {
        border-color: #e53e3e;
        background-color: #fed7d7;
    }
    
    .error-message {
        color: #e53e3e;
        font-size: 0.875rem;
        margin-top: 4px;
        font-weight: 500;
    }
    
    .remove-btn {
        background: #e53e3e;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 0.875rem;
        cursor: pointer;
        margin-top: 15px;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.3s ease;
    }
    
    .remove-btn:hover {
        background: #c53030;
        transform: translateY(-1px);
    }
`;
document.head.appendChild(style);

// Debug function - can be called from browser console
window.testNextButton = function() {
    console.log('Testing Next button...');
    currentStep = 1;
    console.log('Calling changeStep(1)...');
    changeStep(1);
};







 