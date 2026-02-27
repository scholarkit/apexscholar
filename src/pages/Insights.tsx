import { useState, useRef, useEffect } from 'react';
import { Lightbulb, Sparkles, RefreshCw, FileText, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore - html2pdf doesn't have official types
import html2pdf from 'html2pdf.js';

import { Entry, Insight, puterService } from '../lib/puter';

export default function Insights() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLatestInsight = async () => {
      try {
        const insights: Insight[] = await puterService.kvGet('research_insights') || [];
        if (insights.length > 0) {
          // Sort by creation date and get the latest
          const latest = insights.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          setSummary(latest.content);
        }
      } catch (err) {
        console.error('Failed to fetch latest insight from Puter:', err);
      }
    };
    fetchLatestInsight();
  }, []);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch entries from Puter KV for context
      const entries: Entry[] = await puterService.kvGet('research_entries') || [];

      if (entries.length === 0) {
        setSummary("No research entries found yet. Start journaling to generate insights!");
        setLoading(false);
        return;
      }

      const context = entries
        .map((e: Entry) => `[${e.date}] ${e.entry_type}: ${e.content}`)
        .join('\n\n');

      const prompt = `You are a research assistant. Based on the following research journal entries, provide a concise summary of recent progress, identified patterns, and potential next steps. Use markdown for formatting, including tables for structured data if helpful. Ensure the output is professional and insightful.

JOURNAL ENTRIES:
${context}

SUMMARY:`;

      // 2. Generate with Puter.js AI
      const puter = window.puter;
      const puterResponse = await puter.ai.chat(prompt);
      const generatedSummary = typeof puterResponse === 'string'
        ? puterResponse
        : (puterResponse as any).message?.content || puterResponse.toString();

      // 3. Save to Puter KV
      const newInsight: Insight = {
        id: Math.random().toString(36).substring(2, 11),
        content: generatedSummary,
        created_at: new Date().toISOString()
      };

      const existingInsights: Insight[] = await puterService.kvGet('research_insights') || [];
      await puterService.kvSet('research_insights', [newInsight, ...existingInsights]);

      setSummary(generatedSummary);
    } catch (err) {
      console.error('Puter.js Insight Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred with Puter.js AI');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!summary) return;
    setExporting(true);

    // Create a hidden, clean element for PDF generation to avoid oklch/style issues
    const element = document.createElement('div');
    element.className = 'pdf-output-container';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '700px'; // Good width for a4
    element.style.padding = '40px';
    element.style.color = '#18181b'; // zinc-900
    element.style.backgroundColor = '#ffffff';
    element.style.fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';

    // Add title
    const title = document.createElement('h1');
    title.innerText = 'Research Insight Report';
    title.style.fontSize = '24px';
    title.style.fontWeight = '700';
    title.style.marginBottom = '8px';
    title.style.color = '#000000';
    element.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.innerText = `Generated on ${new Date().toLocaleDateString()}`;
    subtitle.style.fontSize = '14px';
    subtitle.style.color = '#71717a'; // zinc-500
    subtitle.style.marginBottom = '24px';
    subtitle.style.borderBottom = '1px solid #e4e4e7';
    subtitle.style.paddingBottom = '16px';
    element.appendChild(subtitle);

    // Create a container for the markdown
    const proseContainer = document.createElement('div');
    proseContainer.className = 'markdown-body';
    // Basic markdown styling for the PDF
    proseContainer.innerHTML = `
      <style>
        .markdown-body { font-size: 14px; line-height: 1.6; color: #3f3f46; }
        .markdown-body h2 { font-size: 18px; color: #18181b; margin-top: 24px; margin-bottom: 12px; font-weight: 600; }
        .markdown-body h3 { font-size: 16px; color: #27272a; margin-top: 20px; margin-bottom: 8px; font-weight: 600; }
        .markdown-body p { margin-bottom: 12px; }
        .markdown-body table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
        .markdown-body th, .markdown-body td { border: 1px solid #e4e4e7; padding: 8px; text-align: left; }
        .markdown-body th { background-color: #f4f4f5; font-weight: 600; }
        .markdown-body blockquote { border-left: 4px solid #e0e7ff; background: #f9fafb; padding: 8px 16px; margin: 16px 0; font-style: italic; }
        .markdown-body code { background: #f4f4f5; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 13px; }
        .markdown-body pre { background: #18181b; color: #f4f4f5; padding: 16px; border-radius: 8px; white-space: pre-wrap; margin: 16px 0; }
        .markdown-body ul, .markdown-body ol { margin-bottom: 16px; padding-left: 20px; }
        .markdown-body li { margin-bottom: 4px; }
      </style>
      <div id="content-target"></div>
    `;
    element.appendChild(proseContainer);

    // We can't easily use React Components in a detached DOM and keep them "alive", 
    // so we'll use a simple approach: just the text if it's complex, or we can use 
    // a separate hidden instance of Markdown if we want.
    // For simplicity and to GUARANTEE NO ERRORS, we'll use a temporary hidden div in the document.
    document.body.appendChild(element);

    // Instead of innerHTML for markdown (dangerous/hard), we use a hidden visible element 
    // that we then capture.

    // Use the innerHTML from the rendered markdown in the UI
    const contentTarget = element.querySelector('#content-target');
    if (contentTarget && summaryRef.current) {
      contentTarget.innerHTML = summaryRef.current.innerHTML;
    }

    const opt = {
      margin: 10,
      filename: `Research_Insight_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        // This is the key: only process the detached element
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
      setExporting(false);
    }).catch((err: any) => {
      console.error('PDF Export Error:', err);
      if (document.body.contains(element)) document.body.removeChild(element);
      setExporting(false);
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">AI Insights Engine</h1>
          <p className="text-zinc-400">Generate intelligent summaries from your recent research entries.</p>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? 'Analyzing...' : 'Generate Insights'}
        </button>
      </header>

      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-8 min-h-[400px] relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full animate-pulse" />
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
              <Sparkles className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-zinc-400 font-medium animate-pulse">Reading recent journal entries...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
              <FileText className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Analysis Failed</h3>
            <p className="text-zinc-400 max-w-md">{error}</p>
            <button
              onClick={generateInsights}
              className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : summary ? (
          <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-headings:text-white prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-code:text-indigo-300 prose-pre:bg-zinc-950/50 prose-pre:border prose-pre:border-white/5 relative z-10 transition-all duration-700">
            {/* <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                  <Lightbulb className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white m-0">Research Summary</h2>
                  <p className="text-sm text-zinc-400 m-0 mt-1">Generated based on recent activity</p>
                </div>
              </div>

              <button
                onClick={exportToPDF}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-all text-zinc-300 hover:text-white"
              >
                {exporting ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </div> */}
            <motion.div
              ref={summaryRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="p-4 rounded-xl" // Space for PDF capture
            >
              <Markdown remarkPlugins={[remarkGfm]}>{summary}</Markdown>
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <div className="w-20 h-20 bg-zinc-950 rounded-3xl flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
              <Lightbulb className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Ready to Analyze</h3>
            <p className="text-zinc-500 max-w-md mb-8">
              The AI engine will read your recent journal entries and synthesize the key findings, progress, and next steps into a professional report.
            </p>
            <button
              onClick={generateInsights}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Sparkles className="w-5 h-5" />
              Generate First Insight
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
