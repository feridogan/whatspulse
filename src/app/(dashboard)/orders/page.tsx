"use client";

import React, { useState, useEffect } from "react";
import { 
  Receipt, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Eye, 
  X, 
  FileText, 
  RefreshCw, 
  Building, 
  ExternalLink,
  DollarSign
} from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "Domain & Hosting Yenileme Teklifi",
    subscriberId: "",
    domainId: "",
    amount: 350,
    currency: "TL",
    status: "PENDING",
    validUntil: "",
    notes: "Fiyatlarımıza KDV dahildir. İşbu teklif 15 gün süreyle geçerlidir."
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordRes, subRes, domRes] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/subscribers?limit=200"),
        fetch("/api/domains")
      ]);
      const ordData = await ordRes.json();
      const subData = await subRes.json();
      const domData = await domRes.json();
      if (ordData.success) setOrders(ordData.orders || []);
      if (subData.success) setSubscribers(subData.subscribers || []);
      if (domData.success) setDomains(domData.domains || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewOrder = () => {
    const fifteenDaysLater = new Date();
    fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);
    setFormData({
      title: "Domain & Hosting Yenileme Teklifi",
      subscriberId: subscribers[0]?.id || "",
      domainId: domains[0]?.id || "",
      amount: 350,
      currency: "TL",
      status: "PENDING",
      validUntil: fifteenDaysLater.toISOString().split("T")[0],
      notes: "Fiyatlarımıza KDV dahildir. İşbu teklif 15 gün süreyle geçerlidir."
    });
    setShowModal(true);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        loadData();
      } else {
        alert(data.error || "Hata oluştu.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async (id: string, num: string) => {
    if (!confirm(`"${num}" numaralı siparişi/teklifi silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 text-xs font-bold border border-teal-500/30">
              Fatura & Teklif Modülü
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">Sipariş & Teklif Yönetimi</h1>
          <p className="text-xs text-gray-400">
            Müşterileriniz için domain yenileme, hosting ve SSL teklifleri oluşturun, PDF ve yazdırma çıktısı alın.
          </p>
        </div>

        <button
          onClick={handleOpenNewOrder}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>+ Yeni Teklif / Sipariş Hazırla</span>
        </button>
      </div>

      {/* Orders List Table */}
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Siparişler listeleniyor...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Receipt className="w-12 h-12 mx-auto opacity-30 text-amber-400" />
            <h3 className="text-sm font-bold text-gray-300">Henüz Teklif/Sipariş Oluşturulmadı</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Yukarıdaki butonu kullanarak müşterinize özel domain yenileme teklifi hazırlayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#16222b] text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Teklif No</th>
                  <th className="py-3 px-4">Başlık / Açıklama</th>
                  <th className="py-3 px-4">Müşteri / Abone</th>
                  <th className="py-3 px-4">İlişkili Domain</th>
                  <th className="py-3 px-4">Tutar</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-sans">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#16222b]/50 transition-colors">
                    {/* Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {ord.orderNumber}
                    </td>

                    {/* Title */}
                    <td className="py-3.5 px-4 font-bold text-white">
                      {ord.title}
                    </td>

                    {/* Subscriber */}
                    <td className="py-3.5 px-4">
                      {ord.subscriber ? (
                        <div>
                          <div className="font-semibold text-white">{ord.subscriber.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{ord.subscriber.phone}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">-</span>
                      )}
                    </td>

                    {/* Domain */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                      {ord.domain ? ord.domain.name : <span className="text-gray-500">-</span>}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-mono font-black text-amber-300 text-sm">
                      {ord.amount} {ord.currency}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        ord.status === "PAID" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        ord.status === "CONFIRMED" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        ord.status === "CANCELLED" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                        "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                        {ord.status === "PENDING" ? "Beklemede" : ord.status === "PAID" ? "Ödendi" : ord.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewOrder(ord)}
                          className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-all cursor-pointer"
                          title="Önizle & Yazdır"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteOrder(ord.id, ord.orderNumber)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Yeni Teklif / Sipariş Formu</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Teklif Başlığı *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Müşteri / Abone</label>
                  <select
                    value={formData.subscriberId}
                    onChange={(e) => setFormData({ ...formData, subscriberId: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">(Seçiniz)</option>
                    {subscribers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">İlişkili Domain</label>
                  <select
                    value={formData.domainId}
                    onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="">(Seçilmedi)</option>
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Tutar (TL) *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Geçerlilik Tarihi</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Teklif Notu & Şartlar</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {saving ? "Kaydediliyor..." : "Teklifi Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order / Offer Printable Preview Modal */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-white text-gray-900 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Print Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black text-lg">
                  DTS
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900">Domain Takip & İletişim Sistemi</h2>
                  <p className="text-xs text-gray-500">Resmi Hizmet & Yenileme Teklifi</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold font-mono text-gray-900">{previewOrder.orderNumber}</div>
                <div className="text-[11px] text-gray-500">Tarih: {new Date(previewOrder.createdAt).toLocaleDateString("tr-TR")}</div>
              </div>
            </div>

            {/* Subscriber & Domain Info */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs">
              <div>
                <div className="text-gray-500 font-semibold mb-1">MÜŞTERİ BİLGİLERİ</div>
                <div className="font-bold text-gray-900 text-sm">{previewOrder.subscriber?.name || "Sayın Müşterimiz"}</div>
                {previewOrder.subscriber?.company && <div>{previewOrder.subscriber.company}</div>}
                <div className="font-mono text-gray-600">{previewOrder.subscriber?.phone}</div>
                <div>{previewOrder.subscriber?.email}</div>
              </div>

              <div>
                <div className="text-gray-500 font-semibold mb-1">HİZMET DETAYLARI</div>
                <div className="font-bold text-gray-900">{previewOrder.title}</div>
                {previewOrder.domain && (
                  <div className="font-mono text-emerald-700 font-bold mt-1">Domain: {previewOrder.domain.name}</div>
                )}
                <div className="text-gray-500 mt-1">
                  Son Geçerlilik: {new Date(previewOrder.validUntil || Date.now()).toLocaleDateString("tr-TR")}
                </div>
              </div>
            </div>

            {/* Items / Summary */}
            <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 font-bold">
                <tr>
                  <th className="p-3">Hizmet / Açıklama</th>
                  <th className="p-3 text-right">Süre</th>
                  <th className="p-3 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="p-3 font-semibold">{previewOrder.title}</td>
                  <td className="p-3 text-right font-mono">1 Yıl</td>
                  <td className="p-3 text-right font-mono font-bold text-sm">
                    {previewOrder.amount} {previewOrder.currency}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={2} className="p-3 text-right">Genel Toplam (KDV Dahil):</td>
                  <td className="p-3 text-right font-mono text-base text-amber-600">
                    {previewOrder.amount} {previewOrder.currency}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Notes */}
            {previewOrder.notes && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>Teklif Notu:</strong> {previewOrder.notes}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-xs font-bold text-gray-800"
              >
                Kapat
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Teklifi Yazdır / PDF İndir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
