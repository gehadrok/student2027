import React, { useState, useEffect } from 'react';
import { LibraryBook, BookCategory, BookBorrowing, BorrowingStatus, Student } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog } from '../lib/db';
import { ReportPreviewModal } from '../components/ReportPreviewModal';
import { ActiveReportPrintView } from '../components/ActiveReportPrintView';
import { 
  BookOpen, Search, Plus, Edit, Trash2, CheckCircle2, AlertCircle, 
  Clock, Calendar, User, Users, ArrowRight, Bell, Send, Filter, 
  Sparkles, FileText, Check, X, AlertTriangle, Bookmark, RotateCcw,
  BookMarked, Layers, MapPin, Hash, CheckCheck, Printer
} from 'lucide-react';

export const LibraryScreen: React.FC = () => {
  const [db, setDb] = useState(getRealmDB());
  const [books, setBooks] = useState<LibraryBook[]>(db.books || []);
  const [borrowings, setBorrowings] = useState<BookBorrowing[]>(db.borrowings || []);
  const [activeTab, setActiveTab] = useState<'inventory' | 'borrowings' | 'analytics'>('inventory');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filters & Search
  const [bookSearch, setBookSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | BookCategory>('all');
  const [borrowSearch, setBorrowSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | BorrowingStatus>('all');

  // Modals
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [editBook, setEditBook] = useState<LibraryBook | null>(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedBookForBorrow, setSelectedBookForBorrow] = useState<LibraryBook | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState<string | null>(null);

  // Book Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState<BookCategory>('علوم وتكنولوجيا');
  const [copiesTotal, setCopiesTotal] = useState(5);
  const [copiesAvailable, setCopiesAvailable] = useState(5);
  const [location, setLocation] = useState('الرف A - القسم العلمي');
  const [description, setDescription] = useState('');

  // Borrow Form State
  const [borrowStudentId, setBorrowStudentId] = useState(db.students[0]?.id || '');
  const [borrowBookId, setBorrowBookId] = useState('');
  const [borrowDays, setBorrowDays] = useState(14); // default 2 weeks
  const [borrowNotes, setBorrowNotes] = useState('');

  const BOOK_CATEGORIES: BookCategory[] = [
    'علوم وتكنولوجيا',
    'أدب وروايات',
    'تاريخ وجغرافيا',
    'لغات ومراجع',
    'دين وفلسفة',
    'فنون ومهارات'
  ];

  // Automated Due Date Check on mount
  useEffect(() => {
    const currentDb = getRealmDB();
    const todayStr = new Date().toISOString().split('T')[0];
    let mutated = false;

    if (currentDb.borrowings) {
      currentDb.borrowings.forEach(brw => {
        if (brw.status === 'borrowed' && brw.dueDate < todayStr) {
          brw.status = 'overdue';
          mutated = true;
        }
      });
    }

    if (mutated) {
      saveRealmDB(currentDb);
      setDb(currentDb);
      setBorrowings(currentDb.borrowings || []);
      addAuditLog("تحديث آلي للمكتبة", "تم تحديث حالات الكتب المتأخرة عن موعد الإرجاع تلقائياً");
    }
  }, []);

  // Stats calculation
  const totalBooksCount = books.length;
  const totalCopiesCount = books.reduce((sum, b) => sum + (b.copiesTotal || 0), 0);
  const availableCopiesCount = books.reduce((sum, b) => sum + (b.copiesAvailable || 0), 0);
  const activeBorrowingsCount = borrowings.filter(b => b.status === 'borrowed').length;
  const overdueBorrowingsCount = borrowings.filter(b => b.status === 'overdue').length;

  // Open Add/Edit Book Modal
  const handleOpenAddBook = () => {
    setEditBook(null);
    setTitle('');
    setAuthor('');
    setIsbn(`978-603-00-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1 + Math.random() * 9)}`);
    setCategory('علوم وتكنولوجيا');
    setCopiesTotal(5);
    setCopiesAvailable(5);
    setLocation('الرف A - القسم العلمي');
    setDescription('');
    setShowAddBookModal(true);
  };

  const handleOpenEditBook = (book: LibraryBook) => {
    setEditBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setIsbn(book.isbn);
    setCategory(book.category);
    setCopiesTotal(book.copiesTotal);
    setCopiesAvailable(book.copiesAvailable);
    setLocation(book.location);
    setDescription(book.description || '');
    setShowAddBookModal(true);
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !isbn.trim()) return;

    const currentDb = getRealmDB();
    const booksList = currentDb.books || [];

    if (editBook) {
      const idx = booksList.findIndex(b => b.id === editBook.id);
      if (idx > -1) {
        // Adjust available copies if total changed
        const diff = copiesTotal - editBook.copiesTotal;
        const newAvailable = Math.max(0, Math.min(copiesTotal, editBook.copiesAvailable + diff));

        booksList[idx] = {
          ...editBook,
          title,
          author,
          isbn,
          category,
          copiesTotal,
          copiesAvailable: newAvailable,
          location,
          description
        };
        addAuditLog("تعديل كتاب بالمكتبة", `تم تعديل بيانات الكتاب: ${title}`);
      }
    } else {
      const newId = `BOOK-${Math.floor(100 + Math.random() * 900)}`;
      const newBook: LibraryBook = {
        id: newId,
        isbn,
        title,
        author,
        category,
        copiesTotal,
        copiesAvailable: copiesTotal,
        location,
        description,
        addedDate: new Date().toISOString().split('T')[0]
      };
      booksList.push(newBook);
      addAuditLog("إضافة كتاب للمكتبة", `تم إضافة الكتاب الجديد: ${title} (${copiesTotal} نسخ)`);
    }

    currentDb.books = booksList;
    saveRealmDB(currentDb);
    setDb(currentDb);
    setBooks(booksList);
    setShowAddBookModal(false);
  };

  const handleDeleteBook = (bookId: string, bookTitle: string) => {
    // Check if book has active borrowings
    const hasActiveBorrowings = borrowings.some(b => b.bookId === bookId && (b.status === 'borrowed' || b.status === 'overdue'));
    if (hasActiveBorrowings) {
      alert("لا يمكن حذف هذا الكتاب لوجود إعارات نشطة أو متأخرة مرتبطة به. يرجى تسجيل إرجاع النسخ أولاً.");
      return;
    }

    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف كتاب "${bookTitle}" من سجلات المكتبة؟`)) return;

    const currentDb = getRealmDB();
    currentDb.books = (currentDb.books || []).filter(b => b.id !== bookId);
    saveRealmDB(currentDb);
    setDb(currentDb);
    setBooks(currentDb.books);
    addAuditLog("حذف كتاب من المكتبة", `تم حذف الكتاب: ${bookTitle}`);
  };

  // Borrowing Handlers
  const handleOpenBorrowModal = (book?: LibraryBook) => {
    setSelectedBookForBorrow(book || null);
    if (book) {
      setBorrowBookId(book.id);
    } else {
      const firstAvailable = books.find(b => b.copiesAvailable > 0);
      setBorrowBookId(firstAvailable?.id || books[0]?.id || '');
    }
    setBorrowStudentId(db.students[0]?.id || '');
    setBorrowDays(14);
    setBorrowNotes('');
    setShowBorrowModal(true);
  };

  const handleSaveBorrowing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowBookId || !borrowStudentId) return;

    const currentDb = getRealmDB();
    const targetBook = (currentDb.books || []).find(b => b.id === borrowBookId);
    const targetStudent = currentDb.students.find(s => s.id === borrowStudentId);

    if (!targetBook) {
      alert("الكتاب المحدد غير موجود!");
      return;
    }
    if (targetBook.copiesAvailable <= 0) {
      alert("عفواً، لا توجد نسخ متاحة حالياً من هذا الكتاب للاستعارة!");
      return;
    }

    // Decrement available copies
    targetBook.copiesAvailable -= 1;

    // Calculate due date
    const today = new Date();
    const dueDateObj = new Date(today.getTime() + borrowDays * 24 * 60 * 60 * 1000);
    const borrowDateStr = today.toISOString().split('T')[0];
    const dueDateStr = dueDateObj.toISOString().split('T')[0];

    const studentClassObj = currentDb.classes.find(c => c.id === targetStudent?.classId);
    const studentSectionObj = studentClassObj?.sections.find(sec => sec.id === targetStudent?.sectionId);
    const classInfoStr = studentClassObj ? `${studentClassObj.name} - ${studentSectionObj?.name || ''}` : '';

    const newBorrowing: BookBorrowing = {
      id: `BRW-${Math.floor(2000 + Math.random() * 8000)}`,
      bookId: targetBook.id,
      bookTitle: targetBook.title,
      studentId: borrowStudentId,
      studentName: targetStudent?.name || 'طالب غير محدد',
      studentClass: classInfoStr,
      borrowDate: borrowDateStr,
      dueDate: dueDateStr,
      status: 'borrowed',
      notes: borrowNotes.trim() ? borrowNotes.trim() : `استعارة لمدة ${borrowDays} يوماً`,
      notified: false
    };

    if (!currentDb.borrowings) currentDb.borrowings = [];
    currentDb.borrowings.unshift(newBorrowing);

    saveRealmDB(currentDb);
    setDb(currentDb);
    setBooks(currentDb.books || []);
    setBorrowings(currentDb.borrowings || []);
    setShowBorrowModal(false);
    addAuditLog("تسجيل استعارة كتاب", `تم تسجيل استعارة كتاب (${targetBook.title}) للطالب (${targetStudent?.name})`);
  };

  const handleReturnBook = (borrowId: string, bookTitle: string, studentName: string) => {
    if (!window.confirm(`هل تؤكد استلام وإرجاع كتاب "${bookTitle}" من الطالب ${studentName}؟`)) return;

    const currentDb = getRealmDB();
    const targetBorrowing = (currentDb.borrowings || []).find(b => b.id === borrowId);
    if (!targetBorrowing || targetBorrowing.status === 'returned') return;

    const targetBook = (currentDb.books || []).find(b => b.id === targetBorrowing.bookId);
    if (targetBook) {
      targetBook.copiesAvailable = Math.min(targetBook.copiesTotal, targetBook.copiesAvailable + 1);
    }

    targetBorrowing.status = 'returned';
    targetBorrowing.returnDate = new Date().toISOString().split('T')[0];
    targetBorrowing.notes = `${targetBorrowing.notes ? targetBorrowing.notes + ' | ' : ''}تم الإرجاع بحالة سليمة بتاريخ ${targetBorrowing.returnDate}`;

    saveRealmDB(currentDb);
    setDb(currentDb);
    setBooks(currentDb.books || []);
    setBorrowings(currentDb.borrowings || []);
    addAuditLog("إرجاع كتاب للمكتبة", `تم إرجاع كتاب (${bookTitle}) من الطالب (${studentName})`);
  };

  const handleExtendBorrowing = (borrowId: string, bookTitle: string, currentDueDate: string) => {
    const currentDb = getRealmDB();
    const targetBorrowing = (currentDb.borrowings || []).find(b => b.id === borrowId);
    if (!targetBorrowing) return;

    const due = new Date(currentDueDate);
    const extendedDue = new Date(due.getTime() + 7 * 24 * 60 * 60 * 1000);
    const extendedStr = extendedDue.toISOString().split('T')[0];

    targetBorrowing.dueDate = extendedStr;
    if (targetBorrowing.status === 'overdue' && extendedStr >= new Date().toISOString().split('T')[0]) {
      targetBorrowing.status = 'borrowed';
    }
    targetBorrowing.notes = `${targetBorrowing.notes ? targetBorrowing.notes + ' | ' : ''}تم تمديد فترة الاستعارة 7 أيام حتى ${extendedStr}`;

    saveRealmDB(currentDb);
    setDb(currentDb);
    setBorrowings(currentDb.borrowings || []);
    addAuditLog("تمديد فترة استعارة", `تم تمديد استعارة كتاب (${bookTitle}) حتى الموعد الجديد ${extendedStr}`);
    alert(`تم تمديد موعد الإرجاع بنجاح لمدة أسبوع إضافي ليصبح الموعد الجديد: ${extendedStr}`);
  };

  const handleSendIndividualReminder = (borrowing: BookBorrowing) => {
    const currentDb = getRealmDB();
    const targetBorrowing = (currentDb.borrowings || []).find(b => b.id === borrowing.id);
    if (targetBorrowing) {
      targetBorrowing.notified = true;
    }

    // Add notification to app
    if (!currentDb.notifications) currentDb.notifications = [];
    currentDb.notifications.unshift({
      id: `notif-lib-${Date.now()}`,
      targetRole: 'parent',
      title: `تنبيه تأخر إرجاع كتاب مدرسي: ${borrowing.bookTitle}`,
      message: `نذكركم بضرورة إرجاع الكتاب المستعار (${borrowing.bookTitle}) الخاص بالطالب (${borrowing.studentName}) حيث تجاوز موعد الإرجاع المقرر (${borrowing.dueDate}).`,
      type: 'danger',
      isRead: false,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    });

    saveRealmDB(currentDb);
    setDb(currentDb);
    setBorrowings(currentDb.borrowings || []);
    addAuditLog("إرسال إشعار تذكير استعارة", `تم إرسال تذكير بخصوص كتاب (${borrowing.bookTitle}) للطالب (${borrowing.studentName})`);
    alert(`تم إرسال إشعار التذكير بنجاح إلى ولي أمر الطالب: ${borrowing.studentName}`);
  };

  const handleSendBulkOverdueNotifications = () => {
    const currentDb = getRealmDB();
    const overdueList = (currentDb.borrowings || []).filter(b => b.status === 'overdue');

    if (overdueList.length === 0) {
      alert("لا توجد أي إعارات متأخرة حالياً لإرسال تنبيهات لها!");
      return;
    }

    let newlyNotifiedCount = 0;
    overdueList.forEach(brw => {
      brw.notified = true;
      newlyNotifiedCount++;

      // Create App notification
      if (!currentDb.notifications) currentDb.notifications = [];
      currentDb.notifications.unshift({
        id: `notif-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        targetRole: 'parent',
        title: `تنبيه عاجل: تأخر في إرجاع كتاب مدرسي (${brw.bookTitle})`,
        message: `يرجى التنبيه على الطالب (${brw.studentName}) بسرعة إرجاع الكتاب المذكور لمكتبة المدرسة حيث استحق موعد الإرجاع بتاريخ (${brw.dueDate}).`,
        type: 'danger',
        isRead: false,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
      });
    });

    saveRealmDB(currentDb);
    setDb(currentDb);
    setBorrowings(currentDb.borrowings || []);
    addAuditLog("إرسال تنبيهات للمتأخرين بالمكتبة", `تم إرسال تنبيهات آلية لعدد ${overdueList.length} من الطلاب المتأخرين في إرجاع الكتب`);
    setNotificationFeedback(`تم بنجاح إرسال ${overdueList.length} إشعاراً آلياً (SMS + إشعارات تطبيق) لجميع أولياء أمور الطلاب المتأخرين في إرجاع الكتب!`);
    setShowNotificationModal(true);
  };

  // Filtered Books
  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.includes(bookSearch) || b.author.includes(bookSearch) || b.isbn.includes(bookSearch);
    const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Filtered Borrowings
  const filteredBorrowings = borrowings.filter(b => {
    const matchesSearch = b.studentName.includes(borrowSearch) || b.bookTitle.includes(borrowSearch) || b.id.includes(borrowSearch);
    const matchesStatus = selectedStatus === 'all' || b.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const calculateOverdueDays = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getStatusBadge = (status: BorrowingStatus) => {
    switch (status) {
      case 'borrowed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200"><Clock className="w-3.5 h-3.5" /> جارية (نشطة)</span>;
      case 'returned':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> تم الإرجاع</span>;
      case 'overdue':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"><AlertCircle className="w-3.5 h-3.5" /> متأخرة عن الموعد</span>;
      case 'lost':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300"><X className="w-3.5 h-3.5" /> مفقود</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sky-300 text-xs font-bold backdrop-blur-sm border border-white/10">
            <BookOpen className="w-3.5 h-3.5" />
            <span>نظام إدارة المكتبة المدرسية والمخزون والإعارات</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">المكتبة المدرسية الإلكترونية (Library & Circulation)</h1>
          <p className="text-slate-300 text-sm md:text-base max-w-2xl font-medium">
            متابعة فهرس الكتب والمصادر، جرد المخزون والنسخ المتاحة، تسجيل إعارات الطلاب واسترجاعها، مع التنبيه الآلي للكتب المتأخرة عن موعد الإرجاع.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={handleOpenAddBook}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة كتاب جديد</span>
          </button>
          
          <button
            onClick={() => handleOpenBorrowModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-950 hover:bg-slate-100 font-bold text-sm shadow-lg transition duration-200"
          >
            <Bookmark className="w-4 h-4 text-indigo-600" />
            <span>تسجيل استعارة جديدة</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm shadow-lg transition duration-200 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>طباعة تقرير المكتبة</span>
          </button>

          <button
            onClick={handleSendBulkOverdueNotifications}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition duration-200"
            title="إرسال إشعارات وتنبيهات فورية لجميع المتأخرين"
          >
            <Bell className="w-4 h-4 animate-bounce" />
            <span>إرسال تنبيهات للمتأخرين آلياً</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between hover:border-blue-300 transition">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">إجمالي عناوين الكتب بالمكتبة</p>
            <h3 className="text-2xl font-black text-slate-900">{totalBooksCount} <span className="text-sm font-bold text-slate-400">عنوان</span></h3>
            <p className="text-xs text-slate-500 mt-1">المجموع: {totalCopiesCount} نسخة ورقية</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between hover:border-emerald-300 transition">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">النسخ المتاحة للاستعارة الفورية</p>
            <h3 className="text-2xl font-black text-emerald-600">{availableCopiesCount} <span className="text-sm font-bold text-slate-400">نسخة</span></h3>
            <p className="text-xs text-emerald-600 mt-1 font-bold">جاهزة على الأرفف</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between hover:border-indigo-300 transition">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">الإعارات النشطة (الجارية)</p>
            <h3 className="text-2xl font-black text-indigo-600">{activeBorrowingsCount} <span className="text-sm font-bold text-slate-400">كتاب مستعار</span></h3>
            <p className="text-xs text-slate-500 mt-1">ضمن الموعد المقرر للإرجاع</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => { setActiveTab('borrowings'); setSelectedStatus('overdue'); }}
          className="bg-gradient-to-br from-rose-50 to-amber-50/50 p-5 rounded-2xl shadow-sm border border-rose-200 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-rose-400 transition"
          title="اضغط لعرض قائمة الإعارات المتأخرة"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              <p className="text-xs font-bold text-rose-800">الإعارات المتأخرة عن الموعد</p>
            </div>
            <h3 className="text-2xl font-black text-rose-600">{overdueBorrowingsCount} <span className="text-sm font-bold text-rose-500">حالة تأخير</span></h3>
            <p className="text-xs text-rose-700 font-bold mt-1 underline decoration-dotted">اضغط لفلترة المتأخرين ومتابعتهم</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 bg-white px-4 pt-3 rounded-t-2xl shadow-sm">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>فهرس الكتب والمخزون ({books.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('borrowings')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition ${
            activeTab === 'borrowings'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>سجل الإعارات والمتابعة ({borrowings.length})</span>
          {overdueBorrowingsCount > 0 && (
            <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-black animate-pulse">
              {overdueBorrowingsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition ${
            activeTab === 'analytics'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>نظام التنبيهات والتقارير الآلية</span>
        </button>
      </div>

      {/* TAB 1: BOOK INVENTORY & CATALOG */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="relative flex-1 max-w-md">
              <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث باسم الكتاب، المؤلف، أو رقم الردمك (ISBN)..."
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 ml-1">التصنيف:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                الكل ({books.length})
              </button>
              {BOOK_CATEGORIES.map(cat => {
                const count = books.filter(b => b.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Books Table View */}
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold">لا توجد كتب مطابقة لخيارات البحث أو التصنيف المحدد</p>
              <button
                onClick={() => { setBookSearch(''); setSelectedCategory('all'); }}
                className="mt-3 text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 text-slate-700 font-bold text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4">رقم الردمك (ISBN)</th>
                    <th className="py-3 px-4">عنوان الكتاب والمؤلف</th>
                    <th className="py-3 px-4">التصنيف الموضوعي</th>
                    <th className="py-3 px-4">الموقع بالأرفف</th>
                    <th className="py-3 px-4 text-center">النسخ المتاحة / الإجمالي</th>
                    <th className="py-3 px-4 text-center">حالة التوافر</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBooks.map((book) => {
                    const isAvailable = book.copiesAvailable > 0;
                    const availPercent = Math.round((book.copiesAvailable / Math.max(1, book.copiesTotal)) * 100);

                    return (
                      <tr key={book.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-500">
                          {book.isbn}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-base">{book.title}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>تأليف: {book.author}</span>
                          </div>
                          {book.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-sm">{book.description}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {book.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium text-xs">
                          <div className="flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{book.location}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 font-mono font-black text-sm">
                            <span className={isAvailable ? "text-emerald-600" : "text-rose-600"}>
                              {book.copiesAvailable}
                            </span>
                            <span className="text-slate-400">/</span>
                            <span className="text-slate-700">{book.copiesTotal}</span>
                          </div>
                          <div className="w-20 bg-slate-200 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full ${availPercent > 50 ? 'bg-emerald-500' : availPercent > 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${availPercent}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> متاح للاستعارة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5" /> جميع النسخ معارة
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenBorrowModal(book)}
                              disabled={!isAvailable}
                              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                                isAvailable
                                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                              }`}
                              title="استعارة هذا الكتاب"
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                              <span>استعارة</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditBook(book)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition"
                              title="تعديل بيانات الكتاب"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteBook(book.id, book.title)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition"
                              title="حذف الكتاب"
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
          )}
        </div>
      )}

      {/* TAB 2: STUDENT BORROWING RECORDS & DUE DATES */}
      {activeTab === 'borrowings' && (
        <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          {/* Search and Status Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="relative flex-1 max-w-md">
              <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث باسم الطالب، عنوان الكتاب، أو رقم الاستعارة..."
                value={borrowSearch}
                onChange={(e) => setBorrowSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 ml-1">حالة الاستعارة:</span>
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedStatus === 'all'
                    ? 'bg-indigo-900 text-white shadow-sm'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                الكل ({borrowings.length})
              </button>
              <button
                onClick={() => setSelectedStatus('borrowed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedStatus === 'borrowed'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-300 text-blue-700 hover:bg-blue-50'
                }`}
              >
                جارية ({borrowings.filter(b => b.status === 'borrowed').length})
              </button>
              <button
                onClick={() => setSelectedStatus('overdue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedStatus === 'overdue'
                    ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                    : 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-50'
                }`}
              >
                متأخرة ({overdueBorrowingsCount})
              </button>
              <button
                onClick={() => setSelectedStatus('returned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedStatus === 'returned'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-300 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                تم الإرجاع ({borrowings.filter(b => b.status === 'returned').length})
              </button>
            </div>
          </div>

          {/* Borrowings Table */}
          {filteredBorrowings.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
              <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold">لا توجد سجلات استعارة مطابقة للفلتر المحدد</p>
              <button
                onClick={() => { setBorrowSearch(''); setSelectedStatus('all'); }}
                className="mt-3 text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>عرض كافة السجلات</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 text-slate-700 font-bold text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4">رقم السجل</th>
                    <th className="py-3 px-4">الطالب والمرحلة</th>
                    <th className="py-3 px-4">عنوان الكتاب المستعار</th>
                    <th className="py-3 px-4 text-center">تاريخ الاستعارة</th>
                    <th className="py-3 px-4 text-center">موعد الإرجاع المقرر</th>
                    <th className="py-3 px-4 text-center">الحالة والمتابعة</th>
                    <th className="py-3 px-4 text-center">التنبيه الآلي</th>
                    <th className="py-3 px-4 text-center">الإجراءات والعمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBorrowings.map((brw) => {
                    const isOverdue = brw.status === 'overdue';
                    const overdueDays = isOverdue ? calculateOverdueDays(brw.dueDate) : 0;

                    return (
                      <tr key={brw.id} className={`transition ${isOverdue ? 'bg-rose-50/40 hover:bg-rose-50/70 font-semibold' : 'hover:bg-slate-50/80'}`}>
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-500">
                          {brw.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{brw.studentName}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">{brw.studentClass || 'طالب ثانوي'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>{brw.bookTitle}</span>
                          </div>
                          {brw.notes && (
                            <p className="text-xs text-slate-400 font-normal mt-1">{brw.notes}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-600">
                          {brw.borrowDate}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className={`font-mono font-bold text-xs ${isOverdue ? 'text-rose-600 bg-rose-100 px-2 py-1 rounded-md inline-block' : 'text-slate-800'}`}>
                            {brw.dueDate}
                          </div>
                          {isOverdue && (
                            <div className="text-[10px] font-black text-rose-600 mt-1">
                              تأخير ({overdueDays} يوم)
                            </div>
                          )}
                          {brw.returnDate && (
                            <div className="text-[10px] font-bold text-emerald-600 mt-1">
                              أُرجع في {brw.returnDate}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(brw.status)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {brw.status === 'returned' ? (
                            <span className="text-slate-400 text-xs font-medium">مكتمل</span>
                          ) : brw.notified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCheck className="w-3 h-3" /> تم تنبيه ولي الأمر
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Bell className="w-3 h-3 text-amber-600 animate-bounce" /> يستحق التنبيه
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {brw.status !== 'returned' && (
                              <>
                                <button
                                  onClick={() => handleReturnBook(brw.id, brw.bookTitle, brw.studentName)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1 transition"
                                  title="تسجيل إرجاع الكتاب واستلامه من الطالب"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>إرجاع</span>
                                </button>

                                <button
                                  onClick={() => handleExtendBorrowing(brw.id, brw.bookTitle, brw.dueDate)}
                                  className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1 transition"
                                  title="تمديد موعد الإرجاع لمدة 7 أيام إضافية"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>تمديد أسبوع</span>
                                </button>
                              </>
                            )}

                            {isOverdue && !brw.notified && (
                              <button
                                onClick={() => handleSendIndividualReminder(brw)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition border border-rose-200"
                                title="إرسال إشعار تذكير فوري لولي الأمر"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUTOMATED NOTIFICATIONS & LIBRARY ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Overdue Alert Banner */}
          <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-amber-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 border border-rose-700/50">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 text-xs font-black border border-rose-400/30">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>نظام المراقبة الذكي للكتب المتأخرة</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black">إدارة التنبيهات التلقائية والتذكير بمواعيد الإرجاع</h2>
              <p className="text-rose-100 text-sm max-w-2xl font-medium">
                يقوم النظام يومياً عند الساعة 8:00 صباحاً بفحص سجلات الاستعارة ومقارنتها بالتاريخ الحالي، وتحويل الإعارات المنتهية إلى حالة (متأخرة) مع إمكانية إرسال إشعارات فورية عبر الرسائل القصيرة (SMS) وتطبيق ولي الأمر.
              </p>
            </div>

            <button
              onClick={handleSendBulkOverdueNotifications}
              className="px-6 py-3 rounded-xl bg-white text-rose-900 hover:bg-rose-50 font-black text-sm shadow-xl flex items-center justify-center gap-2 transition duration-200 shrink-0"
            >
              <Bell className="w-5 h-5 text-rose-600 animate-bounce" />
              <span>إرسال التنبيهات لكافة المتأخرين ({overdueBorrowingsCount})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Col: Overdue Breakdown */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span>قائمة الطلاب المتأخرين في إرجاع الكتب حالياً</span>
                </h3>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                  {overdueBorrowingsCount} طالب
                </span>
              </div>

              {overdueBorrowingsCount === 0 ? (
                <div className="text-center py-10 bg-emerald-50/50 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-emerald-800">ممتاز! لا يوجد أي تأخير في إرجاع الكتب لدى طلاب المدرسة حالياً</p>
                  <p className="text-xs text-emerald-600 mt-1">جميع الكتب المستعارة ضمن الفترات الزمنية المسموح بها</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {borrowings.filter(b => b.status === 'overdue').map(brw => {
                    const diffDays = calculateOverdueDays(brw.dueDate);
                    return (
                      <div key={brw.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-rose-300 transition">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-base">{brw.studentName}</span>
                            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">{brw.studentClass}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            <span>الكتاب: {brw.bookTitle}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            موعد الإرجاع المقرر كان: <span className="font-mono font-bold text-rose-600">{brw.dueDate}</span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
                          <div className="text-left">
                            <span className="inline-block px-3 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-black">
                              تأخر {diffDays} يوم
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {brw.notified ? (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCheck className="w-4 h-4" /> تم إبلاغ ولي الأمر
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSendIndividualReminder(brw)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>إشعار ولي الأمر</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Col: Library Policies & Rules */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 h-fit">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>سياسات الإعارة والتنبيه المدرسي</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-600 font-medium leading-relaxed">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="font-bold text-blue-900 mb-1">1. المدة المسموحة للاستعارة</p>
                  <p className="text-blue-800">تُحدد مدة استعارة الكتب المدرسية بـ 14 يوماً من تاريخ التسليم، مع إمكانية التمديد لمرة واحدة (7 أيام إضافية) قبل انتهاء الموعد.</p>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="font-bold text-amber-900 mb-1">2. التنبيه المبكر وتجاوز الموعد</p>
                  <p className="text-amber-800">يرسل النظام إشعاراً تذكيرياً تلقائياً قبل يومين من استحقاق الإرجاع. وفي حال التجاوز يتحول السجل لـ (متأخر) ويظهر إشعار أحمر بحساب ولي الأمر.</p>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <p className="font-bold text-rose-900 mb-1">3. مسؤولية تلف أو فقدان الكتاب</p>
                  <p className="text-rose-800">في حال فقدان الكتاب أو تلفه تلفاً يمنع استخدامه، يُلزم الطالب بتوفير نسخة بديلة أو سداد قيمته المقدرة لإدارة المكتبة.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT BOOK */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>{editBook ? 'تعديل بيانات كتاب بالمكتبة' : 'إضافة كتاب جديد للمكتبة'}</span>
              </h3>
              <button
                onClick={() => setShowAddBookModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الكتاب <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مبادئ الفيزياء الحديثة..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المؤلف / المترجم <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: د. أحمد الشمراني"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الردمك (ISBN)</label>
                  <input
                    type="text"
                    required
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف الموضوعي</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BookCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 bg-white"
                  >
                    {BOOK_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموقع بالأرفف</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="مثال: الرف A - القسم العلمي"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">إجمالي النسخ المتوفرة</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  required
                  value={copiesTotal}
                  onChange={(e) => setCopiesTotal(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نبذة عن الكتاب (اختياري)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="موجز عن محتوى الكتاب ومناسبته للمرحلة الدراسية..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBookModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition"
                >
                  {editBook ? 'حفظ التعديلات' : 'إضافة الكتاب للمكتبة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW BORROWING RECORD */}
      {showBorrowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-600" />
                <span>تسجيل استعارة كتاب لطالب</span>
              </h3>
              <button
                onClick={() => setShowBorrowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBorrowing} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختر الكتاب المطلوب <span className="text-rose-500">*</span></label>
                <select
                  value={borrowBookId}
                  onChange={(e) => setBorrowBookId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 bg-white"
                  required
                >
                  {books.map(b => (
                    <option key={b.id} value={b.id} disabled={b.copiesAvailable <= 0}>
                      {b.title} ({b.copiesAvailable} متاح)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختر الطالب المستعير <span className="text-rose-500">*</span></label>
                <select
                  value={borrowStudentId}
                  onChange={(e) => setBorrowStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 bg-white"
                  required
                >
                  {db.students.map(s => {
                    const cls = db.classes.find(c => c.id === s.classId);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({cls?.name || ''}) - {s.academicId}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مدة الاستعارة المقرر</label>
                <select
                  value={borrowDays}
                  onChange={(e) => setBorrowDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 bg-white"
                >
                  <option value={7}>أسبوع واحد (7 أيام)</option>
                  <option value={14}>أسبوعين (14 يوماً - الموصى به)</option>
                  <option value={21}>3 أسابيع (21 يوماً)</option>
                  <option value={30}>شهر كامل (لأبحاث التخرج)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الاستعارة (اختياري)</label>
                <input
                  type="text"
                  value={borrowNotes}
                  onChange={(e) => setBorrowNotes(e.target.value)}
                  placeholder="مثال: استعارة خاصة بمشروع العلوم..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBorrowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>اعتماد وتسجيل الاستعارة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK NOTIFICATION FEEDBACK */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">تم إرسال التنبيهات بنجاح</h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              {notificationFeedback}
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition"
              >
                حسناً، إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library Report Print Preview Modal */}
      <ReportPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        reportTitle="تقرير فهرس المكتبة وحركة الاستعارة المدرسية"
        reportSubtitle={`الفهرسة العلمية والمصادر — جرد ${new Date().toLocaleDateString('ar-SA')}`}
        defaultOrientation="landscape"
      >
        <ActiveReportPrintView activeTab="library" db={db} />
      </ReportPreviewModal>
    </div>
  );
};
