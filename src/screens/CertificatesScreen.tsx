import React, { useState } from 'react';
import { Student } from '../types';
import { getRealmDB } from '../lib/db';
import { ReportPreviewModal } from '../components/ReportPreviewModal';
import { Award, Printer, Download, Search, CheckCircle2, Star, Shield, Sparkles, BookOpen, Calendar, UserCheck } from 'lucide-react';

export const CertificatesScreen: React.FC = () => {
  const db = getRealmDB();
  const [students] = useState<Student[]>(db.students);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(db.students[0]?.id || 's1');
  const [certType, setCertType] = useState<'appreciation' | 'report-card'>('report-card');
  const [term, setTerm] = useState('الفصل الدراسي الأول 2026/2027');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const stuGrades = db.grades.filter(g => g.studentId === selectedStudent?.id);
  const stuAtt = db.attendance.filter(a => a.studentId === selectedStudent?.id);
  const totalAtt = stuAtt.length;
  const presentAtt = stuAtt.filter(a => a.status === 'present').length;
  const attPct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 98;

  // Calculate Average GPA
  const totalMax = stuGrades.reduce((sum, g) => sum + g.maxScore, 0);
  const totalObtained = stuGrades.reduce((sum, g) => sum + g.score, 0);
  const averagePct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 94;

  const getClassName = (cid: string) => db.classes.find(c => c.id === cid)?.name || cid;
  const getSectionName = (sid: string) => db.sections.find(sec => sec.id === sid)?.name || sid;

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header (hidden on print) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">منظومة الشهادات الأكاديمية وكشوف العلامات الرسمية</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إصدار شهادات التفوق وكشوف الدرجات الفصلية مختومة ومعتمدة مع إمكانية الطباعة الفورية
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة أو تصدير PDF رسمي</span>
        </button>
      </div>

      {/* Control Panel (hidden on print) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">اختر الطالب</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none w-56"
            >
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academicId})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">نوع الشهادة / التقرير</label>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCertType('report-card')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  certType === 'report-card' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                كشف علامات فصلي 📜
              </button>
              <button
                type="button"
                onClick={() => setCertType('appreciation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  certType === 'appreciation' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                شهادة شكر وتفوق 🏆
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">الفصل الأكاديمي</label>
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 outline-none w-64"
          />
        </div>
      </div>

      {/* CERTIFICATE PREVIEW / PRINTABLE AREA */}
      {selectedStudent && (
        <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-xl p-8 md:p-12 max-w-4xl mx-auto relative overflow-hidden print:shadow-none print:border-none print:p-0 print:w-full">
          {/* Ornamental border frame for printing */}
          <div className="absolute inset-3 border-4 border-double border-amber-600/40 rounded-2xl pointer-events-none hidden md:block print:block" />
          
          {/* School Header */}
          <div className="flex items-center justify-between pb-6 border-b-2 border-slate-200 mb-8 relative z-10">
            <div className="text-right">
              <h3 className="font-black text-lg text-slate-900">الجمهورية اليمنية - وزارة التربية والتعليم</h3>
              <p className="font-bold text-sm text-blue-800 mt-0.5">{db.settings?.schoolName || "مدرسة خالد ابن الوليد الضالع/جحاف"}</p>
              <span className="text-xs text-slate-500 font-mono">الرمز المدرسي: KHL-9082 | الاعتماد الرسمي</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 font-black text-2xl border-2 border-amber-300">
                🏫
              </div>
              <span className="text-[10px] font-bold text-amber-700 mt-1">{db.settings?.schoolName || "مدرسة خالد ابن الوليد الضالع/جحاف"}</span>
            </div>

            <div className="text-left font-mono text-xs text-slate-600 space-y-1">
              <div>التاريخ: {new Date().toISOString().substring(0, 10)}</div>
              <div>الرقم الأكاديمي: <strong className="text-slate-900">{selectedStudent.academicId}</strong></div>
              <div>الحالة: <span className="text-emerald-700 font-bold">منتظم ومعتمد</span></div>
            </div>
          </div>

          {/* Title Area */}
          <div className="text-center my-8 relative z-10">
            <span className="inline-block px-4 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 font-bold text-xs tracking-wide mb-2">
              وثيقة رسمية صادرة عن السجلات الرقمية المعتمدة
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {certType === 'report-card' ? 'كشف الدرجات والتقييم الأكاديمي الفصلي' : 'شهادة شكر وتقدير للتفوق العلمي'}
            </h1>
            <p className="text-sm font-semibold text-slate-600 mt-1.5">{term}</p>
          </div>

          {/* Student Info Box */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 relative z-10 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">اسم الطالب الرباعي</span>
              <strong className="text-sm font-black text-slate-900">{selectedStudent?.name || 'طالب'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">الصف والشعبة</span>
              <strong className="text-slate-800 font-bold">{selectedStudent ? `${getClassName(selectedStudent.classId)} - ${getSectionName(selectedStudent.sectionId)}` : '—'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">مواظبة الحضور</span>
              <strong className="text-emerald-700 font-black">{attPct}% ({presentAtt} يوم حضور)</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">المعدل العام التراكمي</span>
              <strong className="text-blue-700 font-black text-sm">{averagePct}% ({averagePct >= 90 ? 'ممتاز مرتفع' : averagePct >= 80 ? 'جيد جداً' : 'جيد'})</strong>
            </div>
          </div>

          {/* Content Based on Type */}
          {certType === 'report-card' ? (
            <div className="space-y-6 relative z-10">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>تفصيل درجات المواد الدراسية المقررة:</span>
              </h4>

              <table className="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="py-3 px-4 border-l border-slate-800">المادة الدراسية</th>
                    <th className="py-3 px-4 border-l border-slate-800 text-center">نوع التقييم</th>
                    <th className="py-3 px-4 border-l border-slate-800 text-center">الدرجة المكتسبة</th>
                    <th className="py-3 px-4 border-l border-slate-800 text-center">الدرجة العظمى</th>
                    <th className="py-3 px-4 border-l border-slate-800 text-center">التقدير الفني</th>
                    <th className="py-3 px-4">ملاحظة أستاذ المقرر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {stuGrades.map((g, i) => {
                    const subName = db.subjects.find(x => x.id === g.subjectId)?.name || g.subjectId;
                    const p = Math.round((g.score / g.maxScore) * 100);
                    return (
                      <tr key={g.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-3 px-4 font-bold text-slate-900 border-l border-slate-200">{subName}</td>
                        <td className="py-3 px-4 text-center border-l border-slate-200 font-medium">{g.type === 'final' ? 'اختبار نهائي' : 'منتصف الفصل / كويز'}</td>
                        <td className="py-3 px-4 text-center font-black text-blue-700 text-sm border-l border-slate-200">{g.score}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-500 border-l border-slate-200">{g.maxScore}</td>
                        <td className="py-3 px-4 text-center border-l border-slate-200">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            p >= 90 ? 'bg-emerald-100 text-emerald-800' : p >= 75 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p >= 90 ? 'ممتاز' : p >= 80 ? 'جيد جداً' : p >= 70 ? 'جيد' : 'مقبول'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{g.teacherNotes || 'أداء مستقر'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 px-6 text-center space-y-6 bg-amber-50/30 rounded-2xl border border-amber-200 relative z-10 my-4">
              <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center text-4xl shadow-md border-2 border-amber-300 animate-bounce">
                👑
              </div>
              <p className="text-base text-slate-800 leading-relaxed font-bold max-w-2xl mx-auto">
                تتشرف إدارة ({db.settings?.schoolName || "مدرسة خالد ابن الوليد الضالع/جحاف"}) بأن تتقدم بخالص الشكر وجزيل التقدير إلى الطالب/ة:
                <br />
                <span className="text-2xl font-black text-blue-800 block my-2">{selectedStudent?.name || ''}</span>
                وذلك تقديراً لتفوقه العلمي الملحوظ وحصوله على معدل تراكمي قدره <span className="text-emerald-700 underline">{averagePct}%</span>، مع التزامه المثالي بالأخلاق ومواظبة الحضور خلال {term}.
              </p>
              <div className="text-xs font-semibold text-slate-500">
                متمنين له دوام التقدم والنجاح واعتلاء منصات التتويج محلياً ودولياً.
              </div>
            </div>
          )}

          {/* Footer Signatures and Seals */}
          <div className="mt-12 pt-8 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-center relative z-10">
            <div>
              <span className="text-xs font-bold text-slate-500 block">رائد الفصل الدراسي</span>
              <div className="h-12 flex items-center justify-center font-serif italic text-slate-400 text-sm">
                (توقيع معتمد إلكترونياً)
              </div>
              <strong className="text-xs text-slate-800">أ. مشرف الشؤون الأكاديمية</strong>
            </div>

            <div className="flex flex-col items-center justify-center">
              {/* Seal simulation */}
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-blue-800/40 flex items-center justify-center text-center p-2 transform -rotate-12 bg-blue-50/50 shadow-inner">
                <div className="text-[9px] font-black text-blue-900 leading-tight">
                  الختم الرسمي
                  <br />
                  مدرسة خالد ابن الوليد
                  <br />
                  🇾🇪 الضالع/جحاف 🇾🇪
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 block">مدير عام المدرسة</span>
              <div className="h-12 flex items-center justify-center font-serif font-bold text-slate-700 text-sm">
                إدارة مدرسة خالد ابن الوليد
              </div>
              <strong className="text-xs text-slate-800">مكتب التربية والتعليم - جحاف</strong>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-slate-400 font-mono relative z-10">
            تم استخراج هذه الشهادة عبر المنصة الإلكترونية لمدرسة خالد ابن الوليد الضالع/جحاف. رمز التحقق الإلكتروني: {Math.random().toString(36).substring(2, 10).toUpperCase()}-2026
          </div>
        </div>
      )}

      {/* Print Preview Modal for Certificates */}
      <ReportPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        reportTitle={certType === 'report-card' ? 'كشف الدرجات الأكاديمي المعتمد' : 'شهادة شكر وتقدير للتفوق العلمي'}
        reportSubtitle={`الطالب: ${selectedStudent?.name} — ${term}`}
        defaultOrientation="portrait"
      >
        <div className="space-y-6 text-slate-900">
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-2xl font-black text-slate-900">{certType === 'report-card' ? 'كشف الدرجات والتقييم الأكاديمي الفصلي' : 'شهادة شكر وتقدير للتفوق العلمي'}</h2>
            <p className="text-xs font-bold text-slate-500 mt-1">{term}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-center">
            <div><span className="text-slate-400 block mb-0.5">اسم الطالب</span><strong className="text-slate-900 text-sm">{selectedStudent?.name}</strong></div>
            <div><span className="text-slate-400 block mb-0.5">الصف والشعبة</span><strong className="text-slate-800">{getClassName(selectedStudent?.classId)} - {getSectionName(selectedStudent?.sectionId)}</strong></div>
            <div><span className="text-slate-400 block mb-0.5">مواظبة الحضور</span><strong className="text-emerald-700 font-mono">{attPct}% ({presentAtt} يوم حضور)</strong></div>
            <div><span className="text-slate-400 block mb-0.5">المعدل العام</span><strong className="text-blue-700 font-mono text-sm">{averagePct}% ({averagePct >= 90 ? 'ممتاز مرتفع' : 'جيد جداً'})</strong></div>
          </div>
          {certType === 'report-card' ? (
            <table className="w-full text-right text-xs border border-slate-300 rounded-lg overflow-hidden border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 border border-slate-300">المادة الدراسية</th>
                  <th className="py-2.5 px-3 text-center border border-slate-300">الدرجة المكتسبة</th>
                  <th className="py-2.5 px-3 text-center border border-slate-300">الدرجة العظمى</th>
                  <th className="py-2.5 px-3 text-center border border-slate-300">التقدير الفني</th>
                  <th className="py-2.5 px-3 border border-slate-300">ملاحظة أستاذ المقرر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stuGrades.map((g) => {
                  const subName = db.subjects.find(x => x.id === g.subjectId)?.name || g.subjectId;
                  const p = Math.round((g.score / g.maxScore) * 100);
                  return (
                    <tr key={g.id} className="hover:bg-slate-50 font-medium">
                      <td className="py-2 px-3 font-bold text-slate-900 border border-slate-200">{subName}</td>
                      <td className="py-2 px-3 text-center font-mono font-black text-blue-700 border border-slate-200">{g.score}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600 border border-slate-200">{g.maxScore}</td>
                      <td className="py-2 px-3 text-center border border-slate-200"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">{p >= 90 ? 'ممتاز' : 'جيد جداً'}</span></td>
                      <td className="py-2 px-3 text-slate-600 border border-slate-200">{g.teacherNotes || 'أداء منتظم'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-10 px-6 text-center space-y-4 bg-amber-50/50 rounded-2xl border border-amber-200">
              <p className="text-base text-slate-800 font-bold leading-relaxed">
                تتشرف إدارة ({db.settings?.schoolName || "مدرسة خالد ابن الوليد الضالع/جحاف"}) بأن تتقدم بخالص الشكر والتقدير إلى الطالب/ة <strong className="text-blue-800 text-xl block my-2">{selectedStudent?.name}</strong> وذلك تقديراً لتفوقه العلمي وحصوله على معدل تراكمي قدره <span className="text-emerald-700 font-mono underline">{averagePct}%</span> خلال {term}.
              </p>
            </div>
          )}
        </div>
      </ReportPreviewModal>
    </div>
  );
};
