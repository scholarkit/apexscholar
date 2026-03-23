import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Brain, Sparkles, AlertCircle, Plus, Trash2, Send, MessageSquare, Terminal, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supermemory } from '../lib/supermemory';
import { ai } from '../lib/ai';
import { brainService, type Chat, type Message } from '../lib/brain';
import type { UserProfile } from '../lib/supermemory';
import { clsx } from 'clsx';

interface BrainModalProps {
    onClose: () => void;
}

export default function BrainModal({ onClose }: BrainModalProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focused, setFocused] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load initial data
    useEffect(() => {
        (async () => {
            try {
                const [profData, chatsData] = await Promise.all([
                    supermemory.getUserProfile(),
                    brainService.listChats()
                ]);
                setProfile(profData);
                setChats(chatsData);
                if (chatsData.length > 0) {
                    setSelectedChatId(chatsData[0].id);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load initial data');
            } finally {
                setProfileLoading(false);
            }
        })();
    }, []);

    // Load messages when chat selection changes
    useEffect(() => {
        if (!selectedChatId) {
            setMessages([]);
            return;
        }

        (async () => {
            setLoadingMessages(true);
            try {
                const msgs = await brainService.listMessages(selectedChatId);
                setMessages(msgs);
            } catch (err: any) {
                setError(err.message || 'Failed to load messages');
            } finally {
                setLoadingMessages(false);
            }
        })();
    }, [selectedChatId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input
    useEffect(() => {
        inputRef.current?.focus();
    }, [selectedChatId]);

    const handleCreateChat = async () => {
        try {
            const newChat = await brainService.createChat(`Chat ${chats.length + 1}`);
            setChats([newChat, ...chats]);
            setSelectedChatId(newChat.id);
        } catch (err: any) {
            setError(err.message || 'Failed to create chat');
        }
    };

    const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await brainService.deleteChat(id);
            setChats(prev => prev.filter(c => c.id !== id));
            if (selectedChatId === id) {
                setSelectedChatId(null);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete chat');
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !selectedChatId || sending) return;

        const userContent = input.trim();
        setInput('');
        setSending(true);
        setError(null);

        try {
            // 1. Save user message
            const userMsg = await brainService.addMessage(selectedChatId, 'user', userContent);
            setMessages(prev => [...prev, userMsg]);

            // 2. Fetch context from Supermemory
            const searchResults = await supermemory.searchMemory(userContent, { limit: 5 });
            const context = searchResults.results
                .map(r => `[${r.title}]: ${r.summary || ''} ${r.chunks.map(c => c.content).join(' ')}`)
                .join('\n\n');

            // 3. Prepare AI prompt
            const promptMessages = [
                {
                    role: 'system',
                    content: `You are Nexus, an advanced research assistant. Use the provided context from the user's memory to answer. If the context is irrelevant, rely on your knowledge but acknowledge the lack of specific memory context.
                    
                    USER MEMORY CONTEXT:
                    ${context}
                    
                    CORE KNOWLEDGE:
                    ${profile?.profile?.static?.join('\n') || ''}
                    `
                },
                ...messages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: userContent }
            ];

            // 4. Call AI
            const aiResponse = await ai.chat(promptMessages);

            // 5. Save AI response
            const assistantMsg = await brainService.addMessage(selectedChatId, 'assistant', aiResponse);
            setMessages(prev => [...prev, assistantMsg]);

        } catch (err: any) {
            setError(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-xl p-4 sm:p-8"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-6xl mx-auto h-full flex flex-col lg:flex-row overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 animate-in zoom-in-95 fade-in duration-300">
                
                {/* ── Sidebar ─────────────────────────────── */}
                <aside className="w-full lg:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 bg-zinc-900/30 flex flex-col relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
                    <div className="h-16 p-5 border-b border-white/5 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                <Brain className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h2 className="font-semibold text-sm tracking-wide text-zinc-100 uppercase">Nexus</h2>
                        </div>
                        <button 
                            onClick={handleCreateChat}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300 text-zinc-400 hover:text-white hover:scale-105 active:scale-95"
                            title="New Chat"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 z-10">
                        {chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChatId(chat.id)}
                                className={clsx(
                                    "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 text-sm",
                                    selectedChatId === chat.id 
                                        ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" 
                                        : "hover:bg-white/5 text-zinc-400 border border-transparent"
                                )}
                            >
                                <div className="flex items-center gap-3 truncate">
                                    <MessageSquare className={clsx(
                                        "w-4 h-4 flex-shrink-0 transition-colors duration-300",
                                        selectedChatId === chat.id ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
                                    )} />
                                    <span className="truncate font-medium">{chat.title}</span>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteChat(e, chat.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 rounded-md hover:text-rose-400 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {chats.length === 0 && !profileLoading && (
                            <div className="text-center py-10 opacity-50">
                                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">No sessions</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Profile Stats */}
                    <div className="p-5 border-t border-white/5 bg-black/20 z-10 backdrop-blur-md">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-3 flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-amber-500/70" />
                                    Memory Stats
                                </h3>
                                <div className="flex items-center justify-between text-xs text-zinc-400 bg-white/5 p-2 rounded-lg border border-white/5">
                                    <span>Core Knowledge</span>
                                    <span className="font-mono text-indigo-400 font-medium">{profile?.profile?.static?.length || 0}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-zinc-400 bg-white/5 p-2 rounded-lg border border-white/5 mt-2">
                                    <span>Recent Context</span>
                                    <span className="font-mono text-cyan-400 font-medium">{profile?.profile?.dynamic?.length || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Chat Window ────────────────────────────── */}
                <main className="flex-1 flex flex-col min-w-0 bg-zinc-950/50 relative">
                    {/* Header */}
                    <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-transparent z-10">
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <div className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
                            </div>
                            <span className="text-sm font-medium text-zinc-200 tracking-wide">
                                {selectedChatId ? chats.find(c => c.id === selectedChatId)?.title : 'Select a conversation'}
                            </span>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
                            <X className="w-5 h-5 text-zinc-400 hover:text-white" />
                        </button>
                    </header>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 z-10">
                        {!selectedChatId ? (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-70">
                                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(99,102,241,0.15)] animate-pulse">
                                    <Bot className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Initialize Nexus</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed">
                                    Select a conversation or create a new one to start interacting with your personalized research brain.
                                </p>
                            </div>
                        ) : loadingMessages ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                <span className="text-sm text-zinc-500 animate-pulse tracking-widest uppercase">Deciphering Memories...</span>
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto space-y-8">
                                {messages.map((m) => (
                                    <div 
                                        key={m.id} 
                                        className={clsx(
                                            "flex gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500",
                                            m.role === 'user' ? "flex-row-reverse" : ""
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-lg mt-1",
                                            m.role === 'user' 
                                                ? "bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border-indigo-500/30" 
                                                : "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30"
                                        )}>
                                            {m.role === 'user' ? <Terminal className="w-5 h-5 text-indigo-400" /> : <Sparkles className="w-5 h-5 text-emerald-400" />}
                                        </div>
                                        <div className={clsx(
                                            "p-5 text-sm leading-relaxed max-w-[85%] shadow-xl backdrop-blur-sm",
                                            m.role === 'user' 
                                                ? "bg-indigo-500/10 text-indigo-50 border border-indigo-500/20 rounded-3xl rounded-tr-sm" 
                                                : "bg-white/5 text-zinc-200 border border-white/10 rounded-3xl rounded-tl-sm"
                                        )}>
                                            {m.role === 'user' ? (
                                                <div className="whitespace-pre-wrap">{m.content}</div>
                                            ) : (
                                                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-a:text-indigo-400 hover:prose-a:text-indigo-300">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {m.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {sending && (
                                    <div className="flex gap-4 animate-in fade-in duration-300">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 mt-1 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                                        </div>
                                        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl rounded-tl-sm flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2 h-2 rounded-full bg-emerald-500/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-2 h-2 rounded-full bg-emerald-500/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} className="h-4" />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 pt-0 z-10 max-w-4xl mx-auto w-full">
                        {error && (
                            <div className="mb-4 flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-sm text-rose-200 backdrop-blur-sm animate-in slide-in-from-bottom-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                                {error}
                            </div>
                        )}
                        <div className="relative group">
                            <div className="relative flex items-end gap-3 bg-zinc-900/80 border border-white/10 rounded-3xl p-3 transition-all duration-300 shadow-2xl backdrop-blur-xl">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    onFocus={() => setFocused(true)}
                                    onBlur={() => setFocused(false)}
                                    placeholder="Message Nexus (Shift+Enter for new line)..."
                                    className="flex-1 bg-transparent border-none resize-none p-2 md:p-3 text-sm md:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none min-h-[52px] max-h-48 custom-scrollbar rounded-2xl"
                                    rows={1}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || sending || !selectedChatId}
                                    className={clsx(
                                        "p-3 rounded-2xl transition-all duration-300 flex-shrink-0 mb-1 flex items-center justify-center",
                                        input.trim() && !sending && selectedChatId
                                            ? "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] hover:scale-105 active:scale-95" 
                                            : "bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5"
                                    )}
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-4 opacity-70">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400/70" />
                            <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-[0.2em]">
                                Nexus AI securely analyzes your knowledge base
                            </p>
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400/70" />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
