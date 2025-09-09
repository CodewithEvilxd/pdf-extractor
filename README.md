# 🚀 Advanced PDF Text Extractor with OCR

[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.5-646CFF.svg)](https://vitejs.dev/)
[![PDF.js](https://img.shields.io/badge/PDF.js-5.4.149-red.svg)](https://mozilla.github.io/pdf.js/)
[![Tesseract.js](https://img.shields.io/badge/Tesseract.js-5.1.1-green.svg)](https://tesseract.projectnaptha.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Ultimate PDF text extractor with AI-powered OCR, table detection, and advanced text processing capabilities. Extract text, tables, and data from PDFs and scanned documents with unparalleled accuracy and speed.**

## 🌐 Live Demo

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_Now-FF6B6B.svg)](https://pdf-extractor-murex.vercel.app/)

Experience the full power of our PDF extractor with our live web application. No installation required - just upload your PDFs and start extracting!

## 📋 Repository

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717.svg)](https://github.com/CodewithEvilxd/pdf-extractor)

```bash
git clone https://github.com/CodewithEvilxd/pdf-extractor.git
cd pdf-extractor
npm install
npm run dev
```

## 💬 Community & Support

[![Discord](https://img.shields.io/badge/Discord-Community-5865F2.svg)](https://discord.gg/raj,dev_)
[![Discord](https://img.shields.io/badge/Discord-Support-5865F2.svg)](https://discord.gg/xraj_dev_X)

Join our Discord community for support, feature requests, and discussions about PDF processing!

---

## ✨ Features

### 🔍 Core Extraction Capabilities
- **PDF Text Extraction**: Extract clean, formatted text from any PDF document with perfect accuracy
- **AI OCR Technology**: Convert scanned documents and images to editable text using advanced Tesseract.js
- **Table Detection**: Automatically detect and extract tabular data with CSV export capability
- **Batch Processing**: Process multiple PDF files simultaneously with progress tracking
- **Page Range Selection**: Extract text from specific page ranges or entire documents

### 🛠️ Advanced Text Processing
- **Smart Search**: Search within extracted text with highlighted results and instant feedback
- **Text Analysis**: Get detailed statistics including word count, reading time, and language detection
- **Text Formatting**: Clean and format extracted text with advanced formatting and cleaning tools
- **Advanced Search**: Powerful regex search with find & replace, case sensitivity, and whole word matching
- **Text Summarization**: AI-powered text summarization using frequency analysis to extract key information
- **Text-to-Speech**: Listen to extracted text with customizable voices, speed, and pitch controls

### 📊 Document Intelligence
- **Metadata Extraction**: Extract detailed document information including author, dates, file size, and PDF properties
- **Keyword Extraction**: Identify and extract the most important keywords using advanced TF-IDF and frequency analysis
- **Text Segmentation**: Break down extracted text into paragraphs or sentences with detailed statistics
- **Reading Mode**: Distraction-free reading experience with customizable fonts, themes, and layout controls

### 🎨 User Experience
- **Drag & Drop Interface**: Intuitive file upload with drag-and-drop support
- **Dark/Light Theme**: Toggle between themes for comfortable reading in any environment
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Keyboard Shortcuts**: Boost productivity with comprehensive keyboard shortcuts
- **Progress Tracking**: Real-time progress indicators and processing statistics
- **Multiple Export Formats**: Export to TXT, JSON, CSV, and Markdown formats

### 🔧 Developer Features
- **Privacy-First**: All processing happens in your browser - no data sent to external servers
- **Fast Processing**: Lightning-fast extraction using optimized algorithms
- **Accurate Results**: Industry-leading accuracy for text extraction and OCR
- **Modern Tech Stack**: Built with React 19, Vite, and cutting-edge web technologies

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with JavaScript enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/CodewithEvilxd/pdf-extractor.git
   cd pdf-extractor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to access the application.

### Optional: Enable OCR Support

For scanned PDF processing, install Tesseract.js:
```bash
npm install tesseract.js
```

---

## 📖 Usage Guide

### Basic Text Extraction

1. **Upload PDFs**: Click "Choose PDF Files" or drag and drop PDF files into the upload area
2. **Configure Options**:
   - Select page range (optional)
   - Enable OCR for scanned documents
   - Enable table extraction
3. **Extract Text**: Click upload to start processing
4. **View Results**: Extracted text appears with formatting preserved

### Advanced Features

#### Search & Highlight
- Use the search box to find specific text
- Results are highlighted in real-time
- Navigate through matches with previous/next buttons

#### Text Analysis
- Click "Text Analysis" to view detailed statistics
- Includes word count, reading time, language detection
- View most frequent words and document metrics

#### Text Formatting
- Clean up extracted text with formatting tools
- Remove extra spaces, normalize line breaks
- Capitalize sentences, remove special characters

#### Advanced Search (Regex)
- Use regular expressions for complex searches
- Find & replace functionality
- Case-sensitive and whole word options

#### Text Summarization
- Generate AI-powered summaries
- Adjustable compression levels (10%-50%)
- View original vs. summary statistics

#### Text-to-Speech
- Listen to extracted text with natural voices
- Customize speech rate, pitch, and voice selection
- Support for multiple languages

#### Metadata Extraction
- View detailed document information
- Includes creation date, author, file size
- PDF version and encryption status

#### Keyword Extraction
- Extract most important keywords
- TF-IDF scoring algorithm
- Adjustable keyword count (5-50)

#### Reading Mode
- Distraction-free reading experience
- Customizable fonts and themes
- Adjustable font size and line height

#### Text Segmentation
- Split text into paragraphs or sentences
- Detailed statistics for each segment
- Export segmented content

### Export Options

- **TXT**: Plain text format
- **JSON**: Structured data with metadata
- **CSV**: Tabular data export
- **Markdown**: Formatted document with headers and structure

---

## 🎯 Key Features in Detail

### PDF Processing Engine
- **PDF.js Integration**: Industry-standard PDF processing library
- **Multi-format Support**: Handles all PDF versions and formats
- **Error Handling**: Robust error handling for corrupted or password-protected files
- **Memory Efficient**: Optimized memory usage for large documents

### OCR Technology
- **Tesseract.js**: Google's Tesseract OCR engine for web
- **Multi-language Support**: Support for 100+ languages
- **Image Preprocessing**: Automatic image enhancement for better OCR accuracy
- **Fallback Logic**: Graceful fallback when OCR is not available

### Table Detection
- **Heuristic Analysis**: Smart detection of tabular structures
- **CSV Export**: Automatic conversion to CSV format
- **Header Detection**: Intelligent header row identification
- **Multi-column Support**: Handles complex table layouts

### Search & Navigation
- **Real-time Search**: Instant search results as you type
- **Regex Support**: Full regular expression capabilities
- **Case Sensitivity**: Configurable case-sensitive matching
- **Whole Word Matching**: Exact word boundary matching

### Text Analysis
- **Comprehensive Metrics**: Word count, character count, sentence analysis
- **Reading Time Estimation**: Calculate reading time based on average reading speed
- **Language Detection**: Automatic language identification
- **Frequency Analysis**: Most common words and phrases

### Text Formatting
- **Whitespace Cleanup**: Remove extra spaces and normalize formatting
- **Line Break Normalization**: Fix inconsistent line breaks
- **Sentence Capitalization**: Automatic sentence case correction
- **Special Character Removal**: Clean up unwanted characters

### Text Summarization
- **Frequency Analysis**: Extract important sentences based on word frequency
- **Sentence Scoring**: Position-based and length-based scoring
- **Compression Control**: Adjustable summary length
- **Statistics Tracking**: Original vs. summary comparison

### Text-to-Speech
- **Web Speech API**: Native browser speech synthesis
- **Voice Selection**: Multiple voice options
- **Speech Controls**: Rate, pitch, and volume adjustment
- **Progress Tracking**: Real-time speech progress

### Document Metadata
- **Complete Information**: Author, title, subject, creator
- **Date Tracking**: Creation and modification dates
- **File Properties**: Size, type, PDF version
- **Security Info**: Encryption and linearization status

### Keyword Extraction
- **TF-IDF Algorithm**: Term frequency-inverse document frequency
- **Position Weighting**: Consider word position importance
- **Length Optimization**: Balance between word length and importance
- **Stop Word Filtering**: Remove common words

### Reading Mode
- **Theme Options**: Light, dark, and sepia themes
- **Font Customization**: Adjustable font size and family
- **Layout Control**: Line height and spacing options
- **Fullscreen Experience**: Immersive reading environment

### Text Segmentation
- **Paragraph Detection**: Split by double line breaks
- **Sentence Detection**: Split by punctuation marks
- **Statistics Generation**: Word count and character count per segment
- **Export Capabilities**: JSON export with metadata

---

## 🛠️ Technical Architecture

### Frontend Stack
- **React 19**: Latest React with concurrent features
- **Vite**: Fast build tool and development server
- **Modern CSS**: Responsive design with CSS Grid and Flexbox
- **Web APIs**: File API, Web Speech API, Clipboard API

### PDF Processing
- **PDF.js**: Mozilla's PDF processing library
- **Worker Threads**: Background processing for large files
- **Canvas API**: Image rendering for OCR processing
- **FileReader API**: Efficient file reading and processing

### OCR Integration
- **Tesseract.js**: WebAssembly-based OCR engine
- **Image Processing**: Canvas-based image preprocessing
- **Language Models**: Multiple language support
- **Error Recovery**: Graceful handling of OCR failures

### Testing & Quality
- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing utilities
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting

---

## 📱 Screenshots

### Main Interface
![Main Interface](https://via.placeholder.com/800x600/4f46e5/ffffff?text=PDF+Extractor+Main+Interface)
*Clean, intuitive interface with drag-and-drop upload area*

### Feature Grid
![Feature Grid](https://via.placeholder.com/800x600/06b6d4/ffffff?text=Advanced+Features+Grid)
*Comprehensive feature overview with visual icons*

### Text Analysis Dashboard
![Text Analysis](https://via.placeholder.com/800x600/10b981/ffffff?text=Text+Analysis+Dashboard)
*Detailed statistics and analysis of extracted text*

### Reading Mode
![Reading Mode](https://via.placeholder.com/800x600/f59e0b/ffffff?text=Reading+Mode)
*Distraction-free reading experience with customizable themes*

---

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Development
VITE_API_URL=http://localhost:5173

# Production
VITE_API_URL=https://your-production-url.com
```

### Build Configuration
The project uses Vite for building. Configure in `vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

---

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

Run tests with UI:
```bash
npm run test:ui
```

Run tests once:
```bash
npm run test:run
```

---

## 📦 Build & Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deployment
The application is optimized for deployment on:
- **Vercel** (recommended)
- **Netlify**
- **GitHub Pages**
- **AWS S3 + CloudFront**

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm run test
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines
- Follow React best practices
- Write comprehensive tests
- Update documentation
- Use meaningful commit messages
- Follow ESLint rules

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **PDF.js** by Mozilla for PDF processing capabilities
- **Tesseract.js** for OCR functionality
- **React** community for excellent documentation and tools
- **Vite** team for the amazing build tool
- All contributors and users of this project

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/CodewithEvilxd/pdf-extractor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/CodewithEvilxd/pdf-extractor/discussions)
- **Discord**: [Join our community](https://discord.gg/raj,dev_) | [Support channel](https://discord.gg/x raj_dev_X)

---

## 🔄 Changelog

### Version 1.0.0
- Initial release with core PDF extraction
- OCR support for scanned documents
- Advanced text processing features
- Responsive UI with dark/light themes
- Multiple export formats

---

**Made with ❤️ using React, PDF.js, and modern web technologies**

*Extract text from PDFs with confidence - fast, accurate, and privacy-first!*
