import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, ChevronRight, CheckCircle2, Lock, GraduationCap } from 'lucide-react';
import { COURSES_2, PROGRESS_KV_KEY, CourseProgress } from '../lib/courseData';
import { puterService } from '../lib/puter';

export default function Learn() {
    const [progress, setProgress] = useState<CourseProgress>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        puterService.kvGet(PROGRESS_KV_KEY).then((data: CourseProgress | null) => {
            setProgress(data || {});
            setLoading(false);
        });
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">Learn</h1>
                </div>
                <p className="text-sm sm:text-base text-zinc-400 pl-1 mt-1">
                    Structured courses to master every step of the research process.
                </p>
            </header>

            {/* Course Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {COURSES_2.map((course) => {
                    const cousreProgress = progress[course.id] || {};
                    const completedCount = Object.values(cousreProgress).filter(Boolean).length;
                    const totalLessons = course.lessons.length;
                    const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
                    const isStarted = completedCount > 0;

                    return (
                        <Link
                            key={course.id}
                            to={`/learn/${course.id}`}
                            className="group flex flex-col bg-zinc-900/40 border    border-neutral-800 rounded-xl p-6 hover:border-indigo-500/40 hover:bg-zinc-900/70 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5"
                        >
                            {/* Emoji + Level */}
                            <div className="flex items-start justify-between mb-5">
                                <div className="text-4xl leading-none select-none">{course.coverEmoji}</div>
                                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border
                  ${course.level === 'Beginner' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : course.level === 'Intermediate' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                            : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    {course.level}
                                </span>
                            </div>

                            {/* Title & Description */}
                            <h2 className="text-base font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                                {course.title}
                            </h2>
                            <p className="text-xs text-zinc-500 leading-relaxed flex-1 mb-5">
                                {course.description}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-5">
                                {course.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-400">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Progress & CTA */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-500">
                                        {loading ? '...' : `${completedCount} / ${totalLessons} lessons`}
                                    </span>
                                    <span className={`font-semibold ${pct === 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                        {pct}%
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs text-zinc-600">
                                        {totalLessons} lessons
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover:text-indigo-300">
                                        {pct === 100 ? (
                                            <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed</>
                                        ) : isStarted ? (
                                            <>Continue <ChevronRight className="w-3.5 h-3.5" /></>
                                        ) : (
                                            <>Start <ChevronRight className="w-3.5 h-3.5" /></>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {/* Coming Soon placeholder */}
                <div className="flex flex-col items-center justify-center bg-zinc-900/20 border border-dashed    border-neutral-800 rounded-xl p-6 gap-3 opacity-50 min-h-[260px]">
                    <Lock className="w-7 h-7 text-zinc-600" />
                    <div className="text-center">
                        <p className="text-sm font-medium text-zinc-500">More courses coming soon</p>
                        <p className="text-xs text-zinc-700 mt-1">Academic Writing, Data Analysis, and more</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center bg-zinc-900/20 border border-dashed    border-neutral-800 rounded-xl p-6 gap-3 opacity-50 min-h-[260px]">
                    <GraduationCap className="w-7 h-7 text-zinc-600" />
                    <div className="text-center">
                        <p className="text-sm font-medium text-zinc-500">More courses coming soon</p>
                        <p className="text-xs text-zinc-700 mt-1">PhD Survival Guide, Publishing & Peer Review</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
