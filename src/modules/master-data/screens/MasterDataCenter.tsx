/**
 * Master Data Center - Main Screen
 * Full-featured enterprise master data management interface
 */
import React, { useState, useEffect } from 'react';
import {
  Database, Search, Filter, Plus, Upload, Download, Printer,
  ChevronLeft, ChevronRight, RotateCcw, Trash2, FileSpreadsheet,
  FileText, Activity, X, Check, AlertTriangle
} from 'lucide-react';
import { MASTER_DATA_CATEGORIES } from '../constants';
import { MasterDataEntity, MasterDataEntityInfo, MasterDataCategory, MasterDataAuditLog } from '../types';
import { useMasterData } from '../hooks/useMasterData';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import { EmptyState } from '../../../components/common/EmptyState';
import { Skeleton } from '../../../components/common/Skeleton';
import { useToast } from '../../../components/common/ToastContext';
import { getEntityFields, generateId } from '../utils';
import { ROOM_TYPE_LABELS, LAB_TYPE_LABELS, PAGE_SIZE_OPTIONS } from '../constants';
import { useMasterDataLookup } from '../hooks/useMasterData';
import { masterDataService } from '../services/masterDataService';

export const MasterDataCenter: React.FC = () => {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<MasterDataEntityInfo | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'data' | 'audit'>('categories');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [importText, setImportText] = useState('');

  // Select entity and switch to data view
  const handleSelectEntity = (entity: MasterDataEntityInfo) => {
    setSelectedEntity(entity);
    setViewMode('data');
  };

  const handleBack = () => {
    setSelectedEntity(null);
    setViewMode('categories');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">مركز البيانات الأساسية</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة وتوحيد البيانات الأساسية للنظام - السنوات الدراسية، الصفوف، المواد، الجغرافيا، الموارد البشرية والمزيد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedEntity && (
            <button
              onClick={() => setShowAuditModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>سجل العمليات</span>
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>استيراد</span>
          </button>
        </div>
      </div>

      {/* View: Categories */}
      {viewMode === 'categories' && (
        <MasterDataCategoriesView
          categories={MASTER_DATA_CATEGORIES}
          onSelectEntity={handleSelectEntity}
        />
      )}

      {/* View: Data Table */}
      {viewMode === 'data' && selectedEntity && (
        <MasterDataTableView
          entityInfo={selectedEntity}
          onBack={handleBack}
        />
      )}

      {/* Audit Modal */}
      {showAuditModal && selectedEntity && (
        <AuditLogModal
          entityType={selectedEntity.entityType}
          onClose={() => setShowAuditModal(false)}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          entityType={selectedEntity?.entityType || 'academic_years'}
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            showToast('تم استيراد البيانات بنجاح', 'success');
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// CATEGORIES VIEW
// ============================================================================
const MasterDataCategoriesView: React.FC<{
  categories: MasterDataCategory[];
  onSelectEntity: (entity: MasterDataEntityInfo) => void;
}> = ({ categories, onSelectEntity }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('academic');

  const toggleCategory = (catId: string) => {
    setExpandedCategory(prev => prev === catId ? null : catId);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Category Tree */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm">تصنيفات البيانات</h3>
            <p className="text-[11px] text-slate-500">اختر تصنيفاً لعرض البيانات</p>
          </div>
          <div className="p-2 space-y-1">
            {categories.map(cat => (
              <div key={cat.id}>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    expandedCategory === cat.id
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <span>{cat.name_ar}</span>
                  <span className="text-slate-400 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">
                    {cat.entities.length}
                  </span>
                </button>
                {expandedCategory === cat.id && (
                  <div className="mr-4 space-y-0.5 mt-1">
                    {cat.entities.map(entity => (
                      <button
                        key={entity.entityType}
                        onClick={() => onSelectEntity(entity)}
                        className="w-full text-right px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all cursor-pointer border border-transparent hover:border-indigo-100"
                      >
                        {entity.nameAr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Entity Cards Grid */}
      <div className="lg:col-span-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map(cat =>
            cat.entities.map(entity => (
              <MasterDataEntityCard
                key={entity.entityType}
                entity={entity}
                onClick={() => onSelectEntity(entity)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ENTITY CARD
// ============================================================================
const MasterDataEntityCard: React.FC<{
  entity: MasterDataEntityInfo;
  onClick: () => void;
}> = ({ entity, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-200 shadow-xs p-5 text-right hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Database className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800 text-sm truncate">{entity.nameAr}</h4>
          <p className="text-[10px] text-slate-400 truncate">{entity.nameEn}</p>
        </div>
        <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{entity.description}</p>
    </button>
  );
};

// ============================================================================
// DATA TABLE VIEW
// ============================================================================
const MasterDataTableView: React.FC<{
  entityInfo: MasterDataEntityInfo;
  onBack: () => void;
}> = ({ entityInfo, onBack }) => {
  const { showToast } = useToast();
  const {
    data, total, totalPages, isLoading, error,
    filter, setSearchQuery, setActiveFilter, goToPage,
    selectedIds, toggleSelection, toggleSelectAll, hasSelection, selectedCount,
    showForm, editRecord, openCreateForm, openEditForm, closeForm,
    handleCreate, handleUpdate,
    showDeleteConfirm, setShowDeleteConfirm, handleDelete, handleBulkDelete,
    exportData, refetch
  } = useMasterData(entityInfo.entityType);

  const fields = getEntityFields(entityInfo.entityType);
  const { records: parentRecords } = useMasterDataLookup(
    entityInfo.parentEntity || '',
    true
  );

  const handleExport = async (format: 'excel' | 'csv') => {
    const { data: records, fileName } = await exportData(format);
    const headers = ['id', 'code', 'name_ar', 'name_en', 'description', 'is_active', 'display_order'];
    const csvContent = [
      headers.join(','),
      ...records.map(r => headers.map(h => `"${(r as any)[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`تم تصدير ${records.length} سجل بنجاح`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>رجوع</span>
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1" />
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{entityInfo.nameAr}</h3>
            <p className="text-[10px] text-slate-400">{total} سجل</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasSelection && (
            <button
              onClick={() => setShowDeleteConfirm('bulk')}
              className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف المحدد ({selectedCount})</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="طباعة"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="تصدير CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="تصدير Excel"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateForm}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة جديد</span>
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400" />
          <input
            type="text"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`بحث في ${entityInfo.nameAr}... (كود، اسم عربي، اسم إنجليزي، وصف)`}
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => setActiveFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">الكل</option>
            <option value="1">نشط فقط</option>
            <option value="0">غير نشط</option>
          </select>
          <button
            onClick={() => { setSearchQuery(''); refetch(); }}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <Skeleton variant="rectangular" className="h-8 w-full" count={6} />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <EmptyState
          type="error"
          title="خطأ في تحميل البيانات"
          description={error}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && data.length === 0 && (
        <EmptyState
          type="data"
          title={`لا توجد بيانات في ${entityInfo.nameAr}`}
          description={`لم يتم إضافة أي سجلات بعد. يمكنك البدء بإضافة سجل جديد.`}
          actionLabel="إضافة جديد"
          onAction={openCreateForm}
        />
      )}

      {/* Data Table */}
      {!isLoading && !error && data.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === data.length && data.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="py-3 px-4">الكود</th>
                  <th className="py-3 px-4">الاسم (عربي)</th>
                  <th className="py-3 px-4">الاسم (إنجليزي)</th>
                  <th className="py-3 px-4">الوصف</th>
                  {entityInfo.hasParent && <th className="py-3 px-4">{entityInfo.parentLabel}</th>}
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">ترتيب</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((record: any) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        onChange={() => toggleSelection(record.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 text-[11px]">
                      {record.code}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{record.name_ar}</td>
                    <td className="py-3 px-4 text-slate-500">{record.name_en || '-'}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">
                      {record.description || '-'}
                    </td>
                    {entityInfo.hasParent && (
                      <td className="py-3 px-4 text-slate-600">
                        {record[`${entityInfo.parentEntity}_name`] ||
                         parentRecords.find((p: any) => p.id === record[entityInfo.parentField || ''] as any)?.name_ar || '-'}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      {record.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          <Check className="w-3 h-3" /> نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 font-bold text-[10px]">
                          <X className="w-3 h-3" /> غير نشط
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                      {record.display_order}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditForm(record)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                          title="تعديل"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(record.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              إجمالي {total} سجل - صفحة {filter.page || 1} من {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage((filter.page || 1) - 1)}
                disabled={(filter.page || 1) <= 1}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-bold text-slate-700">{filter.page || 1}</span>
              <button
                onClick={() => goToPage((filter.page || 1) + 1)}
                disabled={(filter.page || 1) >= totalPages}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Form Modal */}
      {showForm && (
        <MasterDataFormModal
          entityInfo={entityInfo}
          editRecord={editRecord}
          onClose={closeForm}
          onSave={async (data) => {
            if (editRecord) {
              const result = await handleUpdate(data);
              if (result.success) showToast('تم تحديث السجل بنجاح', 'success');
              else result.errors.forEach(e => showToast(e.message, 'error'));
            } else {
              const result = await handleCreate(data);
              if (result.success) showToast('تم إضافة السجل بنجاح', 'success');
              else result.errors.forEach(e => showToast(e.message, 'error'));
            }
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm !== null}
        title={`حذف من ${entityInfo.nameAr}`}
        message={showDeleteConfirm === 'bulk'
          ? `هل أنت متأكد من حذف ${selectedCount} سجل؟`
          : 'هل أنت متأكد من حذف هذا السجل؟'}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={async () => {
          if (showDeleteConfirm === 'bulk') {
            await handleBulkDelete();
            showToast(`تم حذف ${selectedCount} سجل`, 'info');
          } else if (showDeleteConfirm) {
            await handleDelete(showDeleteConfirm);
            showToast('تم حذف السجل', 'info');
          }
          setShowDeleteConfirm(null);
        }}
        onCancel={() => setShowDeleteConfirm(null)}
      />
    </div>
  );
};

// ============================================================================
// CRUD FORM MODAL
// ============================================================================
const MasterDataFormModal: React.FC<{
  entityInfo: MasterDataEntityInfo;
  editRecord: any | null;
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ entityInfo, editRecord, onClose, onSave }) => {
  const fields = getEntityFields(entityInfo.entityType);
  const { records: parentOptions } = useMasterDataLookup(
    entityInfo.parentEntity || '',
    false
  );

  const [formData, setFormData] = useState<any>(() => {
    if (editRecord) return { ...editRecord };
    const initial: any = { is_active: 1, display_order: 0 };
    fields.forEach(f => {
      if (f.type === 'select' && f.name.includes('_id')) {
        initial[f.name] = '';
      }
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev: any) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    fields.filter(f => f.required).forEach(f => {
      if (!formData[f.name] || (typeof formData[f.name] === 'string' && !formData[f.name].trim())) {
        newErrors[f.name] = `${f.label} مطلوب`;
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            {editRecord ? `تعديل - ${editRecord.name_ar}` : `إضافة إلى ${entityInfo.nameAr}`}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(field => {
              if (field.type === 'select' && field.name.includes('_id') && entityInfo.parentEntity) {
                return (
                  <div key={field.name}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- اختر {field.label} --</option>
                      {parentOptions.map((opt: any) => (
                        <option key={opt.id} value={opt.id}>{opt.name_ar}</option>
                      ))}
                    </select>
                    {errors[field.name] && <p className="text-[10px] text-red-500 mt-0.5">{errors[field.name]}</p>}
                  </div>
                );
              }
              if (field.type === 'select' && field.options) {
                return (
                  <div key={field.name}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- اختر --</option>
                      {field.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              if (field.type === 'textarea') {
                return (
                  <div key={field.name} className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
                    <textarea
                      rows={2}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                );
              }
              if (field.type === 'checkbox') {
                return (
                  <div key={field.name} className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id={field.name}
                      checked={Boolean(formData[field.name])}
                      onChange={(e) => handleChange(field.name, e.target.checked ? 1 : 0)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={field.name} className="text-xs font-semibold text-slate-700 cursor-pointer">
                      {field.label}
                    </label>
                  </div>
                );
              }
              return (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                    min={field.min}
                    max={field.max}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  {errors[field.name] && <p className="text-[10px] text-red-500 mt-0.5">{errors[field.name]}</p>}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {editRecord ? 'حفظ التعديلات' : 'إضافة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// AUDIT LOG MODAL
// ============================================================================
const AuditLogModal: React.FC<{
  entityType: string;
  onClose: () => void;
}> = ({ entityType, onClose }) => {
  const [logs, setLogs] = useState<MasterDataAuditLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await masterDataService.getAuditLogs(entityType, 30);
        if (!cancelled) setLogs(data);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityType]);

  const actionLabels: Record<string, { label: string; color: string }> = {
    CREATE: { label: 'إضافة', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    UPDATE: { label: 'تعديل', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    DELETE: { label: 'حذف', color: 'text-red-600 bg-red-50 border-red-200' },
    IMPORT: { label: 'استيراد', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    EXPORT: { label: 'تصدير', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    PRINT: { label: 'طباعة', color: 'text-slate-600 bg-slate-50 border-slate-200' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <span>سجل العمليات</span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            type="data"
            title="لا توجد عمليات مسجلة"
            description="لم يتم تسجيل أي عمليات بعد على هذه البيانات."
          />
        ) : (
          <div className="space-y-2">
            {logs.map((log: any) => {
              const actionInfo = actionLabels[log.action] || { label: log.action, color: 'text-slate-600 bg-slate-50' };
              return (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${actionInfo.color}`}>
                      {actionInfo.label}
                    </span>
                    <span className="text-xs text-slate-700">{log.performed_by}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{log.performed_at}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// IMPORT MODAL
// ============================================================================
const ImportModal: React.FC<{
  entityType: string;
  onClose: () => void;
  onImported: () => void;
}> = ({ entityType, onClose, onImported }) => {
  const { showToast } = useToast();
  const [importText, setImportText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImport = async () => {
    setIsProcessing(true);
    try {
      // Parse CSV-like input
      const lines = importText.trim().split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        showToast('الرجاء إدخال بيانات صالحة (رأس + صفوف)', 'error');
        setIsProcessing(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: Record<string, any> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || null;
        });
        return row;
      });

      const result = await masterDataService.importData(entityType, rows);
      showToast(`تم استيراد ${result.success} سجل بنجاح، فشل ${result.failed}`, 
        result.failed > 0 ? 'warning' : 'success');
      if (result.errors.length > 0) {
        result.errors.forEach(e => showToast(e, 'error'));
      }
      onImported();
    } catch (err: any) {
      showToast(`خطأ في الاستيراد: ${err.message}`, 'error');
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            <span>استيراد بيانات</span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          الصق البيانات بتنسيق CSV. السطر الأول يجب أن يكون رؤوس الأعمدة (code, name_ar, name_en, description, ...)
        </p>

        <textarea
          rows={8}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="code,name_ar,name_en,description&#10;GRD-01,الصف الأول,Grade 1,الصف الأول الابتدائي&#10;GRD-02,الصف الثاني,Grade 2,الصف الثاني الابتدائي"
          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
          dir="ltr"
        />

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handleImport}
            disabled={isProcessing || !importText.trim()}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'جاري الاستيراد...' : 'استيراد'}
          </button>
        </div>
      </div>
    </div>
  );
};

