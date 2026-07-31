import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, GraduationCap, BookOpen, Building2, DollarSign, Phone, Hash, ArrowLeft, Layers, ShieldCheck, Tag, CalendarDays } from 'lucide-react';
import { getRealmDB } from '../lib/db';
import { Student, Teacher, Subject, SchoolClass, Section, FeePayment, CalendarEvent, UserDocument } from '../types';

interface GlobalSearchBarProps {
  onNavigate?: (tab: string) => void;
}

export type SearchCategory = 'all' | 'students' | 'teachers' | 'subjects' | 'classes' | 'financial' | 'calendar';

export interface SearchResultItem {
  id: string;
  type: 'student' | 'teacher' | 'subject' | 'class' | 'financial' | 'calendar';
  categoryLabel: string;
  title: string;
  subtitle: string;
  detailsExtra?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  navTab: string;
  rawItem: any;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const db = getRealmDB();

  // Close search dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const trimmed = query.trim().toLowerCase();

  const getClassName = (cid: string) => db.classes.find(c => c.id === cid)?.name || '';
  const getSectionName = (secId: string) => {
    for (const c of db.classes) {
      const sec = c.sections.find(s => s.id === secId);
      if (sec) return sec.name;
    }
    return '';
  };

  const results: SearchResultItem[] = [];

  if (trimmed.length > 0) {
    // 1. Search Students (اسم الطالب, رقم الطالب, رقم الهاتف, الصف, الشعبة, رقم الهوية/الأكاديمي)
    db.students.forEach((st: Student) => {
      const clsName = getClassName(st.classId);
      const secName = getSectionName(st.sectionId);
      
      const matchesName = st.name.toLowerCase().includes(trimmed);
      const matchesAcademicId = (st.academicId || '').toLowerCase().includes(trimmed) || st.id.toLowerCase().includes(trimmed);
      const matchesPhone = (st.parentPhone || '').includes(trimmed);
      const matchesParentName = (st.parentName || '').toLowerCase().includes(trimmed);
      const matchesClass = clsName.toLowerCase().includes(trimmed);
      const matchesSection = secName.toLowerCase().includes(trimmed);
      const matchesHealth = (st.healthNotes || '').toLowerCase().includes(trimmed);

      if (matchesName || matchesAcademicId || matchesPhone || matchesParentName || matchesClass || matchesSection || matchesHealth) {
        results.push({
          id: `stu-${st.id}`,
          type: 'student',
          categoryLabel: 'طالب دراسي',
          title: st.name,
          subtitle: `الرقم الأكاديمي: ${st.academicId} | ${clsName} - ${secName}`,
          detailsExtra: `ولي الأمر: ${st.parentName} (${st.parentPhone || 'بدون هاتف'})`,
          badge: st.status === 'active' ? 'منتظم' : st.status === 'at-risk' ? 'مستهدف برعاية' : 'غير نشط',
          badgeColor: st.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
          icon: <User className="w-4 h-4 text-blue-600" />,
          navTab: 'students',
          rawItem: st
        });
      }
    });

    // 2. Search Teachers (اسم المعلم, رقم الهاتف, التخصص, المادة, الهوية)
    db.teachers.forEach((tc: Teacher) => {
      const matchesName = tc.name.toLowerCase().includes(trimmed);
      const matchesPhone = (tc.phone || '').includes(trimmed);
      const matchesEmail = (tc.email || '').toLowerCase().includes(trimmed);
      const matchesSpec = (tc.specialization || '').toLowerCase().includes(trimmed);
      const matchesId = tc.id.toLowerCase().includes(trimmed);

      if (matchesName || matchesPhone || matchesEmail || matchesSpec || matchesId) {
        results.push({
          id: `tc-${tc.id}`,
          type: 'teacher',
          categoryLabel: 'كادر تعليمي',
          title: tc.name,
          subtitle: `التخصص: ${tc.specialization} | جوال: ${tc.phone}`,
          detailsExtra: `الخبرة: ${tc.experienceYears} سنوات | المؤهل: ${tc.qualification}`,
          badge: tc.status === 'active' ? 'على رأس العمل' : 'إجازة',
          badgeColor: tc.status === 'active' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700',
          icon: <GraduationCap className="w-4 h-4 text-indigo-600" />,
          navTab: 'teachers',
          rawItem: tc
        });
      }
    });

    // 3. Search Subjects (اسم المادة, كود المادة)
    db.subjects.forEach((sb: Subject) => {
      const matchesName = sb.name.toLowerCase().includes(trimmed);
      const matchesCode = (sb.code || '').toLowerCase().includes(trimmed);
      const clsName = getClassName(sb.classId);

      if (matchesName || matchesCode || clsName.toLowerCase().includes(trimmed)) {
        results.push({
          id: `sub-${sb.id}`,
          type: 'subject',
          categoryLabel: 'مادة دراسية',
          title: sb.name,
          subtitle: `رمز المادة: ${sb.code || 'بدون رمز'} | ${clsName}`,
          detailsExtra: `الحصص الأسبوعية: ${sb.weeklyHours} حصص | الدرجة الكبرى: ${sb.maxScore}`,
          badge: 'منهج دراسي',
          badgeColor: 'bg-purple-100 text-purple-800',
          icon: <BookOpen className="w-4 h-4 text-purple-600" />,
          navTab: 'subjects',
          rawItem: sb
        });
      }
    });

    // 4. Search Classes & Sections (الصف, الشعبة)
    db.classes.forEach((cls: SchoolClass) => {
      const matchesClassName = cls.name.toLowerCase().includes(trimmed);

      cls.sections.forEach((sec: Section) => {
        const matchesSecName = sec.name.toLowerCase().includes(trimmed);
        const matchesRoom = (sec.roomNumber || '').toLowerCase().includes(trimmed);

        if (matchesClassName || matchesSecName || matchesRoom) {
          results.push({
            id: `sec-${sec.id}`,
            type: 'class',
            categoryLabel: 'صف وشعبة',
            title: `${cls.name} - ${sec.name}`,
            subtitle: `القاعة: ${sec.roomNumber || 'غير محددة'} | الطاقة الاستيعابية: ${sec.capacity} طالب`,
            badge: `المستوى ${cls.level}`,
            badgeColor: 'bg-teal-100 text-teal-800',
            icon: <Building2 className="w-4 h-4 text-teal-600" />,
            navTab: 'classes',
            rawItem: { class: cls, section: sec }
          });
        }
      });
    });

    // 5. Search Financial / Invoices (رقم الفاتورة, السند, اسم الطالب, العنوان, المبلغ)
    db.payments.forEach((p: FeePayment) => {
      const student = db.students.find(s => s.id === p.studentId);
      const studentName = student?.name || '';
      
      const matchesTitle = p.title.toLowerCase().includes(trimmed);
      const matchesReceipt = (p.receiptNumber || '').toLowerCase().includes(trimmed) || p.id.toLowerCase().includes(trimmed);
      const matchesStudent = studentName.toLowerCase().includes(trimmed);
      const matchesAmount = (p.totalAmount || p.amount || 0).toString().includes(trimmed) || (p.paidAmount || 0).toString().includes(trimmed);

      if (matchesTitle || matchesReceipt || matchesStudent || matchesAmount) {
        results.push({
          id: `pay-${p.id}`,
          type: 'financial',
          categoryLabel: 'سند فاتورة/رسوم',
          title: `${p.receiptNumber ? `[${p.receiptNumber}] ` : ''}${p.title}`,
          subtitle: `الطالب: ${studentName || 'غير معروف'} | إجمالي المبلغ: ${(p.totalAmount || p.amount || 0).toLocaleString()} ر.س`,
          detailsExtra: `المدفوع: ${(p.paidAmount || 0).toLocaleString()} ر.س | المتبقي: ${(p.remainingAmount || 0).toLocaleString()} ر.س`,
          badge: p.status === 'paid' ? 'مسدد بالكامل' : p.status === 'overdue' ? 'متأخر' : 'سداد جزئي',
          badgeColor: p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : p.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800',
          icon: <DollarSign className="w-4 h-4 text-amber-600" />,
          navTab: 'financial',
          rawItem: p
        });
      }
    });

    // 6. Search User Documents (مركز الملفات والوثائق)
    try {
      const savedDocs = localStorage.getItem('al_salam_school_user_documents_v2');
      if (savedDocs) {
        const docList: UserDocument[] = JSON.parse(savedDocs);
        docList.forEach(d => {
          const matchTitle = d.title.toLowerCase().includes(trimmed);
          const matchOwner = d.ownerName.toLowerCase().includes(trimmed);
          const matchFile = d.fileName.toLowerCase().includes(trimmed);
          if (matchTitle || matchOwner || matchFile) {
            results.push({
              id: `doc-${d.id}`,
              type: 'calendar',
              categoryLabel: 'مركز الملفات والوثائق',
              title: d.title,
              subtitle: `صاحب الوثيقة: ${d.ownerName} (${d.ownerType === 'student' ? 'طالب' : 'معلم'})`,
              detailsExtra: `الملف: ${d.fileName} (${d.fileType.toUpperCase()}) | الحجم: ${d.fileSize}`,
              badge: d.category === 'certificates' ? 'شهادة' : d.category === 'identity' ? 'هوية' : d.category === 'passport' ? 'جواز سفر' : 'وثيقة',
              badgeColor: 'bg-teal-100 text-teal-800',
              icon: <Tag className="w-4 h-4 text-teal-600" />,
              navTab: 'documents',
              rawItem: d
            });
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Filter by active category tab if selected
  const filteredResults = activeCategory === 'all' 
    ? results 
    : results.filter(r => r.type === activeCategory);

  const handleSelectResult = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');
    if (onNavigate) {
      onNavigate(item.navTab);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md md:max-w-xl">
      {/* Input Box */}
      <div className="relative flex items-center">
        <div className="absolute right-3.5 pointer-events-none text-slate-400 flex items-center">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="بحث شامل (طالب، رقم أكاديمي، معلم، مادة، صف، شعبة، رقم هاتف، فاتورة...)"
          className="w-full pr-10 pl-16 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-hidden transition-all shadow-xs focus:shadow-md focus:ring-2 focus:ring-blue-500/20"
        />

        {query ? (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute left-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="absolute left-3 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* Results Dropdown Menu */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] flex flex-col">
          {/* Category Filter Tabs */}
          <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1 overflow-x-auto text-[11px] shrink-0 scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              الكل ({results.length})
            </button>
            <button
              onClick={() => setActiveCategory('student')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === 'student' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              الطلاب ({results.filter(r => r.type === 'student').length})
            </button>
            <button
              onClick={() => setActiveCategory('teacher')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === 'teacher' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              المعلمون ({results.filter(r => r.type === 'teacher').length})
            </button>
            <button
              onClick={() => setActiveCategory('subject')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === 'subject' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              المواد ({results.filter(r => r.type === 'subject').length})
            </button>
            <button
              onClick={() => setActiveCategory('class')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === 'class' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              الصفوف ({results.filter(r => r.type === 'class').length})
            </button>
            <button
              onClick={() => setActiveCategory('financial')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === 'financial' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              الفواتير ({results.filter(r => r.type === 'financial').length})
            </button>
            <button
              onClick={() => setActiveCategory('calendar')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === 'calendar' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              التقويم والفعاليات ({results.filter(r => r.type === 'calendar').length})
            </button>
          </div>

          {/* Result List */}
          <div className="overflow-y-auto p-2 divide-y divide-slate-100 flex-1">
            {filteredResults.length > 0 ? (
              filteredResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  className="p-3 hover:bg-blue-50/70 transition-all rounded-xl cursor-pointer flex items-start justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700 transition-colors">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          {item.categoryLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                        {item.subtitle}
                      </p>
                      {item.detailsExtra && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.detailsExtra}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                        {item.badge}
                      </span>
                    )}
                    <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold flex items-center gap-1 mt-1">
                      <span>الانتقال</span>
                      <ArrowLeft className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
                <p className="text-xs font-bold text-slate-600">لم يتم العثور على مطابقة لـ "{query}"</p>
                <p className="text-[11px] text-slate-400 mt-1">تأكد من إدخال اسم الطالب، رقم الهوية/الأكاديمي، المعلم، المادة، الصف، أو رقم الفاتورة بشكل صحيح.</p>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between shrink-0 px-4">
            <span>عدد النتائج المعروضة: <b>{filteredResults.length}</b></span>
            <span>اضغط انقر على النتيجة للانتقال المباشر</span>
          </div>
        </div>
      )}
    </div>
  );
};
