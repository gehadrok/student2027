import React, { useState } from 'react';
import { getCurrentUser, getRealmDB } from '../lib/db';
import { askAIChatAssistant } from '../lib/ai-client';
import { Sparkles, Send, X, Bot, User as UserIcon, MessageSquare, ArrowRight, HelpCircle } from 'lucide-react';

interface AIChatAssistantProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  model?: string;
}

export const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
  isOpen = false,
  onClose,
  onOpen
}) => {
  const currentUser = getCurrentUser();
  const db = getRealmDB();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `مرحباً بك يا ${currentUser?.name || 'صديقي'} في المساعد الذكي لمدرسة خالد ابن الوليد الضالع/جحاف! 🎓✨ كيف يمكنني إفادتك اليوم؟ يمكنك سؤالي عن مواعيد الجدول، أو الاستعلام عن الدرجات، أو تفاصيل الأقساط والرسوم، أو أنظمة الغياب والحضور.`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      model: 'Gemini AI Assistant'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    "ما هي مواعيد الدوام والحصص في المدرسة؟",
    "كيف أطلع على شهادات وكشوف درجات الأبناء؟",
    "ما هي تعليمات سداد الرسوم الدراسية المتبقية؟",
    "ما هي سياسة احتساب الغياب والأعذار الطبية؟"
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const result = await askAIChatAssistant(
        query,
        currentUser?.role || 'guest',
        currentUser?.name || 'مستخدم',
        {
          schoolName: db.settings.schoolName,
          academicYear: db.settings.academicYear,
          term: db.settings.currentTerm,
          classesCount: db.classes.length,
          studentsCount: db.students.length
        }
      );

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: result.reply,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        model: result.aiModel
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'ai',
          text: "عذراً، حدث خطأ مؤقت أثناء معالجة الاستفسار. يرجى المحاولة لاحقاً.",
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onOpen}
        className="fixed bottom-6 left-6 z-40 p-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer group border-2 border-white/20 animate-bounce print:hidden"
        title="المساعد الذكي وتحليل الأداء"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-bold text-xs px-0 group-hover:px-1">
          مساعد السلام (AI)
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-black/60 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none print:hidden" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 w-full sm:w-[420px] h-[85vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 p-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm">مساعد مدرسة خالد ابن الوليد الذكي</h3>
                <span className="px-1.5 py-0.2 bg-white text-amber-900 font-extrabold text-[10px] rounded-full">AI</span>
              </div>
              <p className="text-[11px] text-amber-100/90 mt-0.5">يجيب عن استفسارات الطلاب وأولياء الأمور</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-black/10 hover:bg-black/20 text-white transition-colors cursor-pointer"
            title="إغلاق المساعد"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Question Chips */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 shrink-0 overflow-x-auto flex gap-2">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-full bg-slate-800 hover:bg-amber-600/30 hover:border-amber-500/50 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3 h-3 text-amber-400" />
              <span>{q}</span>
            </button>
          ))}
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/60">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                m.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              }`}>
                {m.sender === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[78%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-xs'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-xs shadow-xs'
              }`}>
                <p className="whitespace-pre-line">{m.text}</p>
                <div className={`flex items-center justify-between gap-3 mt-2 text-[10px] ${
                  m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                }`}>
                  <span>{m.timestamp}</span>
                  {m.model && <span className="text-amber-400/80 font-mono text-[9px]">⚡ {m.model}</span>}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center animate-spin">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="animate-pulse font-medium">المساعد الذكي يقوم بصياغة الإجابة...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اسأل المساعد الذكي عن أي خدمة أو موعد مدرسي..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-1.5">
            <span className="text-[10px] text-slate-500">مدعوم بتقنيات الذكاء الاصطناعي (Gemini AI Engine)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
