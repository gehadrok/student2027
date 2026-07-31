import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, Plus, Filter, 
  FileText, Sun, Trophy, Users, DollarSign, Clock, MapPin, Tag, X, 
  CheckCircle2, AlertCircle, Eye, Printer, Sparkles, Building2, User, ArrowLeft
} from 'lucide-react';
import { getRealmDB, getCurrentUser, addAuditLog } from '../lib/db';
import { CalendarEvent, CalendarEventType, FeePayment } from '../types';

interface CalendarScreenProps {
  onNavigate?: (tab: string) => void;
}

const STORAGE_KEY = 'al_salam_school_calendar_events_v2';

// Helper to get formatted date string (YYYY-MM-DD)
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Default seed events relative to current date
const getSeedEvents = (): CalendarEvent[] => {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  const getDateStr = (dayOffset: number) => {
    const d = new Date(y, m, today.getDate() + dayOffset);
    return formatDate(d);
  };

  return [
    {
      id: 'evt-1',
      title: 'اختبار منتصف الفصل الدراسي - مادة الرياضيات',
      type: 'exam',
      date: getDateStr(-3),
      startTime: '08:00',
      endTime: '10:00',
      location: 'قاعات الامتحانات - المبنى الرئيسي',
      targetAudience: 'الصف الأول والثاني الثانوي',
      description: 'اختبار قياسي لتقييم مستويات الطلاب في وحدة الجبر والهندسة التحليلية.',
      organizer: 'قسم الرياضيات',
      status: 'completed'
    },
    {
      id: 'evt-2',
      title: 'اجتماع مجلس الآباء والمعلمين الأول',
      type: 'meeting',
      date: getDateStr(2),
      startTime: '16:00',
      endTime: '18:30',
      location: 'قاعة الأنشطة الكبرى',
      targetAudience: 'أولياء الأمور والكادر التعليمي',
      description: 'مناقشة الخطة الأكاديمية والتربوية للفصل الدراسي ومتابعة التحصيل العلمي للطلاب.',
      organizer: 'إدارة المدرسة ومجلس الآباء',
      status: 'upcoming'
    },
    {
      id: 'evt-3',
      title: 'المعرض العلمي والتكنولوجي السنوي',
      type: 'activity',
      date: getDateStr(5),
      endDate: getDateStr(6),
      startTime: '09:00',
      endTime: '13:00',
      location: 'الساحة المدرسية والمعامل المركزية',
      targetAudience: 'جميع الصفوف المدرسية',
      description: 'عرض المبتكرات والمشاريع العلمية للطلاب في مجالات الذكاء الاصطناعي والروبوتات والفيزياء التطبيقية.',
      organizer: 'قسم العلوم والتكنولوجيا',
      status: 'upcoming'
    },
    {
      id: 'evt-4',
      title: 'إجازة المولد النبوي الشريف والعيد الوطني',
      type: 'holiday',
      date: getDateStr(8),
      endDate: getDateStr(9),
      location: 'عطلة رسمية',
      targetAudience: 'جميع الطلاب والموظفين',
      description: 'إجازة رسمية مدفوعة الأجر لكافة طلاب وموظفي مدرسة خالد ابن الوليد.',
      organizer: 'وزارة التربية والتعليم',
      status: 'upcoming'
    },
    {
      id: 'evt-5',
      title: 'الاختبار العملي لمهارات الحاسوب والعلوم',
      type: 'exam',
      date: getDateStr(12),
      startTime: '08:30',
      endTime: '11:00',
      location: 'معمل الحاسوب واللغات',
      targetAudience: 'الصف الثالث الثانوي',
      description: 'تقييم الجوانب التطبيقية والبرمجية لمادة التكنولوجيا.',
      organizer: 'أستاذ الحاسوب والتكنولوجيا',
      status: 'upcoming'
    },
    {
      id: 'evt-6',
      title: 'بطولة دوري كرة القدم المدرسي - النهائي',
      type: 'activity',
      date: getDateStr(15),
      startTime: '10:00',
      endTime: '12:00',
      location: 'الملعب الرياضي الرئيسي',
      targetAudience: 'جميع الشعب والطلاب',
      description: 'المباراة النهائية على كأس مدير المدرسة بين شعبة (أ) وشعبة (ب).',
      organizer: 'قسم التربية البدنية والرياضية',
      status: 'upcoming'
    },
    {
      id: 'evt-7',
      title: 'ورشة عمل تطوير المناهج والجودة الأكاديمية',
      type: 'meeting',
      date: getDateStr(18),
      startTime: '11:00',
      endTime: '13:30',
      location: 'قاعة الاجتماعات الإدارية',
      targetAudience: 'معلمي وموجهي المواد',
      description: 'مراجعة خطط الدرس وحقائب التقييم المستمر وإعداد ملفات التميز المؤسسي.',
      organizer: 'وحدة الجودة والتطوير',
      status: 'upcoming'
    },
    {
      id: 'evt-8',
      title: 'عطلة نهاية الأسبوع والتوجيه الكشفي',
      type: 'holiday',
      date: getDateStr(22),
      location: 'عطلة رسمية',
      targetAudience: 'جميع الطلاب',
      description: 'يوم راحة وتوجيه لفرق الكشافة والجوالة المدرسية.',
      organizer: 'إدارة المدرسة',
      status: 'upcoming'
    }
  ];
};

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ onNavigate }) => {
  const db = getRealmDB();
  const currentUser = getCurrentUser();

  // Current view month & year state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<CalendarEventType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  
  // Custom events state
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getSeedEvents();
  });

  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState<string>('');

  // Form states for adding new event
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<CalendarEventType>('exam');
  const [newDate, setNewDate] = useState(formatDate(new Date()));
  const [newEndDate, setNewEndDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('09:30');
  const [newLocation, setNewLocation] = useState('');
  const [newTargetAudience, setNewTargetAudience] = useState('جميع الصفوف');
  const [newDescription, setNewDescription] = useState('');
  const [newOrganizer, setNewOrganizer] = useState('إدارة المدرسة');

  // Save custom events to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.error(e);
    }
  }, [events]);

  // Combine custom events with dynamic Fee Payment Due Dates from SQLite/db.payments
  const feeDueEvents: CalendarEvent[] = db.payments.map((p: FeePayment) => {
    const student = db.students.find(s => s.id === p.studentId);
    return {
      id: `fee-evt-${p.id}`,
      title: `استحقاق رسوم: ${p.title}`,
      type: 'fee_due',
      date: p.dueDate || formatDate(new Date()),
      location: 'الشؤون المالية والخزينة',
      targetAudience: student ? `الطالب: ${student.name || 'طالب'} (${student.parentName || 'ولي الأمر'})` : 'أولياء الأمور المعنيين',
      description: `قيمة المستحق: ${(p.totalAmount || p.amount || 0).toLocaleString()} ر.س | المدفوع: ${(p.paidAmount || 0).toLocaleString()} ر.س | المتبقي: ${(p.remainingAmount || 0).toLocaleString()} ر.س`,
      organizer: 'الإدارة المالية',
      status: p.status === 'paid' ? 'completed' : p.status === 'overdue' ? 'ongoing' : 'upcoming',
      relatedPaymentId: p.id,
      amount: p.remainingAmount || p.totalAmount || p.amount
    };
  });

  const allEventsCombined = [...events, ...feeDueEvents];

  // Filter events by selected category
  const filteredEvents = selectedCategory === 'all'
    ? allEventsCombined
    : allEventsCombined.filter(e => e.type === selectedCategory);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar matrix calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'يناير (كانون الثاني)', 'فبراير (شباط)', 'مارس (آذار)', 'أبريل (نيسان)',
    'مايو (أيار)', 'يونيو (حزيران)', 'يوليو (تموز)', 'أغسطس (آب)',
    'سبتمبر (أيلول)', 'أكتوبر (تشرين الأول)', 'نوفمبر (تشرين الثاني)', 'ديسمبر (كانون الأول)'
  ];

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
  const totalDaysInMonth = lastDayOfMonth.getDate();

  // Create grid cells (including padding days from previous/next month)
  const calendarCells = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const dateObj = new Date(year, month - 1, d);
    calendarCells.push({
      dateStr: formatDate(dateObj),
      dayNumber: d,
      isCurrentMonth: false,
      isToday: false
    });
  }

  // Current month days
  const todayStr = formatDate(new Date());
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = formatDate(dateObj);
    calendarCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr
    });
  }

  // Next month padding to fill complete weeks (up to 35 or 42 cells)
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const dateObj = new Date(year, month + 1, d);
    calendarCells.push({
      dateStr: formatDate(dateObj),
      dayNumber: d,
      isCurrentMonth: false,
      isToday: false
    });
  }

  // Helper function to map category to style badge & icon
  const getCategoryStyle = (type: CalendarEventType) => {
    switch (type) {
      case 'exam':
        return {
          label: 'اختبارات',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          dotColor: 'bg-rose-500',
          icon: <FileText className="w-3.5 h-3.5 text-rose-600" />,
          bgLight: 'bg-rose-50/60'
        };
      case 'holiday':
        return {
          label: 'عطلات رسمية',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dotColor: 'bg-emerald-500',
          icon: <Sun className="w-3.5 h-3.5 text-emerald-600" />,
          bgLight: 'bg-emerald-50/60'
        };
      case 'activity':
        return {
          label: 'أنشطة وفعاليات',
          badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          dotColor: 'bg-indigo-500',
          icon: <Trophy className="w-3.5 h-3.5 text-indigo-600" />,
          bgLight: 'bg-indigo-50/60'
        };
      case 'meeting':
        return {
          label: 'اجتماعات وورش',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500',
          icon: <Users className="w-3.5 h-3.5 text-blue-600" />,
          bgLight: 'bg-blue-50/60'
        };
      case 'fee_due':
        return {
          label: 'رسوم مستحقة',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          dotColor: 'bg-amber-500',
          icon: <DollarSign className="w-3.5 h-3.5 text-amber-600" />,
          bgLight: 'bg-amber-50/60'
        };
    }
  };

  // Add new event handler
  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: CalendarEvent = {
      id: `evt-custom-${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      date: newDate,
      endDate: newEndDate || undefined,
      startTime: newStartTime || undefined,
      endTime: newEndTime || undefined,
      location: newLocation || 'المبنى المدرسي',
      targetAudience: newTargetAudience || 'جميع الصفوف',
      description: newDescription || 'لا توجد تفاصيل إضافية',
      organizer: newOrganizer || 'إدارة المدرسة',
      status: 'upcoming'
    };

    setEvents(prev => [created, ...prev]);
    addAuditLog('إضافة حدث في التقويم', `تم إضافة الحدث (${created.title}) في تاريخ ${created.date}`);
    
    // Reset form
    setNewTitle('');
    setNewDescription('');
    setShowAddModal(false);
  };

  // Delete custom event
  const handleDeleteEvent = (id: string) => {
    if (id.startsWith('fee-evt-')) {
      alert('لا يمكن حذف استحقاق مالي من التقويم مباشرة. يرجى تعديله أو رفعه من قسم الإدارة المالية.');
      return;
    }
    if (confirm('هل أنت تأكد من رغبتك في حذف هذا الحدث من التقويم المدرسي؟')) {
      setEvents(prev => prev.filter(e => e.id !== id));
      addAuditLog('حذف حدث من التقويم', `تم حذف الحدث رقم (${id})`);
      setSelectedEvent(null);
    }
  };

  // Quick Statistics
  const totalThisMonthEvents = filteredEvents.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  const examCount = allEventsCombined.filter(e => e.type === 'exam').length;
  const holidayCount = allEventsCombined.filter(e => e.type === 'holiday').length;
  const activityCount = allEventsCombined.filter(e => e.type === 'activity').length;
  const meetingCount = allEventsCombined.filter(e => e.type === 'meeting').length;
  const feeDueCount = allEventsCombined.filter(e => e.type === 'fee_due').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold mb-3 border border-white/10 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>التقويم المدرسي والفعاليات الشاملة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              التقويم الموحد للأجندة المدرسية
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              عرض متكامل وموثق لجميع **الاختبارات والتطبيقات**، **العطل الرسمية**، **الأنشطة والفعاليات المدرسية**، **الاجتماعات الإدارية**، و**مواعيد استحقاق الرسوم الدراسية**.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => {
                setSelectedDayForAdd(formatDate(new Date()));
                setNewDate(formatDate(new Date()));
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer border border-blue-400/30"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حدث/فعالية جديدة</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all backdrop-blur-xs border border-white/15 flex items-center gap-1.5 cursor-pointer"
              title="طباعة الأجندة والتقويم"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </button>
          </div>
        </div>

        {/* TOP STATS BADGES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 font-medium block">الاختبارات والتطبيقات</span>
              <span className="text-sm font-black text-white">{examCount} حوادث</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 font-medium block">العطل الرسمية</span>
              <span className="text-sm font-black text-white">{holidayCount} مناسبات</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 font-medium block">الأنشطة والفعاليات</span>
              <span className="text-sm font-black text-white">{activityCount} أنشطة</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 font-medium block">الاجتماعات المدرسية</span>
              <span className="text-sm font-black text-white">{meetingCount} اجتماعات</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 font-medium block">الرسوم المستحقة</span>
              <span className="text-sm font-black text-white">{feeDueCount} مواعيد سداد</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR: Category Filter + Month Navigation + View Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({allEventsCombined.length})
          </button>
          <button
            onClick={() => setSelectedCategory('exam')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedCategory === 'exam'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📝 الاختبارات</span>
          </button>
          <button
            onClick={() => setSelectedCategory('holiday')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedCategory === 'holiday'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>🌴 العطل الرسمية</span>
          </button>
          <button
            onClick={() => setSelectedCategory('activity')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedCategory === 'activity'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>🏆 الأنشطة</span>
          </button>
          <button
            onClick={() => setSelectedCategory('meeting')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedCategory === 'meeting'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>🤝 الاجتماعات</span>
          </button>
          <button
            onClick={() => setSelectedCategory('fee_due')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedCategory === 'fee_due'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>💰 الرسوم المستحقة</span>
          </button>
        </div>

        {/* Month Navigator + View Mode */}
        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
              title="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-white hover:shadow-2xs rounded-lg transition-all cursor-pointer"
            >
              اليوم
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
              title="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800">
              {monthNames[month]} {year}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              شبكة التقويم
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'agenda' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              الأجندة والجدول
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: MONTHLY GRID */}
      {viewMode === 'grid' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 bg-slate-900 text-slate-200 text-xs font-bold py-3 text-center border-b border-slate-800">
            <div>الأحد</div>
            <div>الإثنين</div>
            <div>الثلاثاء</div>
            <div>الأربعاء</div>
            <div>الخميس</div>
            <div className="text-amber-400">الجمعة</div>
            <div className="text-amber-400">السبت</div>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-50/50 min-h-[550px]">
            {calendarCells.map((cell, idx) => {
              const dayEvents = filteredEvents.filter(e => e.date === cell.dateStr);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDayForAdd(cell.dateStr);
                    setNewDate(cell.dateStr);
                  }}
                  className={`p-1.5 sm:p-2 min-h-[100px] flex flex-col justify-between transition-colors relative group ${
                    cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-300'
                  } ${cell.isToday ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20' : ''}`}
                >
                  {/* Top Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : cell.isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Quick Add icon on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDayForAdd(cell.dateStr);
                        setNewDate(cell.dateStr);
                        setShowAddModal(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 p-0.5 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
                      title="إضافة حدث في هذا اليوم"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Day Events Container */}
                  <div className="mt-1 space-y-1 overflow-hidden flex-1">
                    {dayEvents.slice(0, 3).map(evt => {
                      const style = getCategoryStyle(evt.type);
                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                          className={`p-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer hover:shadow-sm truncate flex items-center gap-1 ${style.badgeClass}`}
                          title={`${evt.title} (${evt.location || ''})`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dotColor}`} />
                          <span className="truncate">{evt.title}</span>
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md block text-center">
                        +{dayEvents.length - 3} أحداث أخرى
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: AGENDA TIMELINE LIST */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>جدول الفعاليات والأجندة المدرسية المسجلة</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              إجمالي النتائج: {filteredEvents.length} أحداث
            </span>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredEvents
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(evt => {
                  const style = getCategoryStyle(evt.type);
                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className="py-4 hover:bg-slate-50/80 px-4 rounded-2xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`p-3 rounded-2xl shrink-0 ${style.bgLight} border border-slate-200/60`}>
                          {style.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${style.badgeClass}`}>
                              {style.label}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              📅 {evt.date} {evt.endDate ? `إلى ${evt.endDate}` : ''}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors mt-1">
                            {evt.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {evt.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end md:self-auto text-xs text-slate-500 font-medium">
                        {evt.location && (
                          <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-xl">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{evt.location}</span>
                          </span>
                        )}
                        {evt.startTime && (
                          <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-xl">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{evt.startTime} - {evt.endTime || ''}</span>
                          </span>
                        )}
                        <span className="text-blue-600 group-hover:translate-x-[-3px] transition-transform font-bold text-xs flex items-center gap-1">
                           التفاصيل <ArrowLeft className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-sm font-bold text-slate-700">لا توجد فعاليات مسجلة تحت هذا التصنيف</p>
              <p className="text-xs text-slate-400 mt-1">يمكنك إضافة حدث جديد في التقويم بالضغط على زر "إضافة حدث/فعالية جديدة".</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: EVENT DETAILS DIALOG */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
            {/* Top color header */}
            <div className={`p-6 text-white relative ${
              selectedEvent.type === 'exam' ? 'bg-gradient-to-r from-rose-900 to-red-800' :
              selectedEvent.type === 'holiday' ? 'bg-gradient-to-r from-emerald-900 to-teal-800' :
              selectedEvent.type === 'activity' ? 'bg-gradient-to-r from-indigo-900 to-purple-800' :
              selectedEvent.type === 'meeting' ? 'bg-gradient-to-r from-blue-900 to-slate-800' :
              'bg-gradient-to-r from-amber-900 to-yellow-800'
            }`}>
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 left-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/20 backdrop-blur-xs">
                  {getCategoryStyle(selectedEvent.type).label}
                </span>
                {selectedEvent.status && (
                  <span className="text-[10px] font-bold text-white/80">
                    • {selectedEvent.status === 'completed' ? 'تمت الفعالية' : 'قادمة'}
                  </span>
                )}
              </div>

              <h2 className="text-lg font-black text-white leading-snug">
                {selectedEvent.title}
              </h2>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-0.5">التاريخ والوقت:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{selectedEvent.date}</span>
                    {selectedEvent.startTime && <span>({selectedEvent.startTime})</span>}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-0.5">المكان / القاعة:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedEvent.location || 'غير محدد'}</span>
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                <span className="text-slate-400 font-medium block mb-1">الفئة المستهدفة:</span>
                <span className="font-bold text-slate-800">{selectedEvent.targetAudience || 'جميع الصفوف والموظفين'}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                <span className="text-slate-400 font-medium block mb-1">وصف تفصيلي وتعليمات:</span>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {selectedEvent.description || 'لا يوجد وصف إضافي مكتوب.'}
                </p>
              </div>

              {selectedEvent.organizer && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>الجهة المنظمة / المسؤول: <b>{selectedEvent.organizer}</b></span>
                </div>
              )}

              {/* Special action if fee due payment */}
              {selectedEvent.relatedPaymentId && onNavigate && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">مرتبط بسند مالي دراسي</span>
                    <span className="text-[11px] text-amber-700">يمكنك الانتقال لصفحة الفواتير لسداد الرسوم أو إصدار الإيصال</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEvent(null);
                      onNavigate('financial');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer shrink-0"
                  >
                    عرض الفاتورة
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                إغلاق
              </button>

              {!selectedEvent.id.startsWith('fee-evt-') && (
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  حذف الحدث
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW EVENT DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>إضافة حدث / فعالية جديدة للتقويم المدرسي</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEventSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان الفعالية أو الاختبار *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="مثال: اختبار منتصف الفصل لجميع الشعب"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع التصنيف *</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as CalendarEventType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden font-bold bg-white"
                  >
                    <option value="exam">📝 اختبارات وتطبيقات</option>
                    <option value="holiday">🌴 عطلة رسمية</option>
                    <option value="activity">🏆 نشاط أو مسابقة</option>
                    <option value="meeting">🤝 اجتماع أو ورشة عمل</option>
                    <option value="fee_due">💰 موعد استحقاق رسوم</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ البدء *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">وقت البدء (اختياري)</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={e => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">وقت الانتهاء (اختياري)</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={e => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المكان / القاعة</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    placeholder="مثال: القاعة الرئيسية"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الفئة المستهدفة</label>
                  <input
                    type="text"
                    value={newTargetAudience}
                    onChange={e => setNewTargetAudience(e.target.value)}
                    placeholder="مثال: الصف الثالث الثانوي"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الجهة المنظمة / القسم</label>
                <input
                  type="text"
                  value={newOrganizer}
                  onChange={e => setNewOrganizer(e.target.value)}
                  placeholder="مثال: إدارة المدرسة / قسم الرياضيات"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الوصف والتفاصيل</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="اكتب أي تعليمات أو تفاصيل حول الفعالية..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md cursor-pointer"
                >
                  حفظ وتأكيد الحدث
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
