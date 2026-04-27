import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { Upload, BookOpen, AlertTriangle, Coffee, FileText, CheckCircle2, Download, Copy, RefreshCw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast from 'react-hot-toast';

// ENV Variables (Set these in Vercel)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function App() {
  const [session, setSession] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [activeTab, setActiveTab] = useState('analyze');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
    } catch (error) {
      toast.error("Failed to sign in");
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Disclaimer Modal */}
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 max-w-lg shadow-2xl border-l-8 border-yellow-500"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <AlertTriangle className="text-yellow-600 w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Legal Disclaimer</h2>
              </div>
              <p className="mb-6 text-gray-600 leading-relaxed">
                This is an experimental AI-powered tool and <strong>NOT</strong> a substitute for professional legal advice. 
                This system may make mistakes. Always consult a qualified lawyer for legal matters in India. Do not make legal decisions based solely on this analysis.
              </p>
              <button 
                onClick={() => setShowDisclaimer(false)}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                I Understand and Agree
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="glass-effect sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-600 hidden sm:block">
              LexIndia AI
            </h1>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://www.chai4.me/jatinkalra" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-full hover:bg-orange-100 transition-colors shadow-sm font-medium"
          >
            <Coffee className="w-4 h-4" /> <span className="hidden sm:inline">Buy me a chai</span>
          </a>
          {session ? (
            <button onClick={() => supabase.auth.signOut()} className="text-sm font-medium text-gray-600 hover:text-red-600 px-2">
              Sign Out
            </button>
          ) : (
            <button onClick={handleGoogleSignIn} className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all shadow-md">
              Sign in
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full mt-10 p-4 mb-20">
        {!session ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <div className="inline-block p-4 bg-blue-100 rounded-full mb-6">
              <CheckCircle2 className="w-16 h-16 text-blue-600" />
            </div>
            <h2 className="text-5xl font-black mb-6 text-gray-900 tracking-tight">Democratizing <span className="text-blue-600">Indian Law</span> with AI</h2>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Upload complex legal notices, GST documents, FIRs, or court orders. Our multi-agent system reads, categorizes, and breaks down the legalese into simple steps.
            </p>
            <button onClick={handleGoogleSignIn} className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-xl hover:bg-blue-700 hover:-translate-y-1 transition-all">
              Start Using for Free
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Tabs */}
            <div className="flex gap-2 mb-8 justify-center bg-white p-1.5 rounded-2xl w-max mx-auto shadow-sm border border-gray-100">
              <button 
                onClick={() => setActiveTab('analyze')}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${activeTab === 'analyze' ? 'bg-blue-600 shadow-md text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Upload className="w-5 h-5" /> Analyze Document
              </button>
              <button 
                onClick={() => setActiveTab('explain')}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${activeTab === 'explain' ? 'bg-teal-600 shadow-md text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <BookOpen className="w-5 h-5" /> Ask Law Explainer
              </button>
            </div>

            {activeTab === 'analyze' ? <DocumentAnalyzer backendUrl={BACKEND_URL} /> : <LawExplainer backendUrl={BACKEND_URL} />}
          </motion.div>
        )}
      </main>
    </div>
  );
}

function DocumentAnalyzer({ backendUrl }) {
  const [file, setFile] = useState(null);
  const [loadingState, setLoadingState] = useState(''); // '', 'uploading', 'ocr', 'classifying', 'extracting', 'analyzing', 'simplifying'
  const [result, setResult] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) return;
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoadingState('uploading');
      
      // Artificial delay for better UX of agent progress
      setTimeout(() => setLoadingState('ocr'), 1500);
      setTimeout(() => setLoadingState('classifying'), 3500);
      setTimeout(() => setLoadingState('extracting'), 5500);
      setTimeout(() => setLoadingState('analyzing'), 7500);
      setTimeout(() => setLoadingState('simplifying'), 9500);

      const res = await axios.post(`${backendUrl}/analyze`, formData);
      setResult(res.data);
      toast.success("Analysis Complete!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to analyze document. Is the backend running?");
    } finally {
      setLoadingState('');
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const content = `INDIAN LEGAL DOCUMENT ANALYSIS REPORT\nFile: ${file.name}\n\n=== CLASSIFICATION ===\n${result.classification}\n\n=== EXTRACTED DATA ===\n${result.extraction}\n\n=== LEGAL ANALYSIS ===\n${result.legal_analysis}\n\n=== LAYMAN EXPLANATION & ACTION PLAN ===\n${result.simplified}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Legal_Analysis_${file.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.simplified);
      toast.success("Explanation copied to clipboard");
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative">
      <div className="mb-8 text-center">
        <h3 className="text-3xl font-black text-gray-900 mb-3">Document Intelligence</h3>
        <p className="text-gray-500 text-lg">Our Multi-Agent system uses OCR to read your document and AI to explain it.</p>
      </div>
      
      {/* Drag & Drop Zone */}
      <div 
        {...getRootProps()} 
        className={`border-3 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
      >
        <input {...getInputProps()} />
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
        {file ? (
          <div>
            <p className="text-lg font-bold text-blue-600">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB • Click or drag to change file</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-700">Drag & drop your legal document here</p>
            <p className="text-sm text-gray-500 mt-2">Supports PDF, JPG, PNG, DOCX</p>
          </div>
        )}
      </div>
      
      <button 
        onClick={handleUpload} 
        disabled={!file || loadingState !== ''} 
        className="w-full mt-6 bg-gray-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black hover:shadow-xl transition-all flex justify-center items-center gap-3"
      >
        {loadingState !== '' ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <RefreshCw className="w-6 h-6" />
            </motion.div>
            Processing...
          </>
        ) : (
          <>Analyze Document Now <CheckCircle2 className="w-5 h-5" /></>
        )}
      </button>

      {/* Loading Animation */}
      <AnimatePresence>
        {loadingState !== '' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-8 overflow-hidden">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" /> Agents are working...
              </h4>
              <div className="space-y-3">
                <Step label="Initializing multi-agent protocol" active={true} />
                <Step label="OCR Agent: Extracting text from document" active={['ocr', 'classifying', 'extracting', 'analyzing', 'simplifying'].includes(loadingState)} />
                <Step label="Classification Agent: Identifying legal domain" active={['classifying', 'extracting', 'analyzing', 'simplifying'].includes(loadingState)} />
                <Step label="Extraction Agent: Pulling key dates and sections" active={['extracting', 'analyzing', 'simplifying'].includes(loadingState)} />
                <Step label="Legal Agent: Analyzing implications" active={['analyzing', 'simplifying'].includes(loadingState)} />
                <Step label="Simplification Agent: Translating to layman terms" active={loadingState === 'simplifying'} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {result && loadingState === '' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900">Analysis Results</h3>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Copy to clipboard">
                <Copy className="w-5 h-5" />
              </button>
              <button onClick={downloadReport} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors" title="Download Full Report">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-8 bg-green-50 rounded-2xl border border-green-200 shadow-inner mb-6">
            <h4 className="text-xl font-black text-green-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" /> Layman Explanation
            </h4>
            <div className="prose prose-green max-w-none text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
              {result.simplified}
            </div>
          </div>
          
          <details className="group bg-gray-50 p-6 rounded-2xl border border-gray-200 cursor-pointer">
            <summary className="font-bold text-lg text-gray-700 flex justify-between items-center list-none">
              View Advanced Legal Data
              <span className="text-blue-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-6 space-y-6 text-sm text-gray-700 border-t border-gray-200 pt-6">
                <div>
                  <strong className="text-gray-900 block mb-2 uppercase tracking-wide text-xs">Document Classification:</strong>
                  <div className="bg-white p-4 rounded-lg border border-gray-100">{result.classification}</div>
                </div>
                <div>
                  <strong className="text-gray-900 block mb-2 uppercase tracking-wide text-xs">Extracted Entity Data:</strong>
                  <div className="bg-white p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">{result.extraction}</div>
                </div>
                <div>
                  <strong className="text-gray-900 block mb-2 uppercase tracking-wide text-xs">Deep Legal Analysis:</strong>
                  <div className="bg-white p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">{result.legal_analysis}</div>
                </div>
            </div>
          </details>
        </motion.div>
      )}
    </div>
  );
}

function Step({ label, active }) {
  return (
    <div className={`flex items-center gap-3 transition-colors duration-500 ${active ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
      {label}
    </div>
  );
}

function LawExplainer({ backendUrl }) {
  const [query, setQuery] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${backendUrl}/explain`, { query });
      setExplanation(res.data.explanation);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate explanation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
      <div className="mb-8 text-center">
        <h3 className="text-3xl font-black text-gray-900 mb-3">Indian Law Explainer</h3>
        <p className="text-gray-500 text-lg">Type any Indian law, section, or legal concept to get a simple, jargon-free explanation with examples.</p>
      </div>
      
      <div className="relative">
        <textarea 
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g., "What is Section 138 of the Negotiable Instruments Act?" or "Explain Anticipatory Bail under BNSS."'
          className="w-full p-6 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none mb-6 min-h-[160px] resize-none text-lg"
        />
        <button 
          onClick={handleExplain} 
          disabled={!query || loading} 
          className="absolute bottom-10 right-4 bg-teal-600 text-white px-6 py-2 rounded-xl font-bold shadow-md disabled:opacity-50 hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          {loading ? <><RefreshCw className="w-5 h-5 animate-spin" /> Thinking...</> : 'Explain It To Me'}
        </button>
      </div>

      {explanation && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-8 bg-teal-50 rounded-2xl border border-teal-100 shadow-inner">
          <div className="flex items-center gap-3 mb-4 border-b border-teal-200 pb-4">
            <BookOpen className="w-6 h-6 text-teal-600" />
            <h4 className="text-xl font-black text-teal-900">Simple Explanation</h4>
          </div>
          <p className="whitespace-pre-wrap text-gray-800 text-lg leading-relaxed">{explanation}</p>
        </motion.div>
      )}
    </div>
  );
}