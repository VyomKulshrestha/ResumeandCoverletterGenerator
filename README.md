# Resume & Cover Letter Writer

An AI-powered web application that generates professional resumes and cover letters based on user input. The application uses Google Gemini AI to create personalized, high-quality documents that are optimized for job applications.

## ✨ Features

- **Step-by-step Form Interface**: Intuitive multi-step form for entering personal information, education, work experience, and job targets
- **AI-Powered Content Generation**: Uses Google Gemini Pro to create compelling resume content and cover letters
- **Professional Templates**: Beautiful, ATS-friendly resume and cover letter formats
- **PDF Export**: Generate and download professional PDF documents
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Validation**: Form validation with helpful error messages
- **Template Fallback**: Works even without Gemini API key using template-based generation

## 🚀 Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager
- Google Gemini API key (optional but recommended for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/VyomKulshrestha/ResumeCoverletterGenerator.git
   cd ResumeCoverletterGenerator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create a .env file and add your Google Gemini API key
   echo "GEMINI_API_KEY=your_actual_api_key_here" > .env
   ```

4. **Start the application**
   ```bash
   # For development
   npm run dev
   
   # For production
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🌐 Deployment

### Deploy to Heroku

1. **Create a Heroku app:**
   ```bash
   heroku create your-app-name
   ```

2. **Set environment variables:**
   ```bash
   heroku config:set GEMINI_API_KEY=your_api_key_here
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

### Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Add environment variables in Vercel dashboard**

### Deploy to Railway

1. Connect your GitHub repository to [Railway](https://railway.app)
2. Add `GEMINI_API_KEY` environment variable in settings
3. Deploy automatically on push

### Deploy to Render

1. Connect GitHub repository to [Render](https://render.com)
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add `GEMINI_API_KEY` environment variable

### Deploy to Netlify (Serverless Functions)

1. Connect GitHub repository to [Netlify](https://netlify.com)
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in site settings

## 📖 How to Use

### Step 1: Personal Information
- Enter your full name, email, phone number
- Add optional information like address, LinkedIn profile, and website
- Write a professional summary (optional)

### Step 2: Education
- Add your educational background
- Include degree, field of study, school, and graduation year
- Add relevant coursework or achievements
- Use the "Add Another Education" button for multiple entries

### Step 3: Work Experience
- Enter your job title, company, and employment dates
- Describe key responsibilities and achievements
- Use bullet points for better readability
- Add multiple experiences as needed

### Step 4: Job Target
- Specify the target job role you're applying for
- Enter target company (optional)
- Select industry and experience level
- List key skills (comma-separated)
- Paste job description for better targeting

### Generate Documents
- Review your information and click "Generate Resume & Cover Letter"
- The AI will create personalized documents based on your input
- Switch between resume and cover letter using the tabs
- Download PDF versions of your documents

## 🔧 Configuration

### Google Gemini API Key Setup

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign up or log in to your Google account
3. Create a new API key
4. Add it to your `.env` file:
   ```
   GEMINI_API_KEY=your-actual-api-key-here
   ```

### Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key for AI-powered generation
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

## 🛠️ Technical Stack

### Frontend
- HTML5 with semantic markup
- CSS3 with modern features (Grid, Flexbox, Animations)
- Vanilla JavaScript (ES6+)
- Font Awesome icons
- Google Fonts (Inter)

### Backend
- Node.js with Express.js
- Google Gemini API integration
- Puppeteer for PDF generation
- Security middleware (Helmet, CORS, Rate limiting)

### Dependencies
- `express`: Web framework
- `@google/generative-ai`: Google Gemini API client
- `puppeteer`: PDF generation
- `cors`: Cross-origin resource sharing
- `helmet`: Security headers
- `express-rate-limit`: API rate limiting
- `dotenv`: Environment configuration

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Android Chrome)

## 🔒 Security Features

- Rate limiting to prevent abuse
- Input validation and sanitization
- Secure headers with Helmet.js
- CORS configuration
- Environment variable protection

## 🚨 Troubleshooting

### Common Issues

**1. "Failed to generate documents" error**
- Check if your Google Gemini API key is correctly set in `.env`
- Ensure your Gemini API key is active and has sufficient quota
- The app will fall back to template generation if API fails

**2. PDF download not working**
- Ensure Puppeteer is properly installed
- Check browser popup blockers
- Try refreshing the page and generating documents again

**3. Form validation errors**
- Fill in all required fields (marked with *)
- Check email format and phone number format
- Ensure at least one education and experience entry

**4. Styling issues**
- Clear browser cache
- Ensure all CSS files are loading properly
- Check browser console for errors

### Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Verify your `.env` file configuration
3. Ensure all dependencies are installed correctly
4. Try restarting the server

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 🙏 Acknowledgments

- Google for providing the Gemini API
- Font Awesome for icons
- Google Fonts for typography
- Puppeteer team for PDF generation capabilities 