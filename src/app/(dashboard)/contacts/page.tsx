'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserPlus, 
  Upload, 
  Search, 
  Trash2, 
  Edit2, 
  Tag, 
  FileSpreadsheet, 
  FolderPlus, 
  ShieldAlert, 
  ShieldCheck, 
  Download, 
  CheckSquare, 
  Square, 
  X, 
  Plus, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ArrowRight,
  Filter,
  MoreHorizontal,
  ChevronDown,
  UserCheck,
  UserMinus,
  RotateCcw,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { formatPhoneDisplay, formatPhoneNumber, normalizePhone } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');

  // Multi-select for bulk actions
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);

  // Bulk Assign to Group Modal
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignGroupId, setBulkAssignGroupId] = useState<string>('');

  // Quick Search & Auto-Suggest
  const [suggestResults, setSuggestResults] = useState<any[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestDropdown, setShowSuggestDropdown] = useState(false);
  const [addingContactId, setAddingContactId] = useState<string | null>(null);
  const [syncingContactId, setSyncingContactId] = useState<string | null>(null);
  const [syncedSuccessIds, setSyncedSuccessIds] = useState<string[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
    isBlacklisted: false,
    groupIds: [] as string[],
    customFields: [] as Array<{ key: string; value: string }>,
  });

  // Group Form State
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    color: '#10b981',
  });

  // Import Wizard State
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4>(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTargetGroup, setImportTargetGroup] = useState<string>('');
  const [importNewGroupName, setImportNewGroupName] = useState<string>('');
  const [excelRawHeaders, setExcelRawHeaders] = useState<string[]>([]);
  const [excelRawRows, setExcelRawRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Contacts
  const loadContacts = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (selectedGroup) query.append('groupId', selectedGroup);

      const res = await fetch(`/api/contacts?${query.toString()}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Kişiler yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Groups
  const loadGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (Array.isArray(data)) {
        setGroups(data);
      }
    } catch (err) {
      console.error('Gruplar yüklenirken hata:', err);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [search, selectedGroup]);

  useEffect(() => {
    loadGroups();
  }, []);

  // Debounced Auto-Suggest Search (Searches across all contacts)
  useEffect(() => {
    const query = search.trim();
    if (query.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          setSuggestLoading(true);
          const res = await fetch(`/api/contacts?search=${encodeURIComponent(query)}&limit=10`);
          const data = await res.json();
          setSuggestResults(data.contacts || []);
          setShowSuggestDropdown(true);
        } catch (err) {
          console.error('Öneri arama hatası:', err);
        } finally {
          setSuggestLoading(false);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSuggestResults([]);
      setShowSuggestDropdown(false);
    }
  }, [search]);

  // Click outside and escape key listener for auto-suggest
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSuggestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Quick Add Contact to Group
  const handleQuickAddContactToGroup = async (contact: any, groupId: string) => {
    if (!groupId) return;
    try {
      setAddingContactId(contact.id);
      const res = await fetch('/api/groups/add-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id, groupId }),
      });
      const data = await res.json();
      if (res.ok) {
        const groupObj = groups.find((g) => g.id === groupId);
        showToast(`"${contact.name}" ${groupObj ? `"${groupObj.name}"` : ''} grubuna başarıyla eklendi.`, 'success');

        // Optimistically update suggest item
        setSuggestResults((prev) =>
          prev.map((c) => {
            if (c.id === contact.id) {
              const currentGroups = c.groups || [];
              const exists = currentGroups.some((cg: any) => (cg.groupId || cg.group?.id) === groupId);
              if (!exists) {
                return {
                  ...c,
                  groups: [...currentGroups, { groupId, group: groupObj || { id: groupId, name: 'Grup' } }],
                };
              }
            }
            return c;
          })
        );

        loadGroups();
        loadContacts();
      } else {
        showToast(data.error || 'Gruba eklenirken hata oluştu.', 'error');
      }
    } catch (err: any) {
      showToast('Hata: ' + err.message, 'error');
    } finally {
      setAddingContactId(null);
    }
  };

  // Open Add/Edit Contact Modal
  const handleOpenContactModal = (contact?: any) => {
    if (contact) {
      setEditingContact(contact);
      const parts = (contact.name || '').split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      const customArr: Array<{ key: string; value: string }> = [];
      if (contact.customFields && typeof contact.customFields === 'object') {
        for (const [k, v] of Object.entries(contact.customFields)) {
          customArr.push({ key: k, value: String(v) });
        }
      }

      setContactForm({
        firstName,
        lastName,
        phone: contact.phone || '',
        email: contact.email || '',
        notes: contact.notes || '',
        isBlacklisted: Boolean(contact.isBlacklisted),
        groupIds: contact.groups?.map((g: any) => g.groupId || g.group?.id).filter(Boolean) || [],
        customFields: customArr,
      });
    } else {
      setEditingContact(null);
      setContactForm({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        notes: '',
        isBlacklisted: false,
        groupIds: selectedGroup ? [selectedGroup] : [],
        customFields: [
          { key: 'Firma', value: '' },
          { key: 'Şehir', value: '' },
        ],
      });
    }
    setShowContactModal(true);
  };

  // Save Contact (Create or Update)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fullName = `${contactForm.firstName.trim()} ${contactForm.lastName.trim()}`.trim();
      const customObj: Record<string, any> = {};
      contactForm.customFields.forEach((cf) => {
        if (cf.key.trim()) {
          customObj[cf.key.trim()] = cf.value.trim();
        }
      });

      const payload = {
        name: fullName || `Kişi ${contactForm.phone.slice(-4)}`,
        phone: contactForm.phone,
        email: contactForm.email || undefined,
        notes: contactForm.notes || undefined,
        isBlacklisted: contactForm.isBlacklisted,
        groupIds: contactForm.groupIds,
        customFields: customObj,
      };

      let res;
      if (editingContact) {
        res = await fetch(`/api/contacts/${editingContact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setShowContactModal(false);
        loadContacts();
        loadGroups();
      } else {
        alert(data.error || 'İşlem başarısız oldu.');
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  // Sync Single Contact with WhatsApp
  const handleSyncSingleContact = async (contactId: string) => {
    try {
      setSyncingContactId(contactId);
      const res = await fetch('/api/contacts/sync-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.contact) {
          setContacts((prev) =>
            prev.map((c) => (c.id === contactId ? { ...c, ...data.contact } : c))
          );
        }
        setSyncedSuccessIds((prev) => [...prev, contactId]);
        setTimeout(() => {
          setSyncedSuccessIds((prev) => prev.filter((id) => id !== contactId));
        }, 3000);
        showToast(
          data.updatedFields?.name || data.updatedFields?.avatar
            ? `WhatsApp verileri güncellendi: ${data.contact?.name || ''}`
            : 'WhatsApp verisi çekildi (Kişi bilgileri zaten güncel).'
        );
      } else {
        showToast(data.error || 'WhatsApp verisi çekilemedi.', 'error');
      }
    } catch (err: any) {
      showToast('Senkronizasyon hatası: ' + err.message, 'error');
    } finally {
      setSyncingContactId(null);
    }
  };

  // Bulk Sync all Contacts from WhatsApp
  const handleSyncAllWhatsAppContacts = async () => {
    try {
      setIsSyncingAll(true);
      showToast('WhatsApp rehberi taranıyor ve senkronize ediliyor...', 'success');
      const res = await fetch('/api/contacts/sync', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'WhatsApp kişileri başarıyla senkronize edildi.');
        await loadContacts();
        await loadGroups();
      } else {
        showToast(data.error || 'WhatsApp senkronizasyon hatası.', 'error');
      }
    } catch (err: any) {
      showToast('Senkronizasyon hatası: ' + err.message, 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Delete Single Contact
  const handleDeleteContact = async (id: string) => {
    if (!confirm('Bu kişiyi rehberden silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadContacts();
        loadGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk Delete Selected Contacts
  const handleBulkDelete = async () => {
    if (selectedContactIds.length === 0) return;
    if (!confirm(`Seçili ${selectedContactIds.length} kişiyi rehberden silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedContactIds }),
      });
      if (res.ok) {
        setSelectedContactIds([]);
        loadContacts();
        loadGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk Assign Selected Contacts to Group
  const handleBulkAssignGroup = async () => {
    if (!bulkAssignGroupId || selectedContactIds.length === 0) return;
    try {
      const res = await fetch(`/api/groups/${bulkAssignGroupId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContactIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowBulkAssignModal(false);
        setSelectedContactIds([]);
        loadContacts();
        loadGroups();
      } else {
        alert(data.error || 'Gruba eklenemedi.');
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  // Bulk Remove Selected Contacts from Current Filtered Group
  const handleBulkRemoveFromGroup = async () => {
    if (!selectedGroup || selectedContactIds.length === 0) return;
    if (!confirm(`Seçili ${selectedContactIds.length} kişiyi bu gruptan çıkarmak istediğinize emin misiniz? (Kişiler rehberde kalacaktır)`)) return;
    try {
      const res = await fetch(`/api/groups/${selectedGroup}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContactIds }),
      });
      if (res.ok) {
        setSelectedContactIds([]);
        loadContacts();
        loadGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Group Create/Edit Modal
  const handleOpenGroupModal = (group?: any) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        description: group.description || '',
        color: group.color || '#10b981',
      });
    } else {
      setEditingGroup(null);
      setGroupForm({
        name: '',
        description: '',
        color: '#10b981',
      });
    }
    setShowGroupModal(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (editingGroup) {
        res = await fetch(`/api/groups/${editingGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupForm),
        });
      } else {
        res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupForm),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setShowGroupModal(false);
        loadGroups();
      } else {
        alert(data.error || 'Grup kaydedilemedi.');
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Bu grubu silmek istediğinize emin misiniz? Gruptaki kişilerin rehber kaydı kesinlikle silinmez.')) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedGroup === groupId) setSelectedGroup('');
        loadGroups();
        loadContacts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetAllGroups = async () => {
    if (!confirm('DİKKAT: Veritabanındaki tüm gruplar silinecek ve grup listesi 0 olarak sıfırlanacaktır. Kişilerinizin rehber kayıtları KORUNACAKTIR. Onaylıyor musunuz?')) return;
    try {
      const res = await fetch('/api/admin/reset-groups', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSelectedGroup('');
        loadGroups();
        loadContacts();
        alert(data.message || 'Tüm gruplar başarıyla sıfırlandı.');
      } else {
        alert(data.error || 'Gruplar sıfırlanamadı.');
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  // Export Contacts to Excel
  const handleExportExcel = (groupId?: string) => {
    const url = groupId 
      ? `/api/contacts/export?groupId=${encodeURIComponent(groupId)}` 
      : selectedGroup 
        ? `/api/contacts/export?groupId=${encodeURIComponent(selectedGroup)}` 
        : `/api/contacts/export`;
    window.open(url, '_blank');
  };

  // Import Wizard File Selected
  const handleFileDropOrSelect = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        file = e.dataTransfer.files[0];
      }
    } else if (e.target.files && e.target.files[0]) {
      file = e.target.files[0];
    }

    if (!file) return;
    setImportFile(file);

    const name = file.name.toLowerCase();
    if (name.endsWith('.vcf') || name.endsWith('.vcard')) {
      setImportStep(3);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const firstSheet = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheet];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (json.length > 0) {
          const headers = Object.keys(json[0]);
          setExcelRawHeaders(headers);
          setExcelRawRows(json.slice(0, 5));

          let guessedName = '';
          let guessedPhone = '';
          let guessedEmail = '';
          let guessedNotes = '';

          headers.forEach((h) => {
            const lh = h.toLowerCase().trim();
            if (['ad', 'isim', 'ad soyad', 'name', 'full name', 'fullname', 'müşteri'].includes(lh)) guessedName = h;
            if (['tel', 'telefon', 'phone', 'gsm', 'mobile', 'cep', 'numara'].includes(lh)) guessedPhone = h;
            if (['email', 'e-posta', 'eposta', 'mail'].includes(lh)) guessedEmail = h;
            if (['not', 'notes', 'açıklama'].includes(lh)) guessedNotes = h;
          });

          setColumnMapping({
            name: guessedName || headers[0] || '',
            phone: guessedPhone || headers[1] || headers[0] || '',
            email: guessedEmail || '',
            notes: guessedNotes || '',
          });

          setImportStep(2);
        } else {
          alert('Seçilen dosyada veri satırı bulunamadı.');
        }
      } catch (err: any) {
        alert('Dosya okunurken hata oluştu: ' + err.message);
      }
    } else {
      alert('Lütfen geçerli bir .xlsx, .xls, .csv veya .vcf dosyası seçin.');
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!importFile) return;
    try {
      setImportLoading(true);
      setImportResult(null);

      const name = importFile.name.toLowerCase();

      if (name.endsWith('.vcf') || name.endsWith('.vcard')) {
        const formData = new FormData();
        formData.append('file', importFile);
        if (importTargetGroup) formData.append('groupId', importTargetGroup);
        if (importNewGroupName) formData.append('newGroupName', importNewGroupName);

        const res = await fetch('/api/contacts/import', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        setImportResult(data);
      } else {
        const buffer = await importFile.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const firstSheet = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheet];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const mappedContacts = rows.map((row) => {
          const rawName = columnMapping.name ? String(row[columnMapping.name] || '').trim() : '';
          const rawPhone = columnMapping.phone ? String(row[columnMapping.phone] || '').trim() : '';
          const rawEmail = columnMapping.email ? String(row[columnMapping.email] || '').trim() : '';
          const rawNotes = columnMapping.notes ? String(row[columnMapping.notes] || '').trim() : '';

          const customFields: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            if (k !== columnMapping.name && k !== columnMapping.phone && k !== columnMapping.email && k !== columnMapping.notes) {
              const val = String(row[k] || '').trim();
              if (val) customFields[k] = val;
            }
          });

          return {
            name: rawName,
            phone: rawPhone,
            email: rawEmail || undefined,
            notes: rawNotes || undefined,
            customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
          };
        });

        const res = await fetch('/api/contacts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contacts: mappedContacts,
            groupId: importTargetGroup || undefined,
            newGroupName: importNewGroupName || undefined,
          }),
        });

        const data = await res.json();
        setImportResult(data);
      }

      setImportStep(4);
      loadContacts();
      loadGroups();
    } catch (err: any) {
      alert('İçe aktarma hatası: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const selectedGroupObj = groups.find((g) => g.id === selectedGroup);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#111b21] to-[#14232c] border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Özel Grup & CRM Mimarisi
            </span>
            <span className="text-xs text-gray-400">{total} Kayıtlı Kişi</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Özel Grup & Kişi Yönetimi</h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Kendi özel müşteri segmentlerinizi oluşturun, Excel/vCard ile aktarın, kişileri güvenle gruplayın.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 🔄 WhatsApp'tan Kişileri Çek */}
          <button
            type="button"
            onClick={handleSyncAllWhatsAppContacts}
            disabled={isSyncingAll}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-xs font-bold border border-[#25D366]/35 transition-all shadow-md cursor-pointer disabled:opacity-50"
            title="WhatsApp hattınızdaki tüm kişileri ve sohbetleri WhatsPulse'a aktar"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Kişiler Çekiliyor...' : "WhatsApp'tan Kişileri Çek"}</span>
          </button>

          <button
            onClick={() => handleExportExcel()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-gray-300 hover:text-white text-xs font-semibold border border-gray-700 transition-all shadow-md"
            title="Tüm kişileri Excel olarak indir"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Excel Dışa Aktar</span>
          </button>

          <button
            onClick={() => {
              setImportStep(1);
              setImportFile(null);
              setImportResult(null);
              setShowImportWizard(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-all shadow-md"
          >
            <Upload className="w-4 h-4" />
            <span>İçe Aktar (Excel/vCard)</span>
          </button>

          <button
            onClick={() => handleOpenContactModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yeni Kişi Ekle</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        {/* Left Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'contacts'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-[#111b21] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tüm Kişiler ({total})</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'groups'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-[#111b21] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Özel Gruplar ({groups.length})</span>
          </button>
        </div>

        {/* Right Search & Filter (Only on contacts tab) */}
        {activeTab === 'contacts' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Group Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="appearance-none bg-[#111b21] border border-gray-800 rounded-xl px-3.5 py-2 pr-8 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="">Tüm Gruplar ({groups.length})</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g._count?.contacts || 0} Kişi)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Search Input with Auto-Suggest Dropdown */}
            <div className="relative" ref={searchContainerRef}>
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="İsim, telefon, e-posta ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => {
                  if (search.trim().length >= 2) setShowSuggestDropdown(true);
                }}
                className="bg-[#111b21] border border-gray-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-all w-52 sm:w-72"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
                  title="Aramayı Temizle"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Floating Auto-Suggest Results Dropdown */}
              {showSuggestDropdown && search.trim().length >= 2 && (
                <div className="absolute top-full right-0 w-80 sm:w-96 mt-2 bg-[#1f2c34] border border-gray-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-md animate-fade-in divide-y divide-gray-800">
                  <div className="px-3.5 py-2.5 bg-[#111b21] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        {selectedGroupObj
                          ? `"${selectedGroupObj.name}" Grubuna Ekle`
                          : 'Rehberde Hızlı Arama'}
                      </span>
                    </div>
                    {suggestLoading ? (
                      <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                    ) : (
                      <span className="text-[10px] text-gray-500 font-medium">
                        {suggestResults.length} kişi
                      </span>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-800/60 custom-scrollbar">
                    {suggestResults.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        {suggestLoading ? 'Aranıyor...' : 'Eşleşen kişi bulunamadı.'}
                      </div>
                    ) : (
                      suggestResults.map((c) => {
                        const isInSelectedGroup = selectedGroup
                          ? (c.groups || []).some(
                              (cg: any) => (cg.groupId || cg.group?.id) === selectedGroup
                            )
                          : false;

                        return (
                          <div
                            key={c.id}
                            className="p-3 hover:bg-[#2a3942]/60 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs flex-shrink-0">
                                {c.name ? c.name.charAt(0).toUpperCase() : '#'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                  <span className="truncate">{c.name}</span>
                                  {c.isBlacklisted && (
                                    <span className="text-[9px] text-red-400 bg-red-500/10 px-1 py-0.2 rounded border border-red-500/20">
                                      Kara Liste
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-400 font-mono">
                                  {formatPhoneDisplay(c.phone)}
                                </div>
                                {/* Group Badges */}
                                {c.groups && c.groups.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {c.groups.slice(0, 2).map((cg: any, idx: number) => (
                                      <span
                                        key={idx}
                                        className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-gray-800 text-gray-300 border border-gray-700"
                                      >
                                        {cg.group?.name || 'Grup'}
                                      </span>
                                    ))}
                                    {c.groups.length > 2 && (
                                      <span className="text-[9px] text-gray-500">
                                        +{c.groups.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            {selectedGroup ? (
                              isInSelectedGroup ? (
                                <span className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800/80 border border-gray-700 text-gray-400 text-[11px] font-semibold cursor-default">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Bu Grupta</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddContactToGroup(c, selectedGroup)}
                                  disabled={addingContactId === c.id}
                                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                  {addingContactId === c.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                  )}
                                  <span>Gruba Ekle</span>
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpenContactModal(c);
                                  setShowSuggestDropdown(false);
                                }}
                                className="flex-shrink-0 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs"
                                title="Kişiyi Düzenle"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Group Filter Banner */}
      {activeTab === 'contacts' && selectedGroupObj && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedGroupObj.color || '#10b981' }} />
            <span className="text-xs font-bold text-white">
              Grup Filtresi: <span className="text-emerald-400">{selectedGroupObj.name}</span>
            </span>
            <span className="text-[11px] text-gray-400">({total} kişi listeleniyor)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportExcel(selectedGroupObj.id)}
              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <Download className="w-3 h-3" /> Grubu Excel İndir
            </button>
            <button
              onClick={() => setSelectedGroup('')}
              className="p-1 rounded text-gray-400 hover:text-white text-xs"
              title="Filtreyi Temizle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar (When items selected) */}
      {activeTab === 'contacts' && selectedContactIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#202c33] border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>{selectedContactIds.length} kişi seçildi</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Gruba Ekle */}
            <button
              onClick={() => {
                setBulkAssignGroupId(groups[0]?.id || '');
                setShowBulkAssignModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-semibold"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Gruba Ata</span>
            </button>

            {/* Gruptan Çıkar (Filtreli gruptaysa) */}
            {selectedGroup && (
              <button
                onClick={handleBulkRemoveFromGroup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-semibold"
                title="Kişileri bu gruptan çıkarır ancak rehberden silmez"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Bu Gruptan Çıkar</span>
              </button>
            )}

            {/* Rehberden Sil */}
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Rehberden Sil</span>
            </button>

            <button
              onClick={() => setSelectedContactIds([])}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'contacts' ? (
        /* Contacts Table View */
        <div className="bg-[#111b21] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-[#14232c]/60 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="p-4 w-10 text-center">
                    <button
                      onClick={() => {
                        if (selectedContactIds.length === contacts.length) {
                          setSelectedContactIds([]);
                        } else {
                          setSelectedContactIds(contacts.map((c) => c.id));
                        }
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      {selectedContactIds.length === contacts.length && contacts.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Kişi Bilgisi</th>
                  <th className="p-4">Telefon Numarası</th>
                  <th className="p-4">Dahil Olduğu Gruplar</th>
                  <th className="p-4">Özel Değişkenler</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-400">
                      Yükleniyor...
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-gray-400 space-y-4">
                      <Users className="w-12 h-12 text-gray-600 mx-auto" />
                      <p className="text-base font-bold text-white">Henüz Kayıtlı Kişi Bulunamadı</p>
                      <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                        {search || selectedGroup 
                          ? 'Filtrelemenize uygun kişi bulunamadı.' 
                          : 'Bağlı WhatsApp hattınızdaki tüm kişileri anında içeri aktarabilir veya Excel / vCard dosyanızla toplu yükleme yapabilirsiniz.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleSyncAllWhatsAppContacts}
                          disabled={isSyncingAll}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
                          <span>{isSyncingAll ? 'WhatsApp Taranıyor...' : "WhatsApp'tan Kişileri Çek"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setImportStep(1);
                            setImportFile(null);
                            setImportResult(null);
                            setShowImportWizard(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-all cursor-pointer"
                        >
                          <Upload className="w-4 h-4" /> Excel / vCard Yükle
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenContactModal()}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" /> Yeni Kişi Ekle
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => {
                    const isSelected = selectedContactIds.includes(c.id);
                    const customObj = (c.customFields && typeof c.customFields === 'object') ? c.customFields : {};
                    const customEntries = Object.entries(customObj);

                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-[#162229] transition-colors ${
                          isSelected ? 'bg-emerald-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setSelectedContactIds(selectedContactIds.filter((id) => id !== c.id));
                              } else {
                                setSelectedContactIds([...selectedContactIds, c.id]);
                              }
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Name & Avatar */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {c.avatar ? (
                              <img
                                src={c.avatar}
                                alt={c.name}
                                className="w-9 h-9 rounded-xl object-cover border border-emerald-500/30 shrink-0"
                                onError={(e: any) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                                {c.name?.slice(0, 2).toUpperCase() || 'K'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                                <span>{c.name}</span>
                                {c.avatar && (
                                  <span className="text-[10px] text-emerald-400 font-mono" title="WhatsApp Profili Doğrulandı">✓</span>
                                )}
                              </div>
                              {c.email && (
                                <div className="text-[11px] text-gray-400 truncate">{c.email}</div>
                              )}
                              {c.notes && (
                                <div className="text-[10px] text-gray-500 truncate max-w-xs">{c.notes}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="p-4 font-mono font-semibold text-emerald-400">
                          {formatPhoneDisplay(c.phone)}
                        </td>

                        {/* Groups */}
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {c.groups && c.groups.length > 0 ? (
                              c.groups.map((g: any) => (
                                <span
                                  key={g.groupId || g.group?.id}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                                  style={{
                                    backgroundColor: `${g.group?.color || '#10b981'}15`,
                                    borderColor: `${g.group?.color || '#10b981'}40`,
                                    color: g.group?.color || '#10b981',
                                  }}
                                >
                                  {g.group?.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-gray-500">-</span>
                            )}
                          </div>
                        </td>

                        {/* Custom Fields */}
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {customEntries.length > 0 ? (
                              customEntries.slice(0, 3).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="px-1.5 py-0.5 rounded bg-gray-800 text-[10px] text-gray-300 border border-gray-700 truncate"
                                >
                                  <span className="text-gray-500 font-semibold">{k}:</span> {String(v)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-gray-600">-</span>
                            )}
                            {customEntries.length > 3 && (
                              <span className="text-[10px] text-gray-500">+{customEntries.length - 3}</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          {c.isBlacklisted ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1 w-fit">
                              <ShieldAlert className="w-3 h-3" /> Kara Liste
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 w-fit">
                              <ShieldCheck className="w-3 h-3" /> Aktif
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 🔄 WhatsApp Verisini Çek / Kişiyi Güncelle */}
                            <button
                              type="button"
                              onClick={() => handleSyncSingleContact(c.id)}
                              disabled={syncingContactId === c.id}
                              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
                                syncedSuccessIds.includes(c.id)
                                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm'
                                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25'
                              }`}
                              title="Bu Kişiyi Güncelle / WhatsApp Verisini Çek"
                            >
                              {syncingContactId === c.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                                  <span className="text-[10px]">Çekiliyor</span>
                                </>
                              ) : syncedSuccessIds.includes(c.id) ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span className="text-[10px]">Güncellendi</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3" />
                                  <span className="text-[10px]">Kişiyi Güncelle</span>
                                </>
                              )}
                            </button>

                            {/* 💬 Doğrudan Sohbet Başlat */}
                            <Link
                              href={`/chat?phone=${encodeURIComponent(c.phone)}`}
                              className="p-2 rounded-xl text-[#d4af37] hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors"
                              title="Canlı Sohbet Başlat / Mesaj Gönder"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Link>

                            {/* ✏️ Düzenle */}
                            <button
                              type="button"
                              onClick={() => handleOpenContactModal(c)}
                              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
                              title="Düzenle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* 🗑️ Rehberden Sil */}
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(c.id)}
                              className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Rehberden Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Groups Cards View */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Özel Müşteri Segmentleri & Gruplar</h2>
              <p className="text-xs text-gray-400">
                Oluşturduğunuz gruplar rehber kişilerini bağımsız şekilde segmentlere ayırır.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {groups.length > 0 && (
                <button
                  onClick={handleResetAllGroups}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold"
                  title="Tüm grupları sıfırla (Kişiler rehberde kalır)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tüm Grupları Sıfırla</span>
                </button>
              )}

              <button
                onClick={() => handleOpenGroupModal()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Yeni Özel Grup Oluştur</span>
              </button>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="p-12 text-center bg-[#111b21] border border-gray-800 rounded-3xl space-y-3 shadow-xl">
              <Layers className="w-12 h-12 text-emerald-500/40 mx-auto" />
              <h3 className="text-base font-bold text-white">Henüz hiç özel grup oluşturulmadı (0 Grup)</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                Müşterilerinizi &quot;VIP Müşteriler&quot;, &quot;Yalova Bölgesi&quot;, &quot;Asansör Bakım&quot; gibi segmentlere ayırmak için yeni özel grup oluşturabilir veya Excel dosyanızı yüklerken otomatik grup tanımlayabilirsiniz.
              </p>
              <button
                onClick={() => handleOpenGroupModal()}
                className="mt-3 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
              >
                <FolderPlus className="w-4 h-4" /> İlk Özel Grubu Oluştur
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((g) => {
                const count = g._count?.contacts || 0;
                return (
                  <div
                    key={g.id}
                    className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 flex flex-col justify-between hover:border-emerald-500/40 transition-all group shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: g.color || '#10b981' }}
                          />
                          <h3 className="text-base font-bold text-white truncate">{g.name}</h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
                          {count} Kişi
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed min-h-[32px]">
                        {g.description || 'Özel müşteri grubu'}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          setSelectedGroup(g.id);
                          setActiveTab('contacts');
                        }}
                        className="text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>Kişileri Listele</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleExportExcel(g.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                          title="Excel İndir"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          onClick={() => handleOpenGroupModal(g)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(g.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Grubu Sil (Kişiler silinmez)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. Add / Edit Contact Modal */}
      {/* ========================================================================= */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                {editingContact ? 'Kişiyi Düzenle' : 'Yeni CRM Kişisi Ekle'}
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              {/* Ad & Soyad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Ad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ahmet"
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Soyad</label>
                  <input
                    type="text"
                    placeholder="Yılmaz"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Telefon & E-Posta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Telefon Numarası *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0535 123 45 67 veya +905..."
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  {contactForm.phone && (
                    <div className="text-[10px] text-emerald-400 mt-1 font-mono">
                      Format: {formatPhoneDisplay(contactForm.phone)}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">E-Posta</label>
                  <input
                    type="email"
                    placeholder="ahmet@example.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Grup Seçimi (Multi-Select) */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Dahil Olduğu Gruplar
                </label>
                <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[#202c33]/50 border border-gray-700">
                  {groups.length === 0 ? (
                    <span className="text-xs text-gray-500">Henüz özel grup oluşturulmamış.</span>
                  ) : (
                    groups.map((g) => {
                      const isChecked = contactForm.groupIds.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setContactForm({
                                ...contactForm,
                                groupIds: contactForm.groupIds.filter((id) => id !== g.id),
                              });
                            } else {
                              setContactForm({
                                ...contactForm,
                                groupIds: [...contactForm.groupIds, g.id],
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-[#111b21] text-gray-400 border-gray-800 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color || '#10b981' }} />
                          <span>{g.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Dinamik Özel Alanlar / Değişkenler (JSON key/value) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">
                    Özel Değişkenler (Şablonlarda &#123;etiket&#125; olarak kullanılır)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setContactForm({
                        ...contactForm,
                        customFields: [...contactForm.customFields, { key: '', value: '' }],
                      });
                    }}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Değişken Ekle
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {contactForm.customFields.map((cf, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Örn: Firma, Borç, Şehir"
                        value={cf.key}
                        onChange={(e) => {
                          const updated = [...contactForm.customFields];
                          updated[idx].key = e.target.value;
                          setContactForm({ ...contactForm, customFields: updated });
                        }}
                        className="w-1/3 bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder="Değer (Örn: ABC Ltd, 500 TL)"
                        value={cf.value}
                        onChange={(e) => {
                          const updated = [...contactForm.customFields];
                          updated[idx].value = e.target.value;
                          setContactForm({ ...contactForm, customFields: updated });
                        }}
                        className="flex-1 bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = contactForm.customFields.filter((_, i) => i !== idx);
                          setContactForm({ ...contactForm, customFields: updated });
                        }}
                        className="p-2 text-gray-500 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Özel Notlar</label>
                <textarea
                  rows={2}
                  placeholder="Müşteri hakkında özel açıklamalar..."
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Durum (Kara Liste Toggle) */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#202c33]/50 border border-gray-700">
                <div>
                  <span className="text-xs font-bold text-white block">Kara Liste (Opt-Out Durumu)</span>
                  <span className="text-[10px] text-gray-400">
                    Açık olduğunda toplu mesaj kampanyalarında mesaj gönderilmez.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={contactForm.isBlacklisted}
                  onChange={(e) => setContactForm({ ...contactForm, isBlacklisted: e.target.checked })}
                  className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-rose-500 focus:ring-rose-500 cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/20"
                >
                  {editingContact ? 'Değişiklikleri Kaydet' : 'Kişiyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Group Create / Edit Modal */}
      {/* ========================================================================= */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-400" />
                {editingGroup ? 'Grubu Düzenle' : 'Yeni Özel Grup Oluştur'}
              </h3>
              <button
                onClick={() => setShowGroupModal(false)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Grup Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: VIP Müşteriler, Asansör Bakım, Yalova Bölgesi"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  placeholder="Bu grubun amacı veya kapsamı..."
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Renk Etiketi</label>
                <div className="flex items-center gap-2">
                  {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setGroupForm({ ...groupForm, color: c })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        groupForm.color === c ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/20"
                >
                  {editingGroup ? 'Güncelle' : 'Grup Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Bulk Assign to Group Modal */}
      {/* ========================================================================= */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                Seçili Kişileri Gruba Ata
              </h3>
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 mb-4">
              Seçtiğiniz <span className="text-emerald-400 font-bold">{selectedContactIds.length} kişiyi</span> aşağıdaki gruba bağlayın:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Hedef Grup</label>
                <select
                  value={bulkAssignGroupId}
                  onChange={(e) => setBulkAssignGroupId(e.target.value)}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g._count?.contacts || 0} Kişi)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkAssignModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleBulkAssignGroup}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg"
                >
                  Gruba Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Excel / CSV / vCard Import Wizard Modal */}
      {/* ========================================================================= */}
      {showImportWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Toplu Kişi İçe Aktarma Sihirbazı
              </h3>
              <button
                onClick={() => setShowImportWizard(false)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-6 px-4">
              {[
                { s: 1, title: 'Dosya Yükle' },
                { s: 2, title: 'Sütun Eşle' },
                { s: 3, title: 'Hedef Grup' },
                { s: 4, title: 'Sonuç' },
              ].map((st) => (
                <div key={st.s} className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      importStep >= st.s
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {st.s}
                  </span>
                  <span
                    className={`text-xs font-semibold hidden sm:inline ${
                      importStep >= st.s ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1: File Dropzone */}
            {importStep === 1 && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDropOrSelect}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 hover:border-emerald-500/60 rounded-3xl p-8 text-center cursor-pointer bg-[#202c33]/30 hover:bg-[#202c33]/60 transition-all"
                >
                  <Upload className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-white">
                    Dosyanızı buraya sürükleyin veya seçin
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Desteklenen formatlar: <span className="text-emerald-400 font-mono">.xlsx, .xls, .csv, .vcf</span>
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.vcf,.vcard"
                    onChange={handleFileDropOrSelect}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Column Mapping Wizard (For Excel/CSV) */}
            {importStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">
                  Excel tablonuzdaki sütunları WhatsPulse CRM alanlarıyla eşleştirin:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#202c33]/40 p-4 rounded-2xl border border-gray-800">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Ad Soyad Sütunu *
                    </label>
                    <select
                      value={columnMapping.name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                      className="w-full bg-[#111b21] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {excelRawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Telefon Numarası Sütunu *
                    </label>
                    <select
                      value={columnMapping.phone}
                      onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                      className="w-full bg-[#111b21] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {excelRawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      E-Posta Sütunu (Opsiyonel)
                    </label>
                    <select
                      value={columnMapping.email}
                      onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                      className="w-full bg-[#111b21] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="">-- Eşleştirme Yapma --</option>
                      {excelRawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Not / Açıklama Sütunu
                    </label>
                    <select
                      value={columnMapping.notes}
                      onChange={(e) => setColumnMapping({ ...columnMapping, notes: e.target.value })}
                      className="w-full bg-[#111b21] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="">-- Eşleştirme Yapma --</option>
                      {excelRawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-semibold text-gray-300"
                  >
                    Geri
                  </button>
                  <button
                    onClick={() => setImportStep(3)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5"
                  >
                    <span>Devam Et</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Target Group Selection */}
            {importStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    İçe Aktarılan Kişileri Bir Gruba Ata
                  </label>
                  <select
                    value={importTargetGroup}
                    onChange={(e) => {
                      setImportTargetGroup(e.target.value);
                      if (e.target.value) setImportNewGroupName('');
                    }}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  >
                    <option value="">-- Herhangi bir gruba atama --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-gray-800"></div>
                  <span className="flex-shrink mx-3 text-gray-500 text-xs">VEYA</span>
                  <div className="flex-grow border-t border-gray-800"></div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Yeni Özel Grup Oluştur ve Otomatik Ata
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 2026 Ağustos Müşteri Listesi"
                    value={importNewGroupName}
                    onChange={(e) => {
                      setImportNewGroupName(e.target.value);
                      if (e.target.value) setImportTargetGroup('');
                    }}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-between gap-2 pt-3">
                  <button
                    onClick={() => setImportStep(excelRawHeaders.length > 0 ? 2 : 1)}
                    className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-semibold text-gray-300"
                  >
                    Geri
                  </button>
                  <button
                    onClick={handleExecuteImport}
                    disabled={importLoading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {importLoading ? 'Aktarılıyor...' : 'İçe Aktarmayı Başlat'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Import Result Report */}
            {importStep === 4 && importResult && (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-white">İçe Aktarma Tamamlandı!</h4>
                <p className="text-xs text-gray-300">{importResult.message}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left pt-2">
                  <div className="p-3 rounded-2xl bg-[#202c33] border border-gray-800">
                    <span className="text-[10px] text-gray-400 block">Yeni Eklenen</span>
                    <span className="text-lg font-bold text-emerald-400">{importResult.addedCount || 0}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#202c33] border border-gray-800">
                    <span className="text-[10px] text-gray-400 block">Güncellenen</span>
                    <span className="text-lg font-bold text-teal-400">{importResult.updatedCount || 0}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#202c33] border border-gray-800">
                    <span className="text-[10px] text-gray-400 block">Mükerrer</span>
                    <span className="text-lg font-bold text-amber-400">{importResult.duplicateInFileCount || 0}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#202c33] border border-gray-800">
                    <span className="text-[10px] text-gray-400 block">Hatalı Numara</span>
                    <span className="text-lg font-bold text-rose-400">{importResult.skippedInvalidCount || 0}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setShowImportWizard(false)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg"
                  >
                    Tamamla ve Listeyi Görüntüle
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/90 border-red-500/50 text-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
