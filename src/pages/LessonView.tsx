import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, BookOpen, Volume2, Square, Loader2 } from 'lucide-react';
import { COURSES_2, PROGRESS_KV_KEY, CourseProgress } from '../lib/courseData';
import { kv } from '../lib/kv';

export default function LessonView() {
    const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
    const navigate = useNavigate();

    const course = COURSES_2.find((c) => c.id === courseId);
    const lessonIndex = course?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
    const lesson = course?.lessons[lessonIndex];
    const prevLesson = lessonIndex > 0 ? course!.lessons[lessonIndex - 1] : null;
    const nextLesson = lessonIndex < (course?.lessons.length ?? 0) - 1 ? course!.lessons[lessonIndex + 1] : null;

    const [progress, setProgress] = useState<CourseProgress>({});
    const [saving, setSaving] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audio, setAudio] = useState<any>(null);

    useEffect(() => {
        kv.get(PROGRESS_KV_KEY).then((data: CourseProgress | null) => {
            setProgress(data || {});
        });
    }, []);

    const isDone = !!(progress[courseId!]?.[lessonId!]);

    const toggleComplete = useCallback(async () => {
        if (!courseId || !lessonId) return;
        setSaving(true);
        const updated: CourseProgress = {
            ...progress,
            [courseId]: {
                ...(progress[courseId] || {}),
                [lessonId]: !isDone,
            },
        };
        setProgress(updated);
        await kv.set(PROGRESS_KV_KEY, updated);
        setSaving(false);
    }, [progress, courseId, lessonId, isDone]);

    const markDoneAndNext = useCallback(async () => {
        if (!courseId || !lessonId) return;
        setSaving(true);
        const updated: CourseProgress = {
            ...progress,
            [courseId]: { ...(progress[courseId] || {}), [lessonId]: true },
        };
        setProgress(updated);
        await kv.set(PROGRESS_KV_KEY, updated);
        setSaving(false);
        if (nextLesson?.content) {
            navigate(`/learn/${courseId}/${nextLesson.id}`);
        } else {
            navigate(`/learn/${courseId}`);
        }
    }, [progress, courseId, lessonId, nextLesson, navigate]);

    const handleListen = async () => {
        if (isPlaying) {
            audio?.pause();
            setIsPlaying(false);
            return;
        }

        if (!lesson?.content) return;

        try {
            setIsLoadingAudio(true);
            const { ai } = await import('../lib/ai');

            // Basic markdown stripping for cleaner speech
            const plainText = lesson.content
                .replace(/[#*`~]/g, '') // Remove simple symbols
                .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
                .slice(0, 4000); // 4000 char limit usually safe for TTS

            const speech = await ai.txt2speech(
                `Lesson: ${lesson.title}. ${plainText}`,
                {
                    provider: "elevenlabs",
                    model: "eleven_multilingual_v2",
                    voice: "21m00Tcm4TlvDq8ikWAM",
                    output_format: "mp3_44100_128"
                }
            );

            // Our browser TTS returns true on completion, 
            // Puter returns an Audio-like object we have to .play()
            if (typeof speech === 'boolean') {
                setIsLoadingAudio(false);
                setIsPlaying(false);
            } else {
                setAudio(speech);
                setIsLoadingAudio(false);
                setIsPlaying(true);
                (speech as any).play();

                (speech as any).onended = () => {
                    setIsPlaying(false);
                };
            }
        } catch (error) {
            console.error("TTS failed:", error);
            setIsLoadingAudio(false);
            alert("Failed to generate audio. Please check your connection.");
        }
    };

    // Clean up audio on unmount
    useEffect(() => {
        return () => {
            if (audio) {
                audio.pause();
            }
        };
    }, [audio]);

    if (!course || !lesson) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <p className="text-zinc-400 font-medium">Lesson not found.</p>
                <Link to="/learn" className="mt-4 text-indigo-400 text-sm hover:text-indigo-300">← Back to Learn</Link>
            </div>
        );
    }

    const courseProgress = progress[courseId!] || {};
    const completedCount = Object.values(courseProgress).filter(Boolean).length;
    const pct = Math.round((completedCount / course.lessons.length) * 100);

    return (
        <div className="animate-in fade-in duration-500 pb-32 sm:pb-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
                <Link to="/learn" className="hover:text-zinc-300 transition-colors">Learn</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link to={`/learn/${course.id}`} className="hover:text-zinc-300 transition-colors">{course.title}</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-zinc-300 truncate max-w-[160px]">{lesson.title}</span>
            </nav>

            {/* Lesson Header */}
            <div className="mb-8">
                <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">
                        Lesson {lessonIndex + 1} of {course.lessons.length}
                    </span>
                    {isDone && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{lesson.title}</h1>
                        <p className="text-zinc-500 text-sm">{lesson.description}</p>
                    </div>
                    {lesson.content && (
                        <button
                            onClick={handleListen}
                            disabled={isLoadingAudio}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                                ${isPlaying
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                                    : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20'
                                } disabled:opacity-50 flex-shrink-0 self-start sm:self-center`}
                        >
                            {isLoadingAudio ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isPlaying ? (
                                <Square className="w-4 h-4" />
                            ) : (
                                <Volume2 className="w-4 h-4" />
                            )}
                            {isLoadingAudio ? 'Generating...' : isPlaying ? 'Stop Listening' : 'Listen to Lesson'}
                        </button>
                    )}
                </div>

                {/* Progress bar */}
                <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <span className="text-[11px] text-zinc-600 font-mono">{pct}% course done</span>
                </div>
            </div>

            {/* Lesson Body */}
            <article className="prose prose-invert prose-sm sm:prose-base max-w-none
        prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
        prose-p:text-zinc-400 prose-p:leading-relaxed
        prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-zinc-200
        prose-code:text-indigo-300 prose-code:bg-indigo-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-zinc-900 prose-pre:border prose-pre:   border-neutral-800 prose-pre:rounded-xl
        prose-blockquote:border-l-indigo-500 prose-blockquote:text-zinc-500
        prose-ul:text-zinc-400 prose-ol:text-zinc-400
        prose-li:marker:text-indigo-500
        prose-hr:   border-neutral-800
        bg-zinc-900/40 border border-neutral-800 rounded-xl p-6 sm:p-8 mb-8">
                {lesson.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {lesson.content}
                    </ReactMarkdown>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center not-prose">
                        <div className="text-4xl mb-4">🚧</div>
                        <p className="text-zinc-400 font-medium">Lesson content coming soon</p>
                        <p className="text-zinc-600 text-sm mt-1">Check back shortly — lessons are being added one by one.</p>
                    </div>
                )}
            </article>

            {/* Bottom controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t    border-neutral-800">
                {/* Prev */}
                {prevLesson ? (
                    <Link
                        to={`/learn/${course.id}/${prevLesson.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all text-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="truncate max-w-[160px]">{prevLesson.title}</span>
                    </Link>
                ) : (
                    <Link
                        to={`/learn/${course.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all text-sm"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back to Course
                    </Link>
                )}

                {/* Complete / Done toggle + next */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleComplete}
                        disabled={saving || !lesson.content}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-40
              ${isDone
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-white/5    border-neutral-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                            }`}
                    >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        {isDone ? 'Completed' : 'Mark Complete'}
                    </button>

                    {lesson.content && (nextLesson ? (
                        <button
                            onClick={markDoneAndNext}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-colors   disabled:opacity-50"
                        >
                            {nextLesson.content ? 'Next Lesson' : 'Finish'}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={markDoneAndNext}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Finish Course
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
