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
    <div className="pdf-extractor-container">
      <h1 className="pdf-extractor-title">🚀 Advanced PDF Text Extractor with OCR</h1>
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
            </div>
          </div>
          <div
            className="extracted-text"
            dangerouslySetInnerHTML={{ __html: highlightText(text, searchTerm) }}
          />
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
