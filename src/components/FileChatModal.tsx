import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, User, Bot, Trash2 } from 'lucide-react';
import { Resource, puterService } from '../lib/puter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface FileChatModalProps {
    resource: Resource;
    onClose: () => void;
}

export default function FileChatModal({ resource, onClose }: FileChatModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [loadingHistory, setLoadingHistory] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const HISTORY_KEY = `chat_history_${resource.id}`;

    useEffect(() => {
        loadHistory();
    }, [resource.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const history = await puterService.kvGet(HISTORY_KEY);
            if (history) {
                setMessages(history);
            }
        } catch (err) {
            console.error('Failed to load chat history', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const puter = (window as any).puter;
            const stat = await puter.fs.stat(resource.path);
            const fullPath = stat.path;
            const response = await puter.ai.chat(
                [
                    ...newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
                    {
                        role: 'user',
                        content: [
                            { type: 'file', puter_path: fullPath },
                            { type: 'text', text: userMessage }
                        ]
                    }
                ],
                { model: 'claude-sonnet-4', stream: true });

            let fullResponse = '';
            for await (const part of response) {
                if (part?.text) {
                    fullResponse += part.text;
                    setStreamingMessage(fullResponse);
                }
            }

            const finalMessages: Message[] = [
                ...newMessages,
                { role: 'assistant' as const, content: fullResponse }
            ];

            setMessages(finalMessages);
            setStreamingMessage('');

            // Save to KV
            await puterService.kvSet(HISTORY_KEY, finalMessages);
        } catch (err) {
            console.error('Chat failed', err);
            alert('Failed to get AI response. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        if (!confirm('Clear chat history for this file?')) return;
        try {
            await puterService.kvDelete(HISTORY_KEY);
            setMessages([]);
        } catch (err) {
            console.error('Failed to clear history', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-white/10 w-full max-w-2xl h-[80vh] flex flex-col rounded-xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <Bot className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                                Chat with {resource.name}
                            </h2>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">AI Assistant</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {messages.length > 0 && (
                            <button
                                onClick={clearHistory}
                                className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                                title="Clear history"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 custom-scrollbar">
                    {loadingHistory ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                            <p className="text-xs text-zinc-500">Loading history...</p>
                        </div>
                    ) : messages.length === 0 && !streamingMessage ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-8">
                            <div className="w-12 h-12 bg-indigo-500/5 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/10">
                                <Bot className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h3 className="text-white font-medium mb-1">Upload successful</h3>
                            <p className="text-xs text-zinc-500 max-w-[280px]">
                                I've indexed **{resource.name}**. Ask me questions about its content, purpose, or data.
                            </p>
                        </div>
                    ) : (
                        <>
                            {messages.map((m, i) => (
                                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-zinc-900 border border-white/10 text-zinc-400'
                                        }`}>
                                        {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div className={`max-w-[85%] rounded-xl p-3 text-sm ${m.role === 'user'
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-zinc-900/50 border border-white/5 text-zinc-300 prose prose-invert prose-sm max-w-none'
                                        }`}>
                                        {m.role === 'assistant' ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                        ) : (
                                            m.content
                                        )}
                                    </div>
                                </div>
                            ))}
                            {streamingMessage && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="max-w-[85%] rounded-xl p-3 text-sm bg-zinc-900/50 border border-white/5 text-zinc-300 prose prose-invert prose-sm max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingMessage}</ReactMarkdown>
                                        <div className="inline-block w-1 h-3 bg-indigo-500 ml-1 animate-pulse" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-4 border-t border-white/10">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Ask a question about this file..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-700 disabled:opacity-50 text-white rounded-xl transition-all"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-2 text-center">
                        AI can make mistakes. Check important information.
                    </p>
                </form>
            </div>
        </div>
    );
}
