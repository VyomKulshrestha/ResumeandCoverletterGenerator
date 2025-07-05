# Quick Setup Guide

## Getting Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment (Optional but Recommended)
Create a `.env` file in the project root with:
```
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3000
```

**To get a Google Gemini API key:**
1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Create a new API key
4. Copy and paste it into your `.env` file

**Note:** The app works without an API key using template-based generation, but AI-powered generation provides much better results.

### 3. Start the Application
```bash
# For development (auto-restart on changes)
npm run dev

# OR for production
npm start
```

### 4. Open Your Browser
Navigate to http://localhost:3000

## What You'll See

1. **Step-by-step Form**: Guided interface to enter your information
2. **Professional Templates**: Beautiful, ATS-friendly resume formats
3. **AI-Generated Content**: Personalized resume and cover letter content
4. **PDF Download**: Export your documents as professional PDFs

## Features

✅ **Multi-step Form Interface**
✅ **Real-time Validation**
✅ **AI-Powered Content Generation**
✅ **Professional PDF Export**
✅ **Mobile Responsive Design**
✅ **Works Offline** (template mode)

## Troubleshooting

**Dependencies not installing?**
- Ensure you have Node.js 14+ installed
- Try deleting `node_modules` and running `npm install` again

**Can't access the application?**
- Check if port 3000 is available
- Try a different port: `PORT=3001 npm start`

**PDF download not working?**
- Ensure Puppeteer installed correctly
- Check browser popup blockers

## Ready to Generate Your Resume?

The application will guide you through:
1. **Personal Info** - Contact details and summary
2. **Education** - Academic background  
3. **Work Experience** - Professional history
4. **Job Target** - Role you're applying for

Then it generates a professional resume and cover letter tailored to your target role! 