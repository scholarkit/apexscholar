import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Circle, Lock, Clock, ChevronRight } from 'lucide-react';
import { COURSES_2, PROGRESS_KV_KEY, CourseProgress } from '../lib/courseData';
import { puterService } from '../lib/puter';

export default function CourseView() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const course = COURSES_2.find((c) => c.id === courseId);

    const [progress, setProgress] = useState<CourseProgress>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        puterService.kvGet(PROGRESS_KV_KEY).then((data: CourseProgress | null) => {
            setProgress(data || {});
            setLoading(false);
        });
    }, []);

    if (!course) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <p className="text-zinc-400 font-medium">Course not found.</p>
                <Link to="/learn" className="mt-4 text-indigo-400 text-sm hover:text-indigo-300">← Back to Learn</Link>
            </div>
        );
    }

    const courseProgress = progress[course.id] || {};
    const completedCount = Object.values(courseProgress).filter(Boolean).length;
    const totalLessons = course.lessons.length;
    const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    // Find the first incomplete lesson for "Continue" CTA
    const nextLesson = course.lessons.find((l) => !courseProgress[l.id] && l.content);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-zinc-500">
                <Link to="/learn" className="hover:text-zinc-300 transition-colors">Learn</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-zinc-300">{course.title}</span>
            </nav>

            {/* Course Header */}
            <div className="bg-zinc-900/40 border    border-[#1f2937] rounded-2xl p-6 sm:p-8">
                <div className="flex items-start gap-5 mb-6">
                    <div className="text-5xl leading-none select-none">{course.coverEmoji}</div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border
                ${course.level === 'Beginner' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : course.level === 'Intermediate' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                        : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {course.level}
                            </span>
                            {course.tags.map((t) => (
                                <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">{t}</span>
                            ))}
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{course.title}</h1>
                        <p className="text-sm text-zinc-400 leading-relaxed">{course.description}</p>
                    </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">{completedCount} of {totalLessons} lessons completed</span>
                        <span className={`font-bold text-sm ${pct === 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>

                {/* CTA */}
                {nextLesson && (
                    <button
                        onClick={() => navigate(`/learn/${course.id}/${nextLesson.id}`)}
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-colors  "
                    >
                        {completedCount === 0 ? 'Start Course' : 'Continue'}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
                {pct === 100 && (
                    <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium rounded-xl">
                        <CheckCircle2 className="w-4 h-4" /> Course Completed!
                    </div>
                )}
            </div>

            {/* Lesson List */}
            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-1">Lessons</h2>
                <div className="space-y-1.5">
                    {course.lessons.map((lesson, index) => {
                        const isDone = !!courseProgress[lesson.id];
                        const isAvailable = !!lesson.content;

                        return (
                            <div key={lesson.id}>
                                {isAvailable ? (
                                    <Link
                                        to={`/learn/${course.id}/${lesson.id}`}
                                        className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
                      ${isDone
                                                ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                                                : 'bg-zinc-900/40    border-[#1f2937] hover:border-indigo-500/40 hover:bg-zinc-900/60'
                                            }`}
                                    >
                                        <div className="flex-shrink-0">
                                            {isDone
                                                ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                : <Circle className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-zinc-600 font-mono">
                                                    {String(index + 1).padStart(2, '0')}
                                                </span>
                                                <p className={`text-sm font-medium truncate ${isDone ? 'text-zinc-400' : 'text-white'}`}>
                                                    {lesson.title}
                                                </p>
                                            </div>
                                            <p className="text-xs text-zinc-600 mt-0.5 truncate">{lesson.description}</p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0 text-zinc-600">
                                            {lesson.duration !== '–' && (
                                                <span className="flex items-center gap-1 text-[11px]">
                                                    <Clock className="w-3 h-3" />
                                                    {lesson.duration}
                                                </span>
                                            )}
                                            <ChevronRight className={`w-4 h-4 transition-colors ${isDone ? 'text-emerald-600' : 'group-hover:text-indigo-400'}`} />
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-4 p-4 rounded-xl border    border-[#1f2937] bg-zinc-900/20 opacity-50 cursor-not-allowed">
                                        <Lock className="w-5 h-5 text-zinc-700 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-zinc-700 font-mono">
                                                    {String(index + 1).padStart(2, '0')}
                                                </span>
                                                <p className="text-sm font-medium text-zinc-600 truncate">{lesson.title}</p>
                                            </div>
                                            <p className="text-xs text-zinc-700 mt-0.5 truncate">{lesson.description}</p>
                                        </div>
                                        <span className="text-[10px] text-zinc-700 font-medium px-2 py-0.5 rounded-full border border-zinc-800">
                                            Coming Soon
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
