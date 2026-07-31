import React, { useState } from 'react';
import { AppNotification, UserRole } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog, getCurrentUser } from '../lib/db';
import { Bell, CheckCircle2, AlertTriangle, Info, AlertCircle, Check, Trash2, Send, X } from 'lucide-react';

interface NotificationCenterProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose, isModal = false }) => {
  const db = getRealmDB();
  const currentUser = getCurrentUser() || db.users?.[0] || { id: 'u1', name: 'المدير', role: 'admin' as const };
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'danger'>('all');

  // Broadcast form state for admin
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bTitle, setBTitle] = useState('');
  const [bMsg, setBMsg] = useState('');
  const [bTargetRole, setBTargetRole] = useState<'all' | UserRole>('all');
  const [bType, setBType] = useState<'info' | 'warning' | 'success' | 'danger'>('info');

  const myNotifications = db.notifications.filter(n => {
    if (!n.userId && !n.targetRole) return true; // global
    if (n.userId && n.userId === currentUser?.id) return true;
    if (n.targetRole && n.targetRole === currentUser?.role) return true;
    return false;
  }).filter(n => {
    if (filter === 'unread') return !n.isRead;
    return true;
  }).filter(n => {
    if (typeFilter !== 'all') return n.type === typeFilter;
    return true;
  });

  const handleMarkAsRead = (id: string) => {
    const target = db.notifications.find(n => n.id === id);
    if (target) {
      target.isRead = true;
      saveRealmDB(db);
    }
  };

  const handleMarkAllAsRead = () => {
    db.notifications.forEach(n => {
      if (!n.userId && !n.targetRole) n.isRead = true;
      else if (n.userId === currentUser?.id || n.targetRole === currentUser?.role) n.isRead = true;
    });
    saveRealmDB(db);
  };

  const handleDeleteNotification = (id: string) => {
    db.notifications = db.notifications.filter(n => n.id !== id);
    saveRealmDB(db);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTitle.trim() || !bMsg.trim()) return;

    const newN: AppNotification = {
      id: `notif_${Date.now()}`,
      targetRole: bTargetRole === 'all' ? undefined : bTargetRole,
      title: bTitle,
      message: bMsg,
      type: bType,
      isRead: false,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    db.notifications = [newN, ...db.notifications];
    saveRealmDB(db);
    addAuditLog("إرسال تعميم إشعارات", `تم إرسال إشعار جماعي بعنوان (${bTitle}) للفئة (${bTargetRole === 'all' ? 'الجميع' : bTargetRole})`);
    
    setBTitle('');
    setBMsg('');
    setShowBroadcast(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'danger': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBg = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-slate-50 border-slate-200 opacity-80';
    switch (type) {
      case 'success': return 'bg-emerald-50/70 border-emerald-200';
      case 'warning': return 'bg-amber-50/70 border-amber-200';
      case 'danger': return 'bg-red-50/70 border-red-200';
      default: return 'bg-blue-50/70 border-blue-200';
    }
  };

  const content = (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl w-full" dir="rtl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">مركز الإشعارات والتنبيهات الفورية</h3>
            <p className="text-xs text-slate-500">متابعة كافة التعاميم المدرسية، التحديثات، ورصد الغياب والدرجات</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setShowBroadcast(!showBroadcast)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال تعميم جماعي</span>
            </button>
          )}

          <button
            onClick={handleMarkAllAsRead}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>تحديد الكل كمقروء</span>
          </button>

          {isModal && onClose && (
            <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Broadcast Form (Admin Only) */}
      {showBroadcast && (
        <form onSubmit={handleSendBroadcast} className="mb-6 p-5 rounded-2xl bg-blue-50/50 border border-blue-200 animate-in fade-in duration-200 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <h4 className="font-bold text-sm text-blue-900 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-blue-600" />
              إرسال إشعار أو تعميم إداري جديد
            </h4>
            <button type="button" onClick={() => setShowBroadcast(false)} className="text-xs text-slate-500 hover:text-slate-700">إلغاء</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الفئة المستهدفة</label>
              <select
                value={bTargetRole}
                onChange={(e) => setBTargetRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">لكل المدرسة (كافة المستخدمين)</option>
                <option value="teacher">المعلمين فقط</option>
                <option value="student">الطلاب فقط</option>
                <option value="parent">أولياء الأمور فقط</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">نوع الإشعار</label>
              <select
                value={bType}
                onChange={(e) => setBType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="info">إعلامي عام (أزرق)</option>
                <option value="success">نجاح وتفوق (أخضر)</option>
                <option value="warning">تنبيه مواعيد (أصفر)</option>
                <option value="danger">هام وحرج / غياب (أحمر)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان الإشعار</label>
            <input
              type="text"
              required
              value={bTitle}
              onChange={(e) => setBTitle(e.target.value)}
              placeholder="مثال: موعد اختبارات منتصف الفصل أو دعوة مجلس الآباء"
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">نص الرسالة</label>
            <textarea
              required
              rows={2}
              value={bMsg}
              onChange={(e) => setBMsg(e.target.value)}
              placeholder="اكتب تفاصيل التعميم هنا ليتم إرساله لحظياً لكافة الحسابات المستهدفة..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>بث التعميم فوراً</span>
            </button>
          </div>
        </form>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({db.notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'unread' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            غير المقروءة ({db.notifications.filter(n => !n.isRead).length})
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-semibold">تصنيف حسب النوع:</span>
          {(['all', 'info', 'success', 'warning', 'danger'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                typeFilter === t ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'all' ? 'الكل' : t === 'info' ? 'إعلامي' : t === 'success' ? 'نجاح' : t === 'warning' ? 'تنبيه' : 'حرج/غياب'}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {myNotifications.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30 animate-pulse" />
          <p className="text-sm font-semibold">لا توجد إشعارات مطابقة حالياً</p>
          <p className="text-xs text-slate-500 mt-1">سوف تظهر هنا أي تنبيهات تخص رصد الدرجات، الغياب، والتعاميم.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {myNotifications.map(notif => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${getBg(notif.type, notif.isRead)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-slate-800">{notif.title}</h4>
                    {!notif.isRead && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase">
                        جديد
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-medium">
                    <span>{notif.createdAt}</span>
                    {notif.targetRole && (
                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">
                        فئة: {notif.targetRole === 'parent' ? 'أولياء الأمور' : notif.targetRole === 'teacher' ? 'المعلمين' : 'الطلاب'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                    title="تحديد كمقروء"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteNotification(notif.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="حذف الإشعار"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
        <div className="max-w-3xl w-full animate-in fade-in zoom-in duration-200">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
