import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Activity, 
  Send, 
  Bot, 
  User, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Wrench,
  ShieldCheck,
  Zap,
  Tag,
  Sparkles,
  Trash2,
  RefreshCw
} from 'lucide-react';

// Use environment variable for API URL with fallback
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function App() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '🏭 Factory Operations & Safety Brain initialized. How can I assist you today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState(null);
  const [agentMode, setAgentMode] = useState('chat'); // chat, rca, compliance
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // checking, connected, disconnected
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check backend connection
  const checkConnection = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`);
      if (res.ok) {
        setConnectionStatus('connected');
        return true;
      } else {
        setConnectionStatus('disconnected');
        return false;
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      return false;
    }
  };

  const fetchDocuments = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/documents`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      setDocuments(data.documents || []);
      setConnectionStatus('connected');
    } catch (err) {
      console.error(err);
      setConnectionStatus('disconnected');
      setError('Could not connect to backend. Make sure it\'s running on port 8000');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkConnection();
    fetchDocuments();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      e.target.value = null;
      return;
    }

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
      
      const data = await res.json();
      console.log('Upload success:', data);
      
      // Refresh document list
      await fetchDocuments();
      
      // Show success message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Successfully uploaded "${file.name}"! You can now ask questions about it.`
      }]);
      
      e.target.value = null;
    } catch (err) {
      console.error(err);
      setError(`Failed to upload: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = { role: 'user', content: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoadingChat(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: userMessage.content, 
          mode: agentMode 
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Chat request failed');
      }
      
      const data = await res.json();
      setMessages((prev) => [
        ...prev, 
        { 
          role: 'assistant', 
          content: data.answer,
          citations: data.citations || []
        }
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setMessages((prev) => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `❌ Error: ${err.message}`,
          isError: true
        }
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const clearChat = () => {
    setMessages([
      { role: 'assistant', content: '🏭 Chat cleared. How can I assist you today?' }
    ]);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-blue-200">
      
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col p-6 shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-md shadow-blue-600/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-slate-900">Safety Brain</h1>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase mt-1">
              <span className={`relative flex h-2 w-2`}>
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-ping' : 
                  connectionStatus === 'checking' ? 'bg-yellow-400' : 'bg-red-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
              </span>
              <span className={connectionStatus === 'connected' ? 'text-green-600' : 
                connectionStatus === 'checking' ? 'text-yellow-600' : 'text-red-600'}>
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'checking' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upload Knowledge</h2>
            <button 
              onClick={fetchDocuments}
              disabled={isRefreshing}
              className="text-slate-400 hover:text-blue-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div 
            className={`group relative overflow-hidden border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
              connectionStatus === 'connected' 
                ? 'border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50' 
                : 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-50'
            }`}
            onClick={() => connectionStatus === 'connected' && fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            ) : (
              <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-3 group-hover:-translate-y-1 transform duration-300" />
            )}
            <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">
              {uploading ? 'Processing Document...' : 'Drop files here'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">Supports PDF, TXT (max 10MB)</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".txt,.pdf"
              disabled={connectionStatus !== 'connected'}
            />
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Indexed Records ({documents.length})
          </h2>
          {documents.length === 0 ? (
            <div className="text-sm text-slate-500 italic text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
              {connectionStatus === 'connected' ? 'No documents yet.' : 'Waiting for connection...'}
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, idx) => (
                <div key={idx} className="group bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 flex flex-col gap-2 hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5 transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-blue-50 p-1.5 rounded-lg border border-blue-100 group-hover:bg-blue-100 transition-colors">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mt-0.5">{doc.status}</p>
                    </div>
                  </div>
                  {doc.entities && doc.entities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pl-9">
                      {doc.entities.slice(0, 3).map((ent, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 flex items-center gap-1 font-semibold">
                          <Tag className="w-2.5 h-2.5" />
                          {ent}
                        </span>
                      ))}
                      {doc.entities.length > 3 && (
                        <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 font-semibold">
                          +{doc.entities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Main Panel */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-slate-50/50">
        
        {/* Error Toast */}
        {error && (
          <div className="absolute top-[88px] left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 z-50 shadow-lg shadow-red-900/5 animate-in slide-in-from-top-4 max-w-[90%]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600 font-bold">✕</button>
          </div>
        )}

        {/* Header */}
        <header className="h-[76px] border-b border-slate-200 flex items-center justify-between px-4 md:px-8 bg-white/90 backdrop-blur-md shrink-0 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="bg-blue-50 p-2 rounded-xl border border-blue-100 hidden sm:flex items-center justify-center">
               <Bot className="w-5 h-5 text-blue-600" />
             </div>
             <div>
                <h2 className="text-base font-bold text-slate-900 tracking-wide">Factory Operations Copilot</h2>
                <p className="text-[11px] text-slate-500 font-bold tracking-widest uppercase">Powered by Groq 70B</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200 shadow-inner">
              <button 
                onClick={() => setAgentMode('chat')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold tracking-wide flex items-center gap-2 transition-all duration-300 ${
                  agentMode === 'chat' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> 
                <span className="hidden sm:inline">General QA</span>
              </button>
              <button 
                onClick={() => setAgentMode('rca')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold tracking-wide flex items-center gap-2 transition-all duration-300 ${
                  agentMode === 'rca' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" /> 
                <span className="hidden sm:inline">RCA Mode</span>
              </button>
              <button 
                onClick={() => setAgentMode('compliance')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold tracking-wide flex items-center gap-2 transition-all duration-300 ${
                  agentMode === 'compliance' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> 
                <span className="hidden sm:inline">Compliance</span>
              </button>
            </div>
          </div>
        </header>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 z-10 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 max-w-4xl mx-auto w-full animate-in slide-in-from-bottom-2 fade-in duration-300 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 shadow-blue-600/20' 
                  : 'bg-white border border-slate-200'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-blue-600" />}
              </div>
              
              {/* Message Content */}
              <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-600/10' 
                    : msg.isError 
                      ? 'bg-white text-slate-800 border border-red-200 rounded-tl-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-col gap-2 w-full mt-2 pl-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-blue-500" />
                      Verified Sources ({msg.citations.length})
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                      {msg.citations.map((cite, cIdx) => (
                        <CitationPanel key={cIdx} citation={cite} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loadingChat && (
            <div className="flex gap-4 max-w-4xl mx-auto w-full animate-in fade-in">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-sm px-6 py-5 flex items-center gap-4 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm font-semibold text-slate-500 tracking-wide">
                  {agentMode === 'rca' ? 'Analyzing root causes...' : 
                   agentMode === 'compliance' ? 'Checking compliance...' : 
                   'Synthesizing intelligence...'}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-200 shrink-0 z-20 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.05)]">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end gap-3">
            <div className="relative flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder={
                  connectionStatus !== 'connected' ? '⛔ Waiting for connection to backend...' :
                  agentMode === 'rca' ? "🔍 Describe the equipment failure to run Root Cause Analysis..." :
                  agentMode === 'compliance' ? "📋 Check regulatory requirements against specific parameters..." :
                  "💬 Ask about safety protocols, maintenance logs, or factory procedures..."
                }
                className={`relative w-full bg-slate-50 border-2 rounded-2xl py-4 pl-6 pr-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none min-h-[60px] max-h-[200px] ${
                  connectionStatus !== 'connected' ? 'border-slate-200 cursor-not-allowed opacity-50' : 'border-slate-200'
                }`}
                rows={1}
                disabled={loadingChat || connectionStatus !== 'connected'}
              />
            </div>
            <button 
              type="submit" 
              disabled={!inputValue.trim() || loadingChat || connectionStatus !== 'connected'}
              className="relative h-[60px] w-[60px] flex items-center justify-center bg-blue-600 text-white rounded-2xl hover:shadow-lg hover:shadow-blue-600/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-300 shrink-0"
            >
              <Send className="w-6 h-6 ml-1" />
            </button>
          </form>
          <div className="text-center mt-3">
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              ⚠️ AI can make mistakes. Verify critical safety and compliance outputs.
            </p>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        @keyframes slide-in-from-bottom-2 {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation-duration: 300ms;
        }
        .slide-in-from-bottom-2 {
          animation-name: slide-in-from-bottom-2;
        }
        .fade-in {
          animation-name: fade-in;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-top-4 {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-in-from-top-4 {
          animation-name: slide-in-from-top-4;
        }
      `}} />
    </div>
  );
}

function CitationPanel({ citation }) {
  const [expanded, setExpanded] = useState(false);
  
  let scoreClass = 'bg-blue-50 text-blue-700 border-blue-200';
  if (citation.confidence_score < 70) scoreClass = 'bg-slate-50 border-slate-200 text-slate-600';
  if (citation.confidence_score < 40) scoreClass = 'bg-slate-50 border-slate-200 text-slate-400';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5 transition-all">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-3 w-full pr-4 min-w-0">
          <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-100 shrink-0">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-xs font-bold text-slate-800 truncate flex-1 leading-relaxed">{citation.source}</span>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border shrink-0 ${scoreClass}`}>
             <span className="text-[10px] font-black">{citation.confidence_score}%</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      
      {expanded && (
        <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
           <div className="text-xs/relaxed text-slate-700 italic border-l-2 border-blue-400 pl-4 bg-white py-2 pr-3 rounded-r-lg shadow-sm border border-l-0 border-slate-200">
            "{citation.snippet}"
          </div>
          
          {citation.entities && citation.entities.length > 0 && (
             <div className="mt-4 flex flex-wrap gap-1.5">
               {citation.entities.map((ent, i) => (
                  <span key={i} className="text-[9px] font-bold px-2 py-1 bg-white text-slate-600 rounded border border-slate-200 flex items-center gap-1.5 shadow-sm">
                    <Tag className="w-2.5 h-2.5 text-slate-400" />
                    {ent}
                  </span>
               ))}
             </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;