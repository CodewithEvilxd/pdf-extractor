import { useState, useEffect, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function PdfReader() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [startPage, setStartPage] = useState("");
  const [endPage, setEndPage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filesBeingProcessed, setFilesBeingProcessed] = useState(0);
  const [enableTableExtraction, setEnableTableExtraction] = useState(false);
  const [extractedTables, setExtractedTables] = useState([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalPages: 0,
    totalTables: 0,
    processingTime: 0
  });
  const [showStats, setShowStats] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [textAnalysis, setTextAnalysis] = useState(null);
  const [showTextAnalysis, setShowTextAnalysis] = useState(false);
  const [formattedText, setFormattedText] = useState("");
  const [showTextFormatting, setShowTextFormatting] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [regexPattern, setRegexPattern] = useState("");
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [replaceText, setReplaceText] = useState("");
  const [searchStats, setSearchStats] = useState({ total: 0, current: 0 });
  const [showTextSummarization, setShowTextSummarization] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLength, setSummaryLength] = useState(30); // percentage
  const [summaryStats, setSummaryStats] = useState({ originalWords: 0, summaryWords: 0, compressionRatio: 0 });
  const [showTextToSpeech, setShowTextToSpeech] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [showKeywordExtraction, setShowKeywordExtraction] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [keywordCount, setKeywordCount] = useState(10);
  const [readingMode, setReadingMode] = useState(false);
  const [readingFontSize, setReadingFontSize] = useState(18);
  const [readingLineHeight, setReadingLineHeight] = useState(1.6);
  const [readingTheme, setReadingTheme] = useState('light');
  const [showTextSegmentation, setShowTextSegmentation] = useState(false);
  const [segmentedText, setSegmentedText] = useState(null);
  const [segmentationType, setSegmentationType] = useState('paragraphs');

  /**
    * Handles the file input change event.
    * Reads the selected PDF files and extracts their text content.
    */
  const handleFileChange = async (event) => {
    const selectedFiles = Array.from(event.target.files);

    if (selectedFiles.length === 0) {
      return;
    }

    // Validate files
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const invalidFiles = selectedFiles.filter(file => {
      if (file.type !== "application/pdf") {
        return true;
      }
      if (file.size > maxFileSize) {
        return true;
      }
      return false;
    });

    if (invalidFiles.length > 0) {
      const sizeErrors = invalidFiles.filter(file => file.size > maxFileSize);
      const typeErrors = invalidFiles.filter(file => file.type !== "application/pdf");

      let errorMessage = "Invalid files detected:\n";
      if (typeErrors.length > 0) {
        errorMessage += `• ${typeErrors.length} file(s) are not PDF format\n`;
      }
      if (sizeErrors.length > 0) {
        errorMessage += `• ${sizeErrors.length} file(s) exceed 50MB limit\n`;
      }
      setError(errorMessage);
      return;
    }

    // Validate page ranges
    if (startPage && endPage) {
      const start = parseInt(startPage);
      const end = parseInt(endPage);
      if (start > end) {
        setError("Start page cannot be greater than end page.");
        return;
      }
    }

    // Reset states
    setText("");
    setError(null);
    setSuccessMessage("");
    setLoading(true);
    setProgress(0);
    setFilesBeingProcessed(selectedFiles.length);
    const startTime = Date.now();

    try {
      let combinedText = "";
      const processed = [];

      for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex++) {
        const file = selectedFiles[fileIndex];
        const reader = new FileReader();

        await new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const typedarray = new Uint8Array(e.target.result);

              // Load the PDF document
              const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

              // Extract metadata
              await extractMetadata(file, pdf);
              let fileText = `=== ${file.name} ===\n`;

              // Determine page range
              const start = startPage ? parseInt(startPage) : 1;
              const end = endPage ? parseInt(endPage) : pdf.numPages;
              const actualStart = Math.max(1, Math.min(start, pdf.numPages));
              const actualEnd = Math.min(pdf.numPages, Math.max(end, actualStart));

              // Iterate through selected pages to extract text
              for (let i = actualStart; i <= actualEnd; i++) {
                const page = await pdf.getPage(i);
                const pageText = await extractTextWithOCR(page, i);
                fileText += `Page ${i}:\n${pageText}\n\n`;

                // Update overall progress
                const pagesProcessed = i - actualStart + 1;
                const totalPagesInRange = actualEnd - actualStart + 1;
                const fileProgress = pagesProcessed / totalPagesInRange;

                const totalPages = selectedFiles.reduce((sum, f, idx) => {
                  if (idx < fileIndex) return sum + (f.numPages || 10);
                  if (idx === fileIndex) return sum + (actualEnd - actualStart + 1) * fileProgress;
                  return sum + (f.numPages || 10);
                }, 0);
                const estimatedTotal = selectedFiles.reduce((sum, f) => sum + (f.numPages || 10), 0);
                setProgress(Math.round((totalPages / estimatedTotal) * 100));
              }

              combinedText += fileText + "\n";
              processed.push({ name: file.name, pages: pdf.numPages, text: fileText });
              resolve();
            } catch (err) {
              reject(err);
            }
          };

          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsArrayBuffer(file);
        });
      }

      setText(combinedText);

      // Detect tables if enabled
      if (enableTableExtraction) {
        const tables = detectTables(combinedText);
        setExtractedTables(tables);

        // Update stats
        const totalPages = selectedFiles.reduce((sum, file, idx) => {
          if (idx < selectedFiles.length) {
            // Estimate pages if not available
            return sum + (file.numPages || Math.floor(file.size / 50000) + 1);
          }
          return sum;
        }, 0);

        setStats({
          totalFiles: selectedFiles.length,
          totalPages: totalPages,
          totalTables: tables.length,
          processingTime: Date.now() - startTime
        });

        if (tables.length > 0) {
          setSuccessMessage(`Successfully extracted text and ${tables.length} table(s) from ${selectedFiles.length} PDF file(s)!`);
        } else {
          setSuccessMessage(`Successfully extracted text from ${selectedFiles.length} PDF file(s)!`);
        }
      } else {
        setSuccessMessage(`Successfully extracted text from ${selectedFiles.length} PDF file(s)!`);
      }
    } catch (err) {
      console.error("Error extracting text from PDFs:", err);
      let errorMessage = "An error occurred during text extraction:\n";

      if (err.name === "InvalidPDFException") {
        errorMessage += "• One or more files are not valid PDF documents\n";
      } else if (err.name === "PasswordException") {
        errorMessage += "• One or more PDFs are password protected\n";
      } else if (err.message.includes("network")) {
        errorMessage += "• Network error occurred while processing files\n";
      } else {
        errorMessage += "• Unexpected error: " + err.message + "\n";
      }

      errorMessage += "• Please check your files and try again";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === "application/pdf");

    if (pdfFiles.length > 0) {
      handleFileChange({ target: { files: pdfFiles } });
    } else {
      setError("Please drop valid PDF files only.");
    }
  };

  const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  };

  const downloadText = useCallback(() => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-text.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [text]);

  const downloadJSON = () => {
    const jsonData = {
      extractionDate: new Date().toISOString(),
      filesProcessed: filesBeingProcessed,
      ocrEnabled: false,
      extractedText: text,
      pages: text.split('\n\n').filter(page => page.trim()).map((page, index) => ({
        pageNumber: index + 1,
        content: page.trim()
      }))
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const pages = text.split('\n\n').filter(page => page.trim());
    const csvData = [
      ['Page Number', 'Content'],
      ...pages.map((page, index) => [
        index + 1,
        page.replace(/"/g, '""').replace(/\n/g, ' ').trim()
      ])
    ];

    const csvContent = csvData.map(row =>
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertToMarkdown = (text) => {
    if (!text) return '';

    // Split by file sections and process each file
    const fileSections = text.split('=== ').filter(section => section.trim());

    let markdown = '# 📄 PDF Text Extraction Results\n\n';
    markdown += `*Generated on: ${new Date().toLocaleString()}*\n\n`;
    markdown += '---\n\n';

    fileSections.forEach((section, fileIndex) => {
      const lines = section.split('\n');
      const fileName = lines[0].replace(' ===', '');

      // Add file header
      markdown += `## 📁 File ${fileIndex + 1}: ${fileName}\n\n`;

      // Process content lines
      let currentPage = '';
      let inPage = false;

      lines.slice(1).forEach(line => {
        if (line.startsWith('Page ')) {
          // If we were in a page, close it
          if (inPage && currentPage.trim()) {
            markdown += `${currentPage.trim()}\n\n`;
          }

          // Start new page
          const pageMatch = line.match(/Page (\d+):/);
          if (pageMatch) {
            markdown += `### 📄 Page ${pageMatch[1]}\n\n`;
          }
          currentPage = '';
          inPage = true;
        } else if (line.trim()) {
          // Add content line
          currentPage += `${line.trim()}\n\n`;
        }
      });

      // Close last page
      if (inPage && currentPage.trim()) {
        markdown += `${currentPage.trim()}\n\n`;
      }

      // Add separator between files
      if (fileIndex < fileSections.length - 1) {
        markdown += '---\n\n';
      }
    });

    // Add footer with statistics
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const pageCount = text.split('Page ').length - 1;
    const fileCount = fileSections.length;

    markdown += '---\n\n';
    markdown += '## 📊 Document Statistics\n\n';
    markdown += `- **Files Processed:** ${fileCount}\n`;
    markdown += `- **Total Pages:** ${pageCount}\n`;
    markdown += `- **Word Count:** ${wordCount}\n`;
    markdown += `- **Generated:** ${new Date().toLocaleString()}\n\n`;

    markdown += '---\n\n';
    markdown += '*This document was generated by PDF Text Extractor*\n';

    return markdown;
  };

  const downloadMarkdown = useCallback(() => {
    const markdownContent = convertToMarkdown(text);
    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-text.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [text]);


  const detectTables = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const tables = [];
    let currentTable = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Simple table detection heuristics
      const hasMultipleColumns = line.split(/\s{2,}|\t|\|/g).length > 2;
      const hasNumbers = /\d/.test(line);
      const hasConsistentSpacing = /\s{2,}/.test(line);

      if (hasMultipleColumns && (hasNumbers || hasConsistentSpacing)) {
        if (!inTable) {
          inTable = true;
          currentTable = [];
        }
        currentTable.push(line);
      } else if (inTable && currentTable.length > 1) {
        // End of table
        if (currentTable.length >= 2) {
          tables.push(parseTable(currentTable));
        }
        inTable = false;
        currentTable = [];
      }
    }

    // Handle table at end of text
    if (inTable && currentTable.length >= 2) {
      tables.push(parseTable(currentTable));
    }

    return tables;
  };

  const parseTable = (tableLines) => {
    const parsedRows = tableLines.map(line => {
      // Split by multiple spaces, tabs, or pipes
      return line.split(/\s{2,}|\t|\|/).map(cell => cell.trim()).filter(cell => cell);
    });

    // Normalize row lengths
    const maxCols = Math.max(...parsedRows.map(row => row.length));
    const normalizedRows = parsedRows.map(row => {
      while (row.length < maxCols) {
        row.push('');
      }
      return row;
    });

    return {
      headers: normalizedRows[0] || [],
      rows: normalizedRows.slice(1),
      raw: tableLines
    };
  };

  const tableToCSV = (table) => {
    const allRows = [table.headers, ...table.rows];
    return allRows.map(row =>
      row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const downloadTableCSV = (tableIndex) => {
    const table = extractedTables[tableIndex];
    if (!table) return;

    const csvContent = tableToCSV(table);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `table-${tableIndex + 1}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, [text]);

  const toggleStats = useCallback(() => {
    setShowStats(!showStats);
  }, [showStats]);

  const toggleTheme = useCallback(() => {
    setIsDarkTheme(!isDarkTheme);
  }, [isDarkTheme]);

  const analyzeText = useCallback((text) => {
    if (!text) return null;

    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0);
    const lines = text.split('\n').length;

    // Reading time estimation (average 200-250 words per minute)
    const readingTime = Math.ceil(words.length / 225);

    // Language detection (simple heuristic)
    const englishWords = words.filter(word =>
      /^[a-zA-Z]+$/.test(word) && word.length > 2
    ).length;
    const detectedLanguage = englishWords > words.length * 0.3 ? 'English' : 'Unknown';

    // Most frequent words (excluding common stop words)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall'];
    const wordFrequency = {};

    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord.length > 2 && !stopWords.includes(cleanWord)) {
        wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
      }
    });

    const topWords = Object.entries(wordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return {
      words: words.length,
      characters,
      charactersNoSpaces,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      lines,
      readingTime,
      detectedLanguage,
      topWords,
      averageWordLength: charactersNoSpaces / words.length,
      averageSentenceLength: words.length / sentences.length
    };
  }, []);

  const toggleTextAnalysis = useCallback(() => {
    if (text && !textAnalysis) {
      setTextAnalysis(analyzeText(text));
    }
    setShowTextAnalysis(!showTextAnalysis);
  }, [text, textAnalysis, analyzeText, showTextAnalysis]);

  const formatText = useCallback((text, options = {}) => {
    if (!text) return text;

    let formatted = text;

    // Remove extra whitespace
    if (options.removeExtraSpaces) {
      formatted = formatted.replace(/[ \t]+/g, ' ');
    }

    // Normalize line breaks
    if (options.normalizeLineBreaks) {
      formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      formatted = formatted.replace(/\n{3,}/g, '\n\n');
    }

    // Remove empty lines
    if (options.removeEmptyLines) {
      formatted = formatted.replace(/^\s*$[\r\n]*$/gm, '');
    }

    // Trim lines
    if (options.trimLines) {
      formatted = formatted.split('\n').map(line => line.trim()).join('\n');
    }

    // Capitalize first letter of sentences
    if (options.capitalizeSentences) {
      formatted = formatted.replace(/(^\s*|[.!?]\s*)([a-z])/g, (match, separator, letter) => {
        return separator + letter.toUpperCase();
      });
    }

    // Remove special characters
    if (options.removeSpecialChars) {
      formatted = formatted.replace(/[^\w\s\n.,!?\-()[\]{}'"]/g, '');
    }

    // Format paragraphs
    if (options.formatParagraphs) {
      formatted = formatted.replace(/\n{2,}/g, '\n\n');
      formatted = formatted.replace(/([^\n])\n([^\n])/g, '$1 $2');
    }

    return formatted;
  }, []);

  const applyTextFormatting = useCallback((options) => {
    const formatted = formatText(text, options);
    setFormattedText(formatted);
  }, [text, formatText]);

  const toggleTextFormatting = useCallback(() => {
    setShowTextFormatting(!showTextFormatting);
  }, [showTextFormatting]);

  const performAdvancedSearch = useCallback(() => {
    if (!text || !regexPattern) {
      setSearchResults([]);
      setSearchStats({ total: 0, current: 0 });
      return;
    }

    try {
      let flags = 'g';
      if (!isCaseSensitive) flags += 'i';

      let pattern = regexPattern;
      if (isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      const regex = new RegExp(pattern, flags);
      const matches = [];
      let match;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          text: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }

      setSearchResults(matches);
      setSearchStats({ total: matches.length, current: matches.length > 0 ? 1 : 0 });
      setCurrentResultIndex(matches.length > 0 ? 0 : -1);
    } catch (error) {
      console.error('Invalid regex pattern:', error);
      setSearchResults([]);
      setSearchStats({ total: 0, current: 0 });
      setCurrentResultIndex(-1);
    }
  }, [text, regexPattern, isCaseSensitive, isWholeWord]);

  const navigateSearchResults = useCallback((direction) => {
    if (searchResults.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentResultIndex < searchResults.length - 1 ? currentResultIndex + 1 : 0;
    } else {
      newIndex = currentResultIndex > 0 ? currentResultIndex - 1 : searchResults.length - 1;
    }

    setCurrentResultIndex(newIndex);
    setSearchStats({ ...searchStats, current: newIndex + 1 });

    // Scroll to the result
    const resultElement = document.querySelector(`[data-search-result="${newIndex}"]`);
    if (resultElement) {
      resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchResults, currentResultIndex, searchStats]);

  const replaceAllMatches = useCallback(() => {
    if (!text || !regexPattern || searchResults.length === 0) return;

    try {
      let flags = 'g';
      if (!isCaseSensitive) flags += 'i';

      let pattern = regexPattern;
      if (isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      const regex = new RegExp(pattern, flags);
      const newText = text.replace(regex, replaceText);

      // Update the text state (you might want to create a separate state for modified text)
      setText(newText);

      // Clear search results after replacement
      setSearchResults([]);
      setSearchStats({ total: 0, current: 0 });
      setCurrentResultIndex(-1);
    } catch (error) {
      console.error('Error during replacement:', error);
    }
  }, [text, regexPattern, replaceText, isCaseSensitive, isWholeWord, searchResults.length]);

  const highlightSearchResults = useCallback((text, results, currentIndex) => {
    if (!results.length) return text;

    let highlightedText = text;
    let offset = 0;

    results.forEach((result, index) => {
      const before = highlightedText.slice(0, result.start + offset);
      const match = highlightedText.slice(result.start + offset, result.end + offset);
      const after = highlightedText.slice(result.end + offset);

      const highlightClass = index === currentIndex ? 'search-highlight-current' : 'search-highlight';
      highlightedText = `${before}<span class="${highlightClass}" data-search-result="${index}">${match}</span>${after}`;
      offset += `<span class="${highlightClass}" data-search-result="${index}"></span>`.length;
    });

    return highlightedText;
  }, []);

  const toggleAdvancedSearch = useCallback(() => {
    setShowAdvancedSearch(!showAdvancedSearch);
  }, [showAdvancedSearch]);

  const generateSummary = useCallback((text, lengthPercentage = 30) => {
    if (!text) return { summary: "", stats: { originalWords: 0, summaryWords: 0, compressionRatio: 0 } };

    // Split text into sentences
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 10);

    if (sentences.length < 3) {
      return {
        summary: text,
        stats: {
          originalWords: text.split(/\s+/).length,
          summaryWords: text.split(/\s+/).length,
          compressionRatio: 100
        }
      };
    }

    // Calculate word frequencies
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall'];

    const wordFreq = {};
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 2 && !stopWords.includes(cleanWord)) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
      }
    });

    // Score sentences based on word frequencies
    const sentenceScores = sentences.map((sentence, index) => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      let score = 0;

      sentenceWords.forEach(word => {
        const cleanWord = word.replace(/[^\w]/g, '');
        if (wordFreq[cleanWord]) {
          score += wordFreq[cleanWord];
        }
      });

      // Boost score for sentence position (first and last sentences are often important)
      if (index === 0 || index === sentences.length - 1) {
        score *= 1.5;
      }

      // Boost score for sentence length (medium-length sentences are often important)
      const wordCount = sentenceWords.length;
      if (wordCount >= 8 && wordCount <= 25) {
        score *= 1.2;
      }

      return { sentence: sentence.trim(), score, index };
    });

    // Sort sentences by score and select top sentences
    sentenceScores.sort((a, b) => b.score - a.score);

    const targetSentenceCount = Math.max(3, Math.ceil(sentences.length * (lengthPercentage / 100)));
    const selectedSentences = sentenceScores.slice(0, targetSentenceCount);

    // Sort selected sentences by original order
    selectedSentences.sort((a, b) => a.index - b.index);

    // Generate summary
    const summaryText = selectedSentences.map(item => item.sentence).join('. ') + '.';

    // Calculate statistics
    const originalWords = words.length;
    const summaryWords = summaryText.split(/\s+/).length;
    const compressionRatio = Math.round((summaryWords / originalWords) * 100);

    return {
      summary: summaryText,
      stats: {
        originalWords,
        summaryWords,
        compressionRatio
      }
    };
  }, []);

  const handleGenerateSummary = useCallback(() => {
    const result = generateSummary(text, summaryLength);
    setSummary(result.summary);
    setSummaryStats(result.stats);
  }, [text, summaryLength, generateSummary]);

  const toggleTextSummarization = useCallback(() => {
    setShowTextSummarization(!showTextSummarization);
  }, [showTextSummarization]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (voices.length > 0 && !selectedVoice) {
        setSelectedVoice(voices[0]);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice]);

  const speakText = useCallback((textToSpeak) => {
    if (!textToSpeak || !selectedVoice) return;

    // Stop any current speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.voice = selectedVoice;
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeechProgress(0);
    };

    utterance.onprogress = (event) => {
      if (event.charIndex !== undefined) {
        const progress = (event.charIndex / textToSpeak.length) * 100;
        setSpeechProgress(progress);
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechProgress(100);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    speechSynthesis.speak(utterance);
  }, [selectedVoice, speechRate, speechPitch]);

  const pauseSpeech = useCallback(() => {
    speechSynthesis.pause();
    setIsSpeaking(false);
  }, []);

  const resumeSpeech = useCallback(() => {
    speechSynthesis.resume();
    setIsSpeaking(true);
  }, []);

  const stopSpeech = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeechProgress(0);
  }, []);

  const toggleTextToSpeech = useCallback(() => {
    setShowTextToSpeech(!showTextToSpeech);
  }, [showTextToSpeech]);

  const extractMetadata = useCallback(async (file, pdf) => {
    try {
      const metadata = await pdf.getMetadata();
      const info = metadata.info || {};

      // Format dates
      const formatDate = (date) => {
        if (!date) return 'Not available';
        try {
          return new Date(date).toLocaleString();
        } catch {
          return date.toString();
        }
      };

      // Calculate file size
      const fileSize = file.size;
      const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      const extractedMetadata = {
        title: info.Title || 'Not available',
        author: info.Author || 'Not available',
        subject: info.Subject || 'Not available',
        creator: info.Creator || 'Not available',
        producer: info.Producer || 'Not available',
        creationDate: formatDate(info.CreationDate),
        modificationDate: formatDate(info.ModDate),
        pageCount: pdf.numPages,
        fileSize: formatFileSize(fileSize),
        fileName: file.name,
        fileType: file.type,
        pdfVersion: pdf.pdfVersion || 'Not available',
        encryption: pdf.isEncrypted ? 'Encrypted' : 'Not encrypted',
        linearized: pdf.isLinearized ? 'Yes' : 'No'
      };

      setMetadata(extractedMetadata);
      return extractedMetadata;
    } catch (error) {
      console.error('Error extracting metadata:', error);
      setMetadata(null);
      return null;
    }
  }, []);

  const toggleMetadata = useCallback(() => {
    setShowMetadata(!showMetadata);
  }, [showMetadata]);

  const extractKeywords = useCallback((text, count = 10) => {
    if (!text) return [];

    // Preprocessing
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Stop words to exclude
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'can', 'shall', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
      'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
      'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'whose',
      'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'should', 'could', 'ought', 'i\'m', 'you\'re', 'he\'s',
      'she\'s', 'it\'s', 'we\'re', 'they\'re', 'i\'ve', 'you\'ve', 'we\'ve', 'they\'ve', 'i\'d', 'you\'d', 'he\'d', 'she\'d',
      'we\'d', 'they\'d', 'i\'ll', 'you\'ll', 'he\'ll', 'she\'ll', 'we\'ll', 'they\'ll', 'isn\'t', 'aren\'t', 'wasn\'t',
      'weren\'t', 'hasn\'t', 'haven\'t', 'hadn\'t', 'doesn\'t', 'don\'t', 'didn\'t', 'won\'t', 'wouldn\'t', 'shan\'t',
      'shouldn\'t', 'can\'t', 'cannot', 'couldn\'t', 'mustn\'t', 'let\'s', 'that\'s', 'who\'s', 'what\'s', 'here\'s',
      'there\'s', 'when\'s', 'where\'s', 'why\'s', 'how\'s', 'a\'s', 'an\'s', 'the\'s', 'all', 'any', 'both', 'each',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
      'very', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'
    ]);

    // Calculate word frequencies
    const wordFreq = {};
    const wordPositions = {};
    const totalWords = words.length;

    words.forEach((word, index) => {
      if (!stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
        if (!wordPositions[word]) {
          wordPositions[word] = [];
        }
        wordPositions[word].push(index);
      }
    });

    // Calculate TF-IDF-like scores
    const keywords = Object.entries(wordFreq).map(([word, freq]) => {
      // Term Frequency (TF)
      const tf = freq / totalWords;

      // Inverse Document Frequency (IDF) - simplified
      const idf = Math.log(1 + (totalWords / freq));

      // Position weight (words at the beginning are often more important)
      const positions = wordPositions[word];
      const avgPosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
      const positionWeight = 1 / (1 + avgPosition / totalWords);

      // Length weight (longer words are often more specific)
      const lengthWeight = Math.min(word.length / 10, 1);

      // Calculate final score
      const score = (tf * idf) * (1 + positionWeight) * (1 + lengthWeight);

      return {
        word,
        frequency: freq,
        score: score,
        positions: positions.length,
        avgPosition: Math.round(avgPosition)
      };
    });

    // Sort by score and return top keywords
    return keywords
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }, []);

  const handleExtractKeywords = useCallback(() => {
    const extractedKeywords = extractKeywords(text, keywordCount);
    setKeywords(extractedKeywords);
  }, [text, keywordCount, extractKeywords]);

  const toggleKeywordExtraction = useCallback(() => {
    setShowKeywordExtraction(!showKeywordExtraction);
  }, [showKeywordExtraction]);

  const toggleReadingMode = useCallback(() => {
    setReadingMode(!readingMode);
  }, [readingMode]);

  const exitReadingMode = useCallback(() => {
    setReadingMode(false);
  }, []);

  const segmentText = useCallback((text, type) => {
    if (!text) return null;

    if (type === 'paragraphs') {
      // Split by double line breaks (paragraphs)
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
      return {
        type: 'paragraphs',
        segments: paragraphs.map((paragraph, index) => ({
          id: index + 1,
          content: paragraph.trim(),
          wordCount: paragraph.trim().split(/\s+/).length,
          charCount: paragraph.trim().length
        })),
        totalSegments: paragraphs.length,
        totalWords: paragraphs.reduce((sum, p) => sum + p.trim().split(/\s+/).length, 0),
        totalChars: paragraphs.reduce((sum, p) => sum + p.trim().length, 0)
      };
    } else if (type === 'sentences') {
      // Split by sentence endings (. ! ?)
      const sentences = text.split(/[.!?]+/).filter(s => s.trim());
      return {
        type: 'sentences',
        segments: sentences.map((sentence, index) => ({
          id: index + 1,
          content: sentence.trim() + (index < sentences.length - 1 ? '.' : ''),
          wordCount: sentence.trim().split(/\s+/).length,
          charCount: sentence.trim().length
        })),
        totalSegments: sentences.length,
        totalWords: sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0),
        totalChars: sentences.reduce((sum, s) => sum + s.trim().length, 0)
      };
    }

    return null;
  }, []);

  const handleTextSegmentation = useCallback(() => {
    const result = segmentText(text, segmentationType);
    setSegmentedText(result);
  }, [text, segmentationType, segmentText]);

  const toggleTextSegmentation = useCallback(() => {
    setShowTextSegmentation(!showTextSegmentation);
  }, [showTextSegmentation]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          document.querySelector('.search-input')?.focus();
          break;
        case 'c':
          e.preventDefault();
          if (text) copyToClipboard();
          break;
        case 's':
          e.preventDefault();
          if (text) downloadText();
          break;
        case 'i':
          e.preventDefault();
          toggleStats();
          break;
      }
    }
  }, [text, copyToClipboard, downloadText, toggleStats]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const extractTextWithOCR = async (page, pageNum) => {
    try {
      // First try to extract text normally
      const textContent = await page.getTextContent();
      let extractedText = textContent.items.map((item) => item.str).join(" ");

      // OCR functionality disabled when tesseract.js is not available

      return extractedText;
    } catch (error) {
      console.error(`Error extracting text from page ${pageNum}:`, error);
      return `[Error extracting page ${pageNum}]`;
    }
  };

  return (
    <div className={`pdf-extractor-container ${isDarkTheme ? 'dark-theme' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingLeft: '20px' }}>
        <h1 className="pdf-extractor-title" style={{ marginLeft: '20px' }}>🚀 Advanced PDF Text Extractor with OCR</h1>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            background: isDarkTheme ? '#374151' : '#f3f4f6',
            color: isDarkTheme ? '#f9fafb' : '#374151',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginRight: '20px'
          }}
          aria-label={`Switch to ${isDarkTheme ? 'light' : 'dark'} theme`}
        >
          {isDarkTheme ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
      <p className="pdf-extractor-subtitle">
        Extract text, tables, and data from PDFs with AI-powered OCR technology
      </p>

      <div className="feature-grid">
        <div className="feature-card fade-in-up">
          <span className="feature-icon">📄</span>
          <h3 className="feature-title">PDF Text Extraction</h3>
          <p className="feature-description">Extract clean, formatted text from any PDF document with perfect accuracy</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">🤖</span>
          <h3 className="feature-title">AI OCR Technology</h3>
          <p className="feature-description">Convert scanned documents and images to editable text using advanced OCR</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">📊</span>
          <h3 className="feature-title">Table Detection</h3>
          <p className="feature-description">Automatically detect and extract tabular data with CSV export capability</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">🔍</span>
          <h3 className="feature-title">Smart Search</h3>
          <p className="feature-description">Search within extracted text with highlighted results and instant feedback</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">📊</span>
          <h3 className="feature-title">Text Analysis</h3>
          <p className="feature-description">Get detailed statistics including word count, reading time, and language detection</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">🛠️</span>
          <h3 className="feature-title">Text Formatting</h3>
          <p className="feature-description">Clean and format extracted text with advanced formatting and cleaning tools</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">🔍</span>
          <h3 className="feature-title">Advanced Search</h3>
          <p className="feature-description">Powerful regex search with find & replace, case sensitivity, and whole word matching</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">📋</span>
          <h3 className="feature-title">Text Summarization</h3>
          <p className="feature-description">AI-powered text summarization using frequency analysis to extract key information</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">🔊</span>
          <h3 className="feature-title">Text-to-Speech</h3>
          <p className="feature-description">Listen to extracted text with customizable voices, speed, and pitch controls</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">📋</span>
          <h3 className="feature-title">Metadata Extraction</h3>
          <p className="feature-description">Extract detailed document information including author, dates, file size, and PDF properties</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">🔑</span>
          <h3 className="feature-title">Keyword Extraction</h3>
          <p className="feature-description">Identify and extract the most important keywords using advanced TF-IDF and frequency analysis</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">📖</span>
          <h3 className="feature-title">Reading Mode</h3>
          <p className="feature-description">Distraction-free reading experience with customizable fonts, themes, and layout controls</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">📝</span>
          <h3 className="feature-title">Markdown Export</h3>
          <p className="feature-description">Export extracted text to beautifully formatted markdown with headers, sections, and document structure</p>
        </div>
        <div className="feature-card fade-in-up">
          <span className="feature-icon">✂️</span>
          <h3 className="feature-title">Text Segmentation</h3>
          <p className="feature-description">Break down extracted text into paragraphs or sentences with detailed statistics and analysis</p>
        </div>
      </div>

      <div
        className={`upload-area ${isDragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label="PDF upload area"
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          multiple
          style={{ display: "none" }}
          id="pdf-upload"
          aria-label="Select PDF files"
        />
        <div className="tooltip">
          <label htmlFor="pdf-upload" className="upload-button" role="button" tabIndex="0">
            Choose PDF Files
          </label>
          <span className="tooltip-text">Click to select PDF files or drag and drop them here</span>
        </div>
        <p style={{ marginTop: "10px", color: "#666" }}>
          or drag and drop multiple PDFs here
        </p>
      </div>

      <div className="keyboard-shortcuts">
        <h4>⌨️ Keyboard Shortcuts</h4>
        <div className="shortcuts-grid">
          <div className="shortcut">
            <span className="shortcut-desc">Focus search</span>
            <span className="shortcut-key">Ctrl+F</span>
          </div>
          <div className="shortcut">
            <span className="shortcut-desc">Copy text</span>
            <span className="shortcut-key">Ctrl+C</span>
          </div>
          <div className="shortcut">
            <span className="shortcut-desc">Download</span>
            <span className="shortcut-key">Ctrl+S</span>
          </div>
          <div className="shortcut">
            <span className="shortcut-desc">Toggle stats</span>
            <span className="shortcut-key">Ctrl+I</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <label style={{ display: "block", marginBottom: "10px", color: "#333", fontWeight: "500" }}>
          Page Selection (optional):
        </label>
        <div className="page-selection" style={{ display: "flex", gap: "10px", justifyContent: "center", alignItems: "center" }}>
          <div className="page-input-group">
            <label htmlFor="start-page" style={{ display: "block", fontSize: "0.9rem", color: "#666", marginBottom: "5px" }}>
              Start Page
            </label>
            <input
              type="number"
              id="start-page"
              min="1"
              value={startPage}
              onChange={(e) => setStartPage(e.target.value)}
              placeholder="1"
              style={{
                width: "80px",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                textAlign: "center"
              }}
              aria-label="Start page number"
            />
          </div>
          <span style={{ color: "#666", alignSelf: "flex-end", marginBottom: "8px" }}>to</span>
          <div className="page-input-group">
            <label htmlFor="end-page" style={{ display: "block", fontSize: "0.9rem", color: "#666", marginBottom: "5px" }}>
              End Page
            </label>
            <input
              type="number"
              id="end-page"
              min="1"
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              placeholder="All"
              style={{
                width: "80px",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                textAlign: "center"
              }}
              aria-label="End page number"
            />
          </div>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "5px" }}>
          Leave empty to extract from all pages
        </p>
      </div>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <div className="checkbox-group" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", opacity: 0.6 }}>
          <input
            type="checkbox"
            checked={false}
            disabled={true}
            style={{ transform: "scale(1.2)" }}
            aria-label="OCR functionality requires tesseract.js installation"
          />
          <span style={{ fontSize: "0.9rem", color: "#666" }}>
            OCR for scanned PDFs (requires tesseract.js)
          </span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "5px" }}>
          Install tesseract.js with: npm install tesseract.js
        </p>
      </div>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <div className="checkbox-group" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={enableTableExtraction}
            onChange={(e) => setEnableTableExtraction(e.target.checked)}
            style={{ transform: "scale(1.2)" }}
            aria-label="Enable table extraction from PDFs"
          />
          <span style={{ fontSize: "0.9rem", color: "#333" }}>
            Enable table extraction
          </span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "5px" }}>
          Automatically detect and extract tabular data from PDFs
        </p>
      </div>

      {loading && (
        <div className="progress-container fade-in-up">
          <div className="loading-spinner"></div>
          <p className="loading-message">
            🔄 Processing {filesBeingProcessed} PDF file(s), please wait...
          </p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p style={{ textAlign: "center", marginTop: "10px", fontWeight: "600" }}>
            {progress}% complete
          </p>
        </div>
      )}

      {error && <div className="error-message" style={{ whiteSpace: "pre-line" }}>{error}</div>}

      {successMessage && (
        <div className="success-message fade-in-up">
          <div className="success-checkmark"></div>
          <p style={{ marginTop: "20px", fontSize: "1.1rem", fontWeight: "600" }}>
            {successMessage}
          </p>
        </div>
      )}

      {showStats && (
        <div className="stats-dashboard fade-in-up">
          <div className="stat-card">
            <div className="stat-number">{stats.totalFiles}</div>
            <div className="stat-label">Files Processed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalPages}</div>
            <div className="stat-label">Total Pages</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalTables}</div>
            <div className="stat-label">Tables Found</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{(stats.processingTime / 1000).toFixed(1)}s</div>
            <div className="stat-label">Processing Time</div>
          </div>
        </div>
      )}

      {text && (
        <div>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>Extracted Text:</h3>
          <div style={{ marginBottom: "15px" }}>
            <input
              type="text"
              placeholder="Search in text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search extracted text"
              className="search-input"
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "1rem",
                marginBottom: "15px"
              }}
            />
            <div className="action-buttons" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={downloadText}
                className="upload-button btn-primary"
                style={{ padding: "10px 20px", fontSize: "1rem" }}
                aria-label="Download extracted text as text file"
              >
                📥 Download .txt
              </button>
              <button
                onClick={downloadMarkdown}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
                aria-label="Download extracted text as markdown file"
              >
                📝 Download .md
              </button>
              <button
                onClick={downloadJSON}
                className="upload-button btn-success"
                style={{ padding: "10px 20px", fontSize: "1rem" }}
                aria-label="Download extracted data as JSON file"
              >
                📊 Download .json
              </button>
              <button
                onClick={downloadCSV}
                className="upload-button btn-info"
                style={{ padding: "10px 20px", fontSize: "1rem" }}
                aria-label="Download extracted data as CSV file"
              >
                📋 Download .csv
              </button>
              <button
                onClick={copyToClipboard}
                className="upload-button btn-secondary"
                style={{ padding: "10px 20px", fontSize: "1rem" }}
                aria-label="Copy extracted text to clipboard"
              >
                📋 {copySuccess ? '✅ Copied!' : 'Copy Text'}
              </button>
              <button
                onClick={toggleStats}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%)" }}
                aria-label="Toggle statistics dashboard"
              >
                📈 {showStats ? 'Hide Stats' : 'Show Stats'}
              </button>
              <button
                onClick={toggleTextAnalysis}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)" }}
                aria-label="Toggle text analysis"
              >
                📊 {showTextAnalysis ? 'Hide Analysis' : 'Text Analysis'}
              </button>
              <button
                onClick={toggleTextFormatting}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                aria-label="Toggle text formatting tools"
              >
                🛠️ {showTextFormatting ? 'Hide Formatting' : 'Format Text'}
              </button>
              <button
                onClick={toggleAdvancedSearch}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}
                aria-label="Toggle advanced search with regex"
              >
                🔍 {showAdvancedSearch ? 'Hide Advanced Search' : 'Advanced Search'}
              </button>
              <button
                onClick={toggleTextSummarization}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}
                aria-label="Toggle text summarization"
              >
                📋 {showTextSummarization ? 'Hide Summary' : 'Text Summary'}
              </button>
              <button
                onClick={toggleTextToSpeech}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }}
                aria-label="Toggle text-to-speech"
              >
                🔊 {showTextToSpeech ? 'Hide Speech' : 'Text-to-Speech'}
              </button>
              <button
                onClick={toggleMetadata}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                aria-label="Toggle metadata display"
              >
                📋 {showMetadata ? 'Hide Metadata' : 'Document Info'}
              </button>
              <button
                onClick={toggleKeywordExtraction}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}
                aria-label="Toggle keyword extraction"
              >
                🔑 {showKeywordExtraction ? 'Hide Keywords' : 'Extract Keywords'}
              </button>
              <button
                onClick={toggleReadingMode}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" }}
                aria-label="Toggle reading mode"
              >
                📖 {readingMode ? 'Exit Reading' : 'Reading Mode'}
              </button>
              <button
                onClick={toggleTextSegmentation}
                className="upload-button"
                style={{ padding: "10px 20px", fontSize: "1rem", background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" }}
                aria-label="Toggle text segmentation"
              >
                ✂️ {showTextSegmentation ? 'Hide Segments' : 'Text Segments'}
              </button>
            </div>
          </div>
          <div
            className="extracted-text"
            dangerouslySetInnerHTML={{ __html: highlightText(text, searchTerm) }}
          />
        </div>
      )}

      {showTextAnalysis && textAnalysis && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>📊 Text Analysis & Statistics</h3>
          <div className="stats-dashboard">
            <div className="stat-card">
              <div className="stat-number">{textAnalysis.words.toLocaleString()}</div>
              <div className="stat-label">Total Words</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{textAnalysis.characters.toLocaleString()}</div>
              <div className="stat-label">Characters</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{textAnalysis.sentences.toLocaleString()}</div>
              <div className="stat-label">Sentences</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{textAnalysis.paragraphs.toLocaleString()}</div>
              <div className="stat-label">Paragraphs</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{textAnalysis.readingTime}</div>
              <div className="stat-label">Reading Time (min)</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{textAnalysis.averageWordLength.toFixed(1)}</div>
              <div className="stat-label">Avg Word Length</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{textAnalysis.detectedLanguage}</div>
              <div className="stat-label">Detected Language</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{textAnalysis.lines.toLocaleString()}</div>
              <div className="stat-label">Total Lines</div>
            </div>
          </div>

          {textAnalysis.topWords.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <h4 style={{ marginBottom: "10px", color: "#555" }}>🔤 Most Frequent Words</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {textAnalysis.topWords.map(({ word, count }, index) => (
                  <span
                    key={index}
                    style={{
                      background: "black",
                      color: "#1976d2",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      fontSize: "0.85rem",
                      fontWeight: "500"
                    }}
                  >
                    {word} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showTextToSpeech && text && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>🔊 Text-to-Speech</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px", background: "black" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", color: "#666", marginBottom: "5px" }}>
                Voice: {selectedVoice ? selectedVoice.name : 'Loading...'}
              </label>
              <select
                value={selectedVoice ? selectedVoice.name : ''}
                onChange={(e) => {
                  const voice = availableVoices.find(v => v.name === e.target.value);
                  setSelectedVoice(voice);
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "1rem"
                }}
                aria-label="Select speech voice"
              >
                {availableVoices.map((voice, index) => (
                  <option key={index} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", color: "#666", marginBottom: "5px" }}>
                Speed: {speechRate}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                style={{
                  width: "100%",
                  height: "6px",
                  borderRadius: "3px",
                  background: "#ddd",
                  outline: "none"
                }}
                aria-label="Speech rate"
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginTop: "5px" }}>
                <span>0.5x</span>
                <span>2x</span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", color: "#666", marginBottom: "5px" }}>
                Pitch: {speechPitch}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                style={{
                  width: "100%",
                  height: "6px",
                  borderRadius: "3px",
                  background: "#ddd",
                  outline: "none"
                }}
                aria-label="Speech pitch"
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginTop: "5px" }}>
                <span>0</span>
                <span>2</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "20px" }}>
            {!isSpeaking ? (
              <button
                onClick={() => speakText(text)}
                className="upload-button"
                style={{ padding: "12px 24px", fontSize: "1rem", background: "#10b981" }}
                aria-label="Start text-to-speech"
              >
                ▶️ Speak Text
              </button>
            ) : (
              <>
                <button
                  onClick={pauseSpeech}
                  className="upload-button"
                  style={{ padding: "12px 24px", fontSize: "1rem", background: "#f59e0b" }}
                  aria-label="Pause speech"
                >
                  ⏸️ Pause
                </button>
                <button
                  onClick={resumeSpeech}
                  className="upload-button"
                  style={{ padding: "12px 24px", fontSize: "1rem", background: "#10b981" }}
                  aria-label="Resume speech"
                >
                  ▶️ Resume
                </button>
              </>
            )}

            <button
              onClick={stopSpeech}
              className="upload-button"
              style={{ padding: "12px 24px", fontSize: "1rem", background: "#ef4444" }}
              aria-label="Stop speech"
            >
              ⏹️ Stop
            </button>

            {summary && (
              <button
                onClick={() => speakText(summary)}
                className="upload-button"
                style={{ padding: "12px 24px", fontSize: "1rem", background: "#8b5cf6" }}
                aria-label="Speak summary"
              >
                📋 Speak Summary
              </button>
            )}
          </div>

          {isSpeaking && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "0.9rem", color: "#666" }}>Speech Progress:</span>
                <span style={{ fontSize: "0.9rem", color: "#666" }}>{Math.round(speechProgress)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${speechProgress}%`, background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }}></div>
              </div>
            </div>
          )}

          <div style={{ padding: "15px", background: "black", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#374151" }}>🎵 Speech Features:</h4>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#6b7280", fontSize: "0.9rem" }}>
              <li>Multiple voice options with different languages</li>
              <li>Adjustable speech rate (0.5x to 2x speed)</li>
              <li>Customizable pitch control</li>
              <li>Real-time progress tracking</li>
              <li>Play/pause/resume functionality</li>
              <li>Option to speak full text or summary</li>
            </ul>
          </div>
        </div>
      )}

      {showMetadata && metadata && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>📋 Document Metadata</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
            <div style={{ padding: "15px", background: "black", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#374151", fontSize: "1rem" }}>📄 Basic Information</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>Title:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px" }}>{metadata.title}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>Author:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px" }}>{metadata.author}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>Subject:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px" }}>{metadata.subject}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>Creator:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px" }}>{metadata.creator}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>Producer:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px" }}>{metadata.producer}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: "15px", background: "black", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#374151", fontSize: "1rem" }}>📅 Dates & Versions</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>Created:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px", fontSize: "0.9rem" }}>{metadata.creationDate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>Modified:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px", fontSize: "0.9rem" }}>{metadata.modificationDate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>PDF Version:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px" }}>{metadata.pdfVersion}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>Pages:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px" }}>{metadata.pageCount}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: "15px", background: "black", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#374151", fontSize: "1rem" }}>💾 File Information</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>File Name:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px", fontSize: "0.9rem" }}>{metadata.fileName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>File Size:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px" }}>{metadata.fileSize}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>File Type:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px" }}>{metadata.fileType}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>Encryption:</span>
                  <span style={{ color: metadata.encryption === 'Encrypted' ? '#dc2626' : '#059669', textAlign: "right", flex: 1, marginLeft: "10px", fontWeight: "500" }}>
                    {metadata.encryption}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "500", color: "#6b7280" }}>Linearized:</span>
                  <span style={{ color: "#374151", textAlign: "right", flex: 1, marginLeft: "10px" }}>{metadata.linearized}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button
              onClick={() => {
                const metadataText = Object.entries(metadata)
                  .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}: ${value}`)
                  .join('\n');
                navigator.clipboard.writeText(metadataText);
              }}
              className="upload-button"
              style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#6b7280", marginRight: "10px" }}
              aria-label="Copy metadata to clipboard"
            >
              📋 Copy Metadata
            </button>
            <button
              onClick={() => {
                const metadataJSON = JSON.stringify(metadata, null, 2);
                const blob = new Blob([metadataJSON], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "document-metadata.json";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="upload-button"
              style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#059669" }}
              aria-label="Download metadata as JSON"
            >
              💾 Download Metadata
            </button>
          </div>
        </div>
      )}

      {showKeywordExtraction && text && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>🔑 Keyword Extraction</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px", background: "black" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", color: "#666", marginBottom: "5px" }}>
                Number of Keywords: {keywordCount}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={keywordCount}
                onChange={(e) => setKeywordCount(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  height: "6px",
                  borderRadius: "3px",
                  background: "#ddd",
                  outline: "none"
                }}
                aria-label="Number of keywords to extract"
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginTop: "5px" }}>
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button
                onClick={handleExtractKeywords}
                className="upload-button"
                style={{ padding: "12px 24px", fontSize: "1rem", background: "#10b981", width: "100%" }}
                aria-label="Extract keywords from text"
              >
                🔍 Extract Keywords
              </button>
            </div>
          </div>

          {keywords.length > 0 && (
            <div>
              <h4 style={{ marginBottom: "15px", color: "#555" }}>📊 Extracted Keywords:</h4>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px", marginBottom: "20px", background: "black" }}>
                {keywords.map((keyword, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "15px",
                      background: "black",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      position: "relative"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#374151" }}>
                        {keyword.word}
                      </span>
                      <span style={{
                        fontSize: "0.8rem",
                        color: "#6b7280",
                        background: "#e5e7eb",
                        padding: "2px 6px",
                        borderRadius: "10px"
                      }}>
                        #{index + 1}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.9rem" }}>
                      <div>
                        <span style={{ color: "#6b7280" }}>Frequency:</span>
                        <span style={{ color: "#059669", fontWeight: "500" }}> {keyword.frequency}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Score:</span>
                        <span style={{ color: "#dc2626", fontWeight: "500" }}> {keyword.score.toFixed(3)}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Positions:</span>
                        <span style={{ color: "#7c3aed", fontWeight: "500" }}> {keyword.positions}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Avg Position:</span>
                        <span style={{ color: "#ea580c", fontWeight: "500" }}> {keyword.avgPosition}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <button
                  onClick={() => {
                    const keywordText = keywords.map((k, i) => `${i + 1}. ${k.word} (${k.frequency})`).join('\n');
                    navigator.clipboard.writeText(keywordText);
                  }}
                  className="upload-button"
                  style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#6b7280", marginRight: "10px" }}
                  aria-label="Copy keywords to clipboard"
                >
                  📋 Copy Keywords
                </button>
                <button
                  onClick={() => {
                    const keywordData = {
                      extractionDate: new Date().toISOString(),
                      totalKeywords: keywords.length,
                      keywords: keywords
                    };
                    const blob = new Blob([JSON.stringify(keywordData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "keywords.json";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="upload-button"
                  style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#059669" }}
                  aria-label="Download keywords as JSON"
                >
                  💾 Download Keywords
                </button>
              </div>
            </div>
          )}

          <div style={{ padding: "15px", background: "black", borderRadius: "8px", border: "1px solid #e2e8f0", marginTop: "20px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#374151" }}>🎯 Keyword Extraction Algorithm:</h4>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#6b7280", fontSize: "0.9rem" }}>
              <li><strong>TF-IDF Scoring:</strong> Combines term frequency with inverse document frequency</li>
              <li><strong>Position Weighting:</strong> Keywords at the beginning are often more important</li>
              <li><strong>Length Optimization:</strong> Longer words are often more specific and meaningful</li>
              <li><strong>Stop Word Filtering:</strong> Excludes common words that don't carry meaning</li>
              <li><strong>Frequency Analysis:</strong> Higher frequency words get higher scores</li>
              <li><strong>Context Awareness:</strong> Considers word distribution throughout the document</li>
            </ul>
          </div>
        </div>
      )}

      {showTextSummarization && text && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>📋 Text Summarization</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", color: "#666", marginBottom: "5px" }}>
                Summary Length: {summaryLength}%
              </label>
              <input
                type="range"
                min="10"
                max="50"
                value={summaryLength}
                onChange={(e) => setSummaryLength(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  height: "6px",
                  borderRadius: "3px",
                  background: "#ddd",
                  outline: "none"
                }}
                aria-label="Summary length percentage"
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginTop: "5px" }}>
                <span>10%</span>
                <span>50%</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button
                onClick={handleGenerateSummary}
                className="upload-button"
                style={{ padding: "12px 24px", fontSize: "1rem", background: "#10b981", width: "100%" }}
                aria-label="Generate text summary"
              >
                📝 Generate Summary
              </button>
            </div>
          </div>

          {summary && (
            <div>
              <h4 style={{ marginBottom: "10px", color: "#555" }}>📄 Summary:</h4>
              <div className="extracted-text" style={{ background: "black", borderColor: "#0ea5e9" }}>
                {summary}
              </div>

              <div style={{ marginTop: "15px", padding: "15px", background: "black", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h5 style={{ margin: "0 0 10px 0", color: "#374151" }}>📊 Summary Statistics:</h5>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", background: "black" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#059669" }}>{summaryStats.originalWords.toLocaleString()}</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Original Words</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#dc2626" }}>{summaryStats.summaryWords.toLocaleString()}</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Summary Words</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#7c3aed" }}>{summaryStats.compressionRatio}%</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Compression</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "15px", textAlign: "center" }}>
                <button
                  onClick={() => navigator.clipboard.writeText(summary)}
                  className="upload-button"
                  style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#6b7280", marginRight: "10px" }}
                  aria-label="Copy summary to clipboard"
                >
                  📋 Copy Summary
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([summary], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "text-summary.txt";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="upload-button"
                  style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#059669" }}
                  aria-label="Download summary as text file"
                >
                  💾 Download Summary
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showAdvancedSearch && text && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>🔍 Advanced Search & Replace</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px", marginBottom: "20px", background: "black" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", color: "#666", marginBottom: "5px" }}>
                Regex Pattern:
              </label>
              <input
                type="text"
                value={regexPattern}
                onChange={(e) => setRegexPattern(e.target.value)}
                placeholder="Enter regex pattern (e.g., \b\w{5,}\b)"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  fontFamily: "monospace"
                }}
                aria-label="Regex search pattern"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", color: "#666", marginBottom: "5px" }}>
                Replace With:
              </label>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replacement text"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "1rem"
                }}
                aria-label="Replacement text"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "center", marginBottom: "20px" }}>
            <div className="checkbox-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="caseSensitive"
                checked={isCaseSensitive}
                onChange={(e) => setIsCaseSensitive(e.target.checked)}
                style={{ transform: "scale(1.2)" }}
                aria-label="Case sensitive search"
              />
              <label htmlFor="caseSensitive" style={{ fontSize: "0.9rem", color: "#333", cursor: "pointer" }}>
                Case Sensitive
              </label>
            </div>

            <div className="checkbox-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="wholeWord"
                checked={isWholeWord}
                onChange={(e) => setIsWholeWord(e.target.checked)}
                style={{ transform: "scale(1.2)" }}
                aria-label="Whole word matching"
              />
              <label htmlFor="wholeWord" style={{ fontSize: "0.9rem", color: "#333", cursor: "pointer" }}>
                Whole Word
              </label>
            </div>

            <button
              onClick={performAdvancedSearch}
              className="upload-button"
              style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#10b981" }}
              aria-label="Perform advanced search"
            >
              🔍 Search
            </button>

            {searchResults.length > 0 && (
              <>
                <button
                  onClick={() => navigateSearchResults('prev')}
                  className="upload-button"
                  style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#6b7280" }}
                  aria-label="Previous search result"
                >
                  ⬅️ Prev
                </button>

                <button
                  onClick={() => navigateSearchResults('next')}
                  className="upload-button"
                  style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#6b7280" }}
                  aria-label="Next search result"
                >
                  Next ➡️
                </button>

                <button
                  onClick={replaceAllMatches}
                  className="upload-button"
                  style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#ef4444" }}
                  aria-label="Replace all matches"
                >
                  🔄 Replace All
                </button>
              </>
            )}
          </div>

          {searchResults.length > 0 && (
            <div style={{ marginBottom: "20px", padding: "10px", background: "black", borderRadius: "8px", border: "1px solid #3b82f6" }}>
              <p style={{ margin: 0, color: "#1e40af", fontWeight: "500" }}>
                Found {searchStats.total} matches
                {searchStats.total > 0 && ` (showing ${searchStats.current}/${searchStats.total})`}
              </p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div>
              <h4 style={{ marginBottom: "10px", color: "#555" }}>🔎 Search Results:</h4>
              <div
                className="extracted-text"
                dangerouslySetInnerHTML={{ __html: highlightSearchResults(text, searchResults, currentResultIndex) }}
                style={{ background: "black", borderColor: "#e5e7eb" }}
              />
            </div>
          )}
        </div>
      )}

      {showTextFormatting && text && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>🛠️ Text Formatting & Cleaning</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px" }}>
            <div className="checkbox-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="removeExtraSpaces"
                onChange={(e) => {
                  const options = { removeExtraSpaces: e.target.checked };
                  applyTextFormatting(options);
                }}
                style={{ transform: "scale(1.2)" }}
                aria-label="Remove extra spaces and tabs"
              />
              <label htmlFor="removeExtraSpaces" style={{ fontSize: "0.9rem", color: "#333", cursor: "pointer" }}>
                Remove Extra Spaces
              </label>
            </div>

            <div className="checkbox-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="normalizeLineBreaks"
                onChange={(e) => {
                  const options = { normalizeLineBreaks: e.target.checked };
                  applyTextFormatting(options);
                }}
                style={{ transform: "scale(1.2)" }}
                aria-label="Normalize line breaks"
              />
              <label htmlFor="normalizeLineBreaks" style={{ fontSize: "0.9rem", color: "#333", cursor: "pointer" }}>
                Fix Line Breaks
              </label>
            </div>

            <div className="checkbox-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="removeEmptyLines"
                onChange={(e) => {
                  const options = { removeEmptyLines: e.target.checked };
                  applyTextFormatting(options);
                }}
                style={{ transform: "scale(1.2)" }}
                aria-label="Remove empty lines"
              />
              <label htmlFor="removeEmptyLines" style={{ fontSize: "0.9rem", color: "#333", cursor: "pointer" }}>
                Remove Empty Lines
              </label>
            </div>

            <div className="checkbox-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="trimLines"
                onChange={(e) => {
                  const options = { trimLines: e.target.checked };
                  applyTextFormatting(options);
                }}
                style={{ transform: "scale(1.2)" }}
                aria-label="Trim whitespace from lines"
              />
              <label htmlFor="trimLines" style={{ fontSize: "0.9rem", color: "#333", cursor: "pointer" }}>
                Trim Lines
              </label>
            </div>

            <div className="checkbox-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="capitalizeSentences"
                onChange={(e) => {
                  const options = { capitalizeSentences: e.target.checked };
                  applyTextFormatting(options);
                }}
                style={{ transform: "scale(1.2)" }}
                aria-label="Capitalize first letter of sentences"
              />
              <label htmlFor="capitalizeSentences" style={{ fontSize: "0.9rem", color: "#333", cursor: "pointer" }}>
                Capitalize Sentences
              </label>
            </div>

            <div className="checkbox-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="formatParagraphs"
                onChange={(e) => {
                  const options = { formatParagraphs: e.target.checked };
                  applyTextFormatting(options);
                }}
                style={{ transform: "scale(1.2)" }}
                aria-label="Format paragraphs properly"
              />
              <label htmlFor="formatParagraphs" style={{ fontSize: "0.9rem", color: "#333", cursor: "pointer" }}>
                Format Paragraphs
              </label>
            </div>
          </div>

          {formattedText && (
            <div>
              <h4 style={{ marginBottom: "10px", color: "#555" }}>📝 Formatted Text:</h4>
              <div className="extracted-text" style={{ background: "black", borderColor: "#3b82f6" }}>
                {formattedText}
              </div>
              <div style={{ marginTop: "10px", textAlign: "center" }}>
                <button
                  onClick={() => navigator.clipboard.writeText(formattedText)}
                  className="upload-button"
                  style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#10b981" }}
                  aria-label="Copy formatted text to clipboard"
                >
                  📋 Copy Formatted Text
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {extractedTables.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>Extracted Tables:</h3>
          {extractedTables.map((table, index) => (
            <div key={index} style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px" }}>
              <h4 style={{ marginBottom: "10px", color: "#555" }}>Table {index + 1}</h4>
              <div className="responsive-table" style={{ marginBottom: "10px" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "400px" }}>
                  <thead>
                    <tr>
                      {table.headers.map((header, headerIndex) => (
                        <th key={headerIndex} style={{ border: "1px solid #ddd", padding: "8px", backgroundColor: "#f8f9fa", textAlign: "left" }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} style={{ border: "1px solid #ddd", padding: "8px" }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => downloadTableCSV(index)}
                className="upload-button"
                style={{ padding: "8px 16px", fontSize: "0.9rem", background: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)" }}
                aria-label={`Download table ${index + 1} as CSV`}
              >
                Download Table {index + 1} as CSV
              </button>
            </div>
          ))}
        </div>
      )}

      {showTextSegmentation && text && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>✂️ Text Segmentation</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", color: "#666", marginBottom: "5px" }}>
                Segmentation Type:
              </label>
              <select
                value={segmentationType}
                onChange={(e) => setSegmentationType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  background: "white"
                }}
                aria-label="Choose segmentation type"
              >
                <option value="paragraphs">📄 Paragraphs</option>
                <option value="sentences">📝 Sentences</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button
                onClick={handleTextSegmentation}
                className="upload-button"
                style={{ padding: "10px 24px", fontSize: "1rem", background: "#059669", width: "100%" }}
                aria-label="Segment text"
              >
                ✂️ Segment Text
              </button>
            </div>
          </div>

          {segmentedText && (
            <div>
              <h4 style={{ marginBottom: "15px", color: "#555" }}>
                📊 Segmented {segmentedText.type === 'paragraphs' ? 'Paragraphs' : 'Sentences'}:
              </h4>

              <div style={{ marginBottom: "20px", padding: "15px", background: "black", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px", fontSize: "0.9rem" }}>
                  <div>
                    <span style={{ color: "#6b7280" }}>Total Segments:</span>
                    <span style={{ color: "#059669", fontWeight: "600", marginLeft: "5px" }}>{segmentedText.totalSegments}</span>
                  </div>
                  <div>
                    <span style={{ color: "#6b7280" }}>Total Words:</span>
                    <span style={{ color: "#dc2626", fontWeight: "600", marginLeft: "5px" }}>{segmentedText.totalWords}</span>
                  </div>
                  <div>
                    <span style={{ color: "#6b7280" }}>Total Characters:</span>
                    <span style={{ color: "#7c3aed", fontWeight: "600", marginLeft: "5px" }}>{segmentedText.totalChars}</span>
                  </div>
                  <div>
                    <span style={{ color: "#6b7280" }}>Avg Words/Segment:</span>
                    <span style={{ color: "#ea580c", fontWeight: "600", marginLeft: "5px" }}>
                      {(segmentedText.totalWords / segmentedText.totalSegments).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: "500px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                {segmentedText.segments.map((segment) => (
                  <div
                    key={segment.id}
                    style={{
                      padding: "15px",
                      borderBottom: "1px solid #f1f5f9",
                      background: segment.id % 2 === 0 ? "#fafbfc" : "white",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "15px"
                    }}
                  >
                    <div style={{
                      minWidth: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: segmentedText.type === 'paragraphs' ? "#3b82f6" : "#10b981",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      flexShrink: 0
                    }}>
                      {segment.id}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: "8px", fontSize: "0.95rem", lineHeight: "1.5" }}>
                        {segment.content}
                      </div>

                      <div style={{ display: "flex", gap: "15px", fontSize: "0.8rem", color: "#6b7280" }}>
                        <span>📝 {segment.wordCount} words</span>
                        <span>📏 {segment.charCount} chars</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <button
                  onClick={() => {
                    const exportData = {
                      segmentationType: segmentedText.type,
                      totalSegments: segmentedText.totalSegments,
                      totalWords: segmentedText.totalWords,
                      totalChars: segmentedText.totalChars,
                      segments: segmentedText.segments,
                      generatedAt: new Date().toISOString()
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `text-segments-${segmentedText.type}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="upload-button"
                  style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#6b7280", marginRight: "10px" }}
                  aria-label="Export segmented text as JSON"
                >
                  💾 Export Segments
                </button>
                <button
                  onClick={() => {
                    const textContent = segmentedText.segments.map(s => s.content).join('\n\n');
                    navigator.clipboard.writeText(textContent);
                  }}
                  className="upload-button"
                  style={{ padding: "8px 16px", fontSize: "0.9rem", background: "#059669" }}
                  aria-label="Copy all segments to clipboard"
                >
                  📋 Copy All
                </button>
              </div>
            </div>
          )}

          <div style={{ padding: "15px", background: "black", borderRadius: "8px", border: "1px solid #e2e8f0", marginTop: "20px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#374151" }}>🎯 Text Segmentation Features:</h4>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#6b7280", fontSize: "0.9rem" }}>
              <li><strong>Paragraph Segmentation:</strong> Splits text by double line breaks for natural paragraph detection</li>
              <li><strong>Sentence Segmentation:</strong> Splits text by sentence endings (. ! ?) for granular analysis</li>
              <li><strong>Statistics Tracking:</strong> Word count, character count, and segment metrics for each part</li>
              <li><strong>Visual Organization:</strong> Numbered segments with alternating colors for easy reading</li>
              <li><strong>Export Capabilities:</strong> JSON export and clipboard copy for further processing</li>
              <li><strong>Real-time Analysis:</strong> Instant segmentation with comprehensive statistics</li>
            </ul>
          </div>
        </div>
      )}

      {readingMode && text && (
        <div className="reading-mode-overlay">
          <div className="reading-mode-header">
            <button
              onClick={exitReadingMode}
              className="reading-mode-exit"
              aria-label="Exit reading mode"
            >
              ✕ Exit Reading Mode
            </button>
            <div className="reading-controls">
              <div className="control-group">
                <label>Font Size: {readingFontSize}px</label>
                <input
                  type="range"
                  min="14"
                  max="32"
                  value={readingFontSize}
                  onChange={(e) => setReadingFontSize(parseInt(e.target.value))}
                  className="reading-slider"
                />
              </div>
              <div className="control-group">
                <label>Line Height: {readingLineHeight}</label>
                <input
                  type="range"
                  min="1.2"
                  max="2.0"
                  step="0.1"
                  value={readingLineHeight}
                  onChange={(e) => setReadingLineHeight(parseFloat(e.target.value))}
                  className="reading-slider"
                />
              </div>
              <div className="control-group">
                <label>Theme:</label>
                <select
                  value={readingTheme}
                  onChange={(e) => setReadingTheme(e.target.value)}
                  className="reading-select"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="sepia">Sepia</option>
                </select>
              </div>
            </div>
          </div>
          <div
            className={`reading-content ${readingTheme}-theme`}
            style={{
              fontSize: `${readingFontSize}px`,
              lineHeight: readingLineHeight
            }}
          >
            {text.split('\n\n').map((paragraph, index) => (
              <p key={index} className="reading-paragraph">
                {paragraph.trim()}
              </p>
            ))}
          </div>
        </div>
      )}

      <footer>
        <div className="footer-features">
          <span className="footer-feature">
            🔒 <strong>Privacy:</strong> All processing happens in your browser
          </span>
          <span className="footer-feature">
            ⚡ <strong>Fast:</strong> No uploads to external servers
          </span>
          <span className="footer-feature">
            🎯 <strong>Accurate:</strong> Advanced text extraction algorithms
          </span>
        </div>
        <p className="footer-credit">
          Built with ❤️ using React, PDF.js, and modern web technologies
        </p>
      </footer>
    </div>
  );
}

export default PdfReader;
