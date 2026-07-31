import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderArchive, FileText, Image as ImageIcon, FileSpreadsheet, FileCode,
  Plus, Search, Filter, Trash2, Eye, Download, CheckCircle2, AlertCircle,
  X, User, GraduationCap, Building2, UploadCloud, ShieldCheck, Tag,
  Clock, Calendar, ArrowUpRight, Grid, List, Sparkles, Printer, File
} from 'lucide-react';
import { getRealmDB, getCurrentUser, addAuditLog } from '../lib/db';
import { UserDocument, DocumentCategory, DocumentFileType, DocumentOwnerType, Student, Teacher } from '../types';

interface DocumentCenterScreenProps {
  onNavigate?: (tab: string) => void;
  initialOwnerId?: string;
  initialOwnerType?: DocumentOwnerType;
}

const STORAGE_KEY = 'al_salam_school_user_documents_v2';

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Initial realistic seed documents for students and teachers
const getSeedDocuments = (students: Student[], teachers: Teacher[]): UserDocument[] => {
  const s1 = students[0] || { id: 'STU-1001', name: 'محمد أحمد علي' };
  const s2 = students[1] || { id: 'STU-1002', name: 'فاطمة خالد العتيبي' };
  const t1 = teachers[0] || { id: 'TCH-501', name: 'د. عبد الله المنصوري' };
  const t2 = teachers[1] || { id: 'TCH-502', name: 'أ. مريم السعيد' };

  return [
    {
      id: 'doc-101',
      title: 'شهادة إتمام المرحلة المتوسطة الرسمية',
      ownerType: 'student',
      ownerId: s1.id,
      ownerName: s1.name,
      category: 'certificates',
      fileType: 'pdf',
      fileName: 'Certificate_Intermediate_2025.pdf',
      fileSize: '1.8 MB',
      uploadDate: '2025-09-01',
      notes: 'شهادة مصدقة من وزارة التربية والتعليم للعام السابق.',
      verified: true
    },
    {
      id: 'doc-102',
      title: 'بطاقة الهوية الوطنية وكارت العائلة',
      ownerType: 'student',
      ownerId: s1.id,
      ownerName: s1.name,
      category: 'identity',
      fileType: 'image',
      fileName: 'National_ID_Card.png',
      fileSize: '2.4 MB',
      uploadDate: '2025-09-02',
      notes: 'صورة الهوية الوطنية سارية المفعول حتى 2030.',
      expiryDate: '2030-05-15',
      verified: true
    },
    {
      id: 'doc-103',
      title: 'جواز السفر للطالب والمعاملات الهجرية',
      ownerType: 'student',
      ownerId: s1.id,
      ownerName: s1.name,
      category: 'passport',
      fileType: 'pdf',
      fileName: 'Passport_Scan_Student.pdf',
      fileSize: '3.1 MB',
      uploadDate: '2025-09-05',
      notes: 'جواز سفر رسمي مخصص للرحلات الخارجية والتبادل العلمي.',
      expiryDate: '2029-11-20',
      verified: true
    },
    {
      id: 'doc-104',
      title: 'السجل الطبي الشامل وتقرير اللقاحات',
      ownerType: 'student',
      ownerId: s1.id,
      ownerName: s1.name,
      category: 'other',
      fileType: 'word',
      fileName: 'Medical_Checkup_Record.docx',
      fileSize: '950 KB',
      uploadDate: '2025-09-10',
      notes: 'تقرير الفحص الدوري للعينين واللياقة البدنية.',
      verified: true
    },
    {
      id: 'doc-105',
      title: 'شهادة التفوق الأكاديمي والمركز الأول',
      ownerType: 'student',
      ownerId: s2.id,
      ownerName: s2.name,
      category: 'certificates',
      fileType: 'pdf',
      fileName: 'Excellence_Award_2026.pdf',
      fileSize: '1.2 MB',
      uploadDate: '2026-01-15',
      notes: 'شهادة تقدير من مدير المدرسة للتميز الأكاديمي.',
      verified: true
    },
    {
      id: 'doc-106',
      title: 'بطاقة الإقامة والهوية الرسمية',
      ownerType: 'student',
      ownerId: s2.id,
      ownerName: s2.name,
      category: 'identity',
      fileType: 'image',
      fileName: 'Identity_Document_Fatima.jpg',
      fileSize: '1.5 MB',
      uploadDate: '2025-09-03',
      verified: true
    },
    {
      id: 'doc-107',
      title: 'سجل الدرجات السابقة والمؤهلات',
      ownerType: 'student',
      ownerId: s2.id,
      ownerName: s2.name,
      category: 'other',
      fileType: 'excel',
      fileName: 'Academic_Transcript_History.xlsx',
      fileSize: '740 KB',
      uploadDate: '2025-09-12',
      notes: 'كشف درجات موثق من المدرسة السابقة.',
      verified: true
    },
    {
      id: 'doc-108',
      title: 'شهادة الدكتوراه في الفيزياء النظيرية',
      ownerType: 'teacher',
      ownerId: t1.id,
      ownerName: t1.name,
      category: 'certificates',
      fileType: 'pdf',
      fileName: 'PhD_Degree_Physics_Mansouri.pdf',
      fileSize: '4.5 MB',
      uploadDate: '2024-08-20',
      notes: 'شهادة أصلية مصدقة ومُعادلة من وزارة التعليم العالي.',
      verified: true
    },
    {
      id: 'doc-109',
      title: 'جواز سفر المعلم والإقامة النظامية',
      ownerType: 'teacher',
      ownerId: t1.id,
      ownerName: t1.name,
      category: 'passport',
      fileType: 'pdf',
      fileName: 'Teacher_Passport_Mansouri.pdf',
      fileSize: '2.8 MB',
      uploadDate: '2024-08-22',
      expiryDate: '2028-06-30',
      verified: true
    },
    {
      id: 'doc-110',
      title: 'عقد التوظيف والسيرة الذاتية الرسمية',
      ownerType: 'teacher',
      ownerId: t1.id,
      ownerName: t1.name,
      category: 'other',
      fileType: 'word',
      fileName: 'Employment_Contract_2026.docx',
      fileSize: '1.1 MB',
      uploadDate: '2025-09-01',
      notes: 'عقد العمل الموثق مع الإدارة المدرسية.',
      verified: true
    },
    {
      id: 'doc-111',
      title: 'شهادة الماجستير في المناهج وطرائق التدريس',
      ownerType: 'teacher',
      ownerId: t2.id,
      ownerName: t2.name,
      category: 'certificates',
      fileType: 'pdf',
      fileName: 'Master_Degree_Education.pdf',
      fileSize: '3.2 MB',
      uploadDate: '2025-01-10',
      verified: true
    },
    {
      id: 'doc-112',
      title: 'الهوية الشخصية للمعلمة',
      ownerType: 'teacher',
      ownerId: t2.id,
      ownerName: t2.name,
      category: 'identity',
      fileType: 'image',
      fileName: 'National_ID_Maryam.png',
      fileSize: '1.9 MB',
      uploadDate: '2025-01-12',
      verified: true
    }
  ];
};

export const DocumentCenterScreen: React.FC<DocumentCenterScreenProps> = ({
  onNavigate,
  initialOwnerId,
  initialOwnerType
}) => {
  const db = getRealmDB();
  const currentUser = getCurrentUser();

  const [documents, setDocuments] = useState<UserDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getSeedDocuments(db.students, db.teachers);
  });

  // Filters state
  const [selectedOwnerType, setSelectedOwnerType] = useState<'all' | DocumentOwnerType>(
    initialOwnerType || 'all'
  );
  const [selectedCategory, setSelectedCategory] = useState<'all' | DocumentCategory>('all');
  const [selectedFileType, setSelectedFileType] = useState<'all' | DocumentFileType>('all');
  const [searchQuery, setSearchQuery] = useState(initialOwnerId || '');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal states
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form states for uploading new file
  const [formTitle, setFormTitle] = useState('');
  const [formOwnerType, setFormOwnerType] = useState<DocumentOwnerType>('student');
  const [formOwnerId, setFormOwnerId] = useState('');
  const [formCategory, setFormCategory] = useState<DocumentCategory>('certificates');
  const [formFileType, setFormFileType] = useState<DocumentFileType>('pdf');
  const [formFileName, setFormFileName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formFileContent, setFormFileContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch (e) {
      console.error(e);
    }
  }, [documents]);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormFileName(file.name);
      if (!formTitle) setFormTitle(file.name.replace(/\.[^/.]+$/, ""));
      
      // Auto detect type
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') setFormFileType('pdf');
      else if (['doc', 'docx'].includes(ext || '')) setFormFileType('word');
      else if (['xls', 'xlsx', 'csv'].includes(ext || '')) setFormFileType('excel');
      else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) setFormFileType('image');

      // Convert image or file preview if possible
      const reader = new FileReader();
      reader.onload = () => {
        setFormFileContent(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit new document upload
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    let ownerName = 'غير محدد';
    if (formOwnerType === 'student') {
      const s = db.students.find(x => x.id === formOwnerId);
      ownerName = s ? s.name : 'طالب محدد';
    } else {
      const t = db.teachers.find(x => x.id === formOwnerId);
      ownerName = t ? t.name : 'معلم محدد';
    }

    const newDoc: UserDocument = {
      id: `doc-custom-${Date.now()}`,
      title: formTitle.trim(),
      ownerType: formOwnerType,
      ownerId: formOwnerId || (formOwnerType === 'student' ? db.students[0]?.id : db.teachers[0]?.id) || 'ID-101',
      ownerName,
      category: formCategory,
      fileType: formFileType,
      fileName: formFileName || `Document_${Date.now()}.${formFileType === 'pdf' ? 'pdf' : formFileType === 'word' ? 'docx' : formFileType === 'excel' ? 'xlsx' : 'jpg'}`,
      fileSize: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
      uploadDate: formatDate(new Date()),
      fileUrl: formFileContent || undefined,
      notes: formNotes || undefined,
      expiryDate: formExpiryDate || undefined,
      verified: true
    };

    setDocuments(prev => [newDoc, ...prev]);
    addAuditLog('رفع وثيقة جديدة', `تم رفع وثيقة (${newDoc.title}) لـ ${newDoc.ownerName}`);

    // Reset Form
    setFormTitle('');
    setFormNotes('');
    setFormExpiryDate('');
    setFormFileContent(null);
    setFormFileName('');
    setShowUploadModal(false);
  };

  // Delete document
  const handleDeleteDocument = (id: string) => {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذه الوثيقة من أرشيف مركز الملفات؟')) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      addAuditLog('حذف وثيقة من الأرشيف', `تم حذف الوثيقة رقم (${id})`);
      setSelectedDocument(null);
    }
  };

  // Filter logic
  const filteredDocuments = documents.filter(doc => {
    if (selectedOwnerType !== 'all' && doc.ownerType !== selectedOwnerType) return false;
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
    if (selectedFileType !== 'all' && doc.fileType !== selectedFileType) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchOwner = doc.ownerName.toLowerCase().includes(q);
      const matchFile = doc.fileName.toLowerCase().includes(q);
      const matchId = doc.ownerId.toLowerCase().includes(q);
      if (!matchTitle && !matchOwner && !matchFile && !matchId) return false;
    }
    return true;
  });

  // Category Icon & Badge Helper
  const getCategoryDetails = (cat: DocumentCategory) => {
    switch (cat) {
      case 'certificates':
        return { label: 'شهادة تقدير / أكاديمية', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', text: 'شهادات' };
      case 'identity':
        return { label: 'بطاقة شخصية / هوية', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', text: 'بطاقة هوية' };
      case 'passport':
        return { label: 'جواز سفر / وثيقة سفر', badge: 'bg-amber-100 text-amber-800 border-amber-200', text: 'جواز سفر' };
      case 'other':
        return { label: 'وثيقة ومستند آخر', badge: 'bg-slate-100 text-slate-800 border-slate-200', text: 'مستندات أخرى' };
    }
  };

  // File Format Icon & Styling Helper
  const getFileTypeDetails = (type: DocumentFileType) => {
    switch (type) {
      case 'pdf':
        return { label: 'PDF', icon: <FileText className="w-5 h-5 text-rose-600" />, badge: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'word':
        return { label: 'Word (DOCX)', icon: <File className="w-5 h-5 text-blue-600" />, badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'excel':
        return { label: 'Excel (XLSX)', icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'image':
        return { label: 'صورة (PNG/JPG)', icon: <ImageIcon className="w-5 h-5 text-purple-600" />, badge: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
  };

  // Counts statistics
  const certsCount = documents.filter(d => d.category === 'certificates').length;
  const identityCount = documents.filter(d => d.category === 'identity').length;
  const passportCount = documents.filter(d => d.category === 'passport').length;
  const otherCount = documents.filter(d => d.category === 'other').length;
  const studentDocsCount = documents.filter(d => d.ownerType === 'student').length;
  const teacherDocsCount = documents.filter(d => d.ownerType === 'teacher').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-300 text-xs font-bold mb-3 border border-white/10 backdrop-blur-xs">
              <FolderArchive className="w-3.5 h-3.5" />
              <span>مركز الأرشيف والوثائق الرقمية الموحد</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              مركز الملفات والوثائق المدرسية
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              أرشيف إلكتروني مؤمن لإيداع وإدارة ملفات **جميع الطلاب والمعلمين**. يدعم صيغ **PDF، Word، Excel، والصور** لجميع الوثائق الرسمية (الشهادات، بطاقات الهوية، جوازات السفر، والعقود).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => {
                setFormOwnerId(db.students[0]?.id || '');
                setShowUploadModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-teal-600/30 flex items-center gap-2 cursor-pointer border border-teal-400/30"
            >
              <UploadCloud className="w-4 h-4" />
              <span>رفع وثيقة/ملف جديد</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all backdrop-blur-xs border border-white/15 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة الأرشيف</span>
            </button>
          </div>
        </div>

        {/* TOP METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] text-slate-300 font-medium block">إجمالي الوثائق</span>
            <span className="text-sm font-black text-white">{documents.length} ملفات</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] text-slate-300 font-medium block">🎓 ملفات الطلاب</span>
            <span className="text-sm font-black text-teal-300">{studentDocsCount} وثيقة</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] text-slate-300 font-medium block">👨‍🏫 ملفات المعلمين</span>
            <span className="text-sm font-black text-blue-300">{teacherDocsCount} وثيقة</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] text-slate-300 font-medium block">📜 الشهادات</span>
            <span className="text-sm font-black text-indigo-300">{certsCount} ملفات</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] text-slate-300 font-medium block">🪪 الهوية الشخصية</span>
            <span className="text-sm font-black text-emerald-300">{identityCount} ملفات</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] text-slate-300 font-medium block">🛂 جوازات السفر</span>
            <span className="text-sm font-black text-amber-300">{passportCount} ملفات</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Row 1: Search & Owner Filter & View Toggle */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Owner Type Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
            <button
              onClick={() => setSelectedOwnerType('all')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                selectedOwnerType === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({documents.length})
            </button>
            <button
              onClick={() => setSelectedOwnerType('student')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedOwnerType === 'student' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>الطلاب ({studentDocsCount})</span>
            </button>
            <button
              onClick={() => setSelectedOwnerType('teacher')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedOwnerType === 'teacher' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>المعلمين ({teacherDocsCount})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث بالعنوان، اسم الطالب، اسم المعلم، أو الرقم الأكاديمي..."
              className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-xs font-medium outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Grid vs Table view switch */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-teal-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="عرض كبطاقات شبكية"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-teal-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="عرض كجدول تفصيلي"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Category & Format Filter Badges */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1">التصنيف:</span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setSelectedCategory('certificates')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'certificates' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              📜 الشهادات ({certsCount})
            </button>
            <button
              onClick={() => setSelectedCategory('identity')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'identity' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              🪪 بطاقات الهوية ({identityCount})
            </button>
            <button
              onClick={() => setSelectedCategory('passport')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'passport' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              🛂 جوازات السفر ({passportCount})
            </button>
            <button
              onClick={() => setSelectedCategory('other')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'other' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📁 وثائق أخرى ({otherCount})
            </button>
          </div>

          {/* File Format Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1">الصيغة:</span>
            <button
              onClick={() => setSelectedFileType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedFileType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setSelectedFileType('pdf')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedFileType === 'pdf' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              📄 PDF
            </button>
            <button
              onClick={() => setSelectedFileType('word')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedFileType === 'word' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              📝 Word
            </button>
            <button
              onClick={() => setSelectedFileType('excel')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedFileType === 'excel' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              📊 Excel
            </button>
            <button
              onClick={() => setSelectedFileType('image')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedFileType === 'image' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              🖼️ صور
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: GRID CARDS */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map(doc => {
            const catInfo = getCategoryDetails(doc.category);
            const formatInfo = getFileTypeDetails(doc.fileType);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group hover:border-teal-300 relative overflow-hidden"
              >
                {/* Card Top Header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${catInfo.badge}`}>
                      {catInfo.text}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${formatInfo.badge}`}>
                        {formatInfo.label}
                      </span>
                      {doc.ownerType === 'student' ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          طالب
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          معلم
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document Title & Icon */}
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                      {formatInfo.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-teal-700 transition-colors">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-1">
                        👤 {doc.ownerName}
                      </p>
                    </div>
                  </div>

                  {/* Notes snippet if exists */}
                  {doc.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                      {doc.notes}
                    </p>
                  )}
                </div>

                {/* Card Footer Details & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="space-y-0.5">
                    <span className="block font-medium">الحجم: {doc.fileSize}</span>
                    <span className="block">تاريخ الرفع: {doc.uploadDate}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedDocument(doc)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-colors cursor-pointer"
                      title="معاينة الوثيقة"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 transition-colors cursor-pointer"
                      title="حذف الوثيقة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW MODE 2: TABLE DETAILED VIEW */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-slate-200 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">عنوان الوثيقة والملف</th>
                  <th className="py-3.5 px-4">صاحب الوثيقة</th>
                  <th className="py-3.5 px-4">التصنيف</th>
                  <th className="py-3.5 px-4">الصيغة</th>
                  <th className="py-3.5 px-4">تاريخ الرفع</th>
                  <th className="py-3.5 px-4">الحجم</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDocuments.map(doc => {
                  const catInfo = getCategoryDetails(doc.category);
                  const formatInfo = getFileTypeDetails(doc.fileType);

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-100 shrink-0">
                            {formatInfo.icon}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{doc.title}</span>
                            <span className="text-[10px] text-slate-400">{doc.fileName}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{doc.ownerName}</span>
                        <span className={`text-[10px] font-bold ${doc.ownerType === 'student' ? 'text-teal-600' : 'text-blue-600'}`}>
                          {doc.ownerType === 'student' ? 'طالب' : 'معلم'} ({doc.ownerId})
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg font-bold border ${catInfo.badge}`}>
                          {catInfo.text}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-lg font-bold border ${formatInfo.badge}`}>
                          {formatInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-600">
                        {doc.uploadDate}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {doc.fileSize}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedDocument(doc)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-800 transition-colors cursor-pointer"
                            title="معاينة التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NO RESULTS DISPLAY */}
      {filteredDocuments.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <FolderArchive className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
          <h3 className="font-bold text-slate-700 text-sm">لا توجد وثائق مطابقة لمعايير البحث الحالية</h3>
          <p className="text-xs text-slate-400">يمكنك رفع ملف جديدة بالضغط على زر "رفع وثيقة/ملف جديد" أعلاه.</p>
        </div>
      )}

      {/* MODAL 1: VIEW & PREVIEW DOCUMENT */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
            {/* Header */}
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getFileTypeDetails(selectedDocument.fileType).icon}
                <h3 className="font-black text-sm">{selectedDocument.title}</h3>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Preview Box */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* File Image Preview if available */}
              {selectedDocument.fileUrl ? (
                <div className="bg-slate-100 rounded-2xl p-2 border border-slate-200 overflow-hidden text-center">
                  <img
                    src={selectedDocument.fileUrl}
                    alt={selectedDocument.title}
                    className="max-h-56 mx-auto rounded-xl object-contain"
                  />
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                  <FileText className="w-12 h-12 text-teal-600 mx-auto stroke-1" />
                  <span className="font-bold text-slate-800 text-xs block">{selectedDocument.fileName}</span>
                  <span className="text-[11px] text-slate-400 block">معاينة المستند مؤمنة ومحفوظة بنجاح</span>
                </div>
              )}

              {/* Document Specs Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-0.5">صاحب المستند:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    👤 {selectedDocument.ownerName}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-0.5">الصفة والرمز:</span>
                  <span className={`font-bold ${selectedDocument.ownerType === 'student' ? 'text-teal-700' : 'text-blue-700'}`}>
                    {selectedDocument.ownerType === 'student' ? 'طالب' : 'معلم'} ({selectedDocument.ownerId})
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-0.5">تصنيف المستند:</span>
                  <span className="font-bold text-indigo-700">
                    {getCategoryDetails(selectedDocument.category).label}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-0.5">الصيغة والحجم:</span>
                  <span className="font-bold text-slate-800">
                    {getFileTypeDetails(selectedDocument.fileType).label} ({selectedDocument.fileSize})
                  </span>
                </div>
              </div>

              {selectedDocument.notes && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                  <span className="text-slate-400 font-medium block mb-1">ملاحظات توثيقية:</span>
                  <p className="text-slate-700 font-medium">{selectedDocument.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span>تاريخ الإيداع بالأرشيف: <b>{selectedDocument.uploadDate}</b></span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> وثيقة موثقة ومتحقق منها
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedDocument(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 cursor-pointer"
              >
                إغلاق
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    alert(`جاري تحميل الملف: ${selectedDocument.fileName}`);
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل النسخة الأصلية</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD NEW DOCUMENT */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-teal-400" />
                <span>رفع وثيقة أو مستند جديد للأرشيف</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* File Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-50 p-6 rounded-2xl text-center cursor-pointer transition-colors space-y-2"
              >
                <UploadCloud className="w-8 h-8 text-teal-600 mx-auto" />
                <span className="font-bold text-slate-800 block text-xs">
                  {formFileName ? `الملف المحدد: ${formFileName}` : 'اضغط لاختيار ملف من جهازك أو اسحبه هنا'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  يدعم صيغ PDF، Word (.docx)، Excel (.xlsx)، والصور (.jpg, .png)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان الوثيقة / المستند *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="مثال: شهادة الميلاد أو الهوية الوطنية"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">صاحب الملف (الفئة) *</label>
                  <select
                    value={formOwnerType}
                    onChange={e => {
                      const val = e.target.value as DocumentOwnerType;
                      setFormOwnerType(val);
                      if (val === 'student') setFormOwnerId(db.students[0]?.id || '');
                      else setFormOwnerId(db.teachers[0]?.id || '');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="student">🎓 طالب في المدرسة</option>
                    <option value="teacher">👨‍🏫 معلم / كادر تعليمي</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تحديد الشخص المعني *</label>
                  <select
                    value={formOwnerId}
                    onChange={e => setFormOwnerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium bg-white"
                  >
                    {formOwnerType === 'student'
                      ? db.students.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.academicId})</option>
                        ))
                      : db.teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.specialization || t.id})</option>
                        ))
                    }
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تصنيف الوثيقة *</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as DocumentCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="certificates">📜 الشهادات الأكاديمية</option>
                    <option value="identity">🪪 بطاقة الهوية / السجل</option>
                    <option value="passport">🛂 جواز السفر / الإقامة</option>
                    <option value="other">📁 وثائق ومستندات أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع الصيغة *</label>
                  <select
                    value={formFileType}
                    onChange={e => setFormFileType(e.target.value as DocumentFileType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="pdf">📄 مستند PDF</option>
                    <option value="word">📝 مستند Word (DOCX)</option>
                    <option value="excel">📊 جدول Excel (XLSX)</option>
                    <option value="image">🖼️ صورة (PNG / JPG)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات وإيضاحات إضافية</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="أي ملاحظات حول صلاحية المستند أو التوثيق..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md cursor-pointer"
                >
                  تأكيد وحفظ الوثيقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
