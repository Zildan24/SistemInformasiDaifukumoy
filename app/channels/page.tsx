"use client";

import React, { useState } from "react";
import { useData, Channel, Location } from "../context/DataContext";
import { Share2, MapPin, Plus, Trash2, Edit2, Check, X, Info, ToggleRight, ToggleLeft } from "lucide-react";
import { confirmAction, showSuccess } from "../utils/alert";

export default function ChannelsPage() {
  const { channels, locations, addChannel, updateChannel, deleteChannel, addLocation, updateLocation, deleteLocation } = useData();
  
  // Channel States
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [channelForm, setChannelForm] = useState<{ name: string; description: string; hasSubLocation: boolean; status: "active" | "inactive" }>({ name: "", description: "", hasSubLocation: false, status: "active" });

  // Location States
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState<{ name: string; address: string; channelId: string; status: "active" | "inactive" }>({ name: "", address: "", channelId: "", status: "active" });

  // Filter
  const [activeTab, setActiveTab] = useState<"channels" | "locations">("channels");

  const handleChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChannel) {
      updateChannel(editingChannel.id, channelForm);
      showSuccess("Diperbarui!", "Kanal berhasil diperbarui.");
    } else {
      addChannel(channelForm);
      showSuccess("Berhasil!", "Kanal baru telah ditambahkan.");
    }
    setIsChannelModalOpen(false);
    setEditingChannel(null);
    setChannelForm({ name: "", description: "", hasSubLocation: false, status: "active" });
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      updateLocation(editingLocation.id, locationForm);
      showSuccess("Diperbarui!", "Lokasi berhasil diperbarui.");
    } else {
      addLocation(locationForm);
      showSuccess("Berhasil!", "Lokasi baru telah ditambahkan.");
    }
    setIsLocationModalOpen(false);
    setEditingLocation(null);
    setLocationForm({ name: "", address: "", channelId: "", status: "active" });
  };

  const getStatusBadge = (status: string) => (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {status === 'active' ? 'Aktif' : 'Non-Aktif'}
    </span>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-quicksand">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              <Share2 className="text-[#FF65C5]" /> Manajemen Kanal
            </h2>
            <img src="/happy1.png" alt="mochi" className="h-8 w-auto animate-bounce" />
          </div>
          <p className="text-gray-500 font-medium">Kelola jalur distribusi dan titik fisik penjualan Daifukumoy.</p>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => setActiveTab("channels")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "channels" ? "bg-[#FF65C5] text-white shadow-lg shadow-pink-200" : "text-gray-400 hover:text-gray-600"}`}
          >
            Master Kanal
          </button>
          <button 
            onClick={() => setActiveTab("locations")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "locations" ? "bg-[#FF65C5] text-white shadow-lg shadow-pink-200" : "text-gray-400 hover:text-gray-600"}`}
          >
            Lokasi Stand
          </button>
        </div>
      </div>

      {activeTab === "channels" ? (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 uppercase tracking-widest text-xs">
              <Info size={18} className="text-blue-500" /> Daftar Jalur Distribusi (Parent)
            </h3>
            <button 
              onClick={() => { setIsChannelModalOpen(true); setEditingChannel(null); }}
              className="bg-[#FF65C5] hover:bg-[#FF4DA3] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-pink-100"
            >
              <Plus size={18} /> Tambah Kanal
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Kanal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub-Lokasi</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {channels.map(channel => (
                  <tr key={channel.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-800">{channel.name}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-gray-500 line-clamp-1">{channel.description}</p>
                    </td>
                    <td className="px-6 py-5">
                      {channel.hasSubLocation ? (
                        <span className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                          <Check size={14} /> Wajib Pilih
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs font-medium">Tidak Ada</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {getStatusBadge(channel.status)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingChannel(channel); setChannelForm(channel); setIsChannelModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={async () => {
                            const confirmed = await confirmAction("Hapus Kanal?", "Semua data lokasi di bawahnya juga akan hilang.");
                            if (confirmed) deleteChannel(channel.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 uppercase tracking-widest text-xs">
              <MapPin size={18} className="text-red-500" /> Rincian Titik Lokasi (Child)
            </h3>
            <button 
              onClick={() => { setIsLocationModalOpen(true); setEditingLocation(null); }}
              className="bg-[#FF65C5] hover:bg-[#FF4DA3] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-pink-100"
            >
              <Plus size={18} /> Tambah Lokasi
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Lokasi</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kanal Induk</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Alamat</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {locations.map(loc => {
                  const parentChannel = channels.find(c => c.id === loc.channelId);
                  return (
                    <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="font-bold text-gray-800">{loc.name}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold">
                          {parentChannel?.name || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm text-gray-500">{loc.address}</p>
                      </td>
                      <td className="px-6 py-5">
                        {getStatusBadge(loc.status)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingLocation(loc); setLocationForm(loc); setIsLocationModalOpen(true); }}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={async () => {
                              const confirmed = await confirmAction("Hapus Lokasi?", "Data ini tidak dapat dikembalikan.");
                              if (confirmed) deleteLocation(loc.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
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

      {/* Channel Modal */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleChannelSubmit}>
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-[#FF65C5]/5">
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                  {editingChannel ? "Edit Kanal" : "Kanal Baru"}
                </h3>
                <button type="button" onClick={() => setIsChannelModalOpen(false)} className="text-gray-400 hover:text-red-500 p-2 transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Kanal</label>
                  <input 
                    type="text" required value={channelForm.name} onChange={e => setChannelForm({...channelForm, name: e.target.value})}
                    placeholder="Contoh: Reseller, Stand, Bazaar"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-pink-50 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Deskripsi Jalur</label>
                  <textarea 
                    required value={channelForm.description} onChange={e => setChannelForm({...channelForm, description: e.target.value})}
                    placeholder="Penjelasan jalur distribusi..."
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-pink-50 outline-none transition-all font-medium h-24"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div>
                    <p className="text-sm font-bold text-blue-800">Wajibkan Sub-Lokasi?</p>
                    <p className="text-[10px] text-blue-600">Aktifkan jika kanal memiliki banyak titik fisik.</p>
                  </div>
                  <button 
                    type="button" onClick={() => setChannelForm({...channelForm, hasSubLocation: !channelForm.hasSubLocation})}
                    className="text-blue-500 hover:scale-110 transition-transform"
                  >
                    {channelForm.hasSubLocation ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Status Operasional</label>
                  <select 
                    value={channelForm.status} onChange={e => setChannelForm({...channelForm, status: e.target.value as any})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Non-Aktif</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-4 bg-[#FF65C5] hover:bg-[#FF4DA3] text-white font-bold rounded-2xl shadow-lg shadow-pink-200 transition-all mt-4">
                  Simpan Kanal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleLocationSubmit}>
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-[#FF65C5]/5">
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                  {editingLocation ? "Edit Lokasi" : "Lokasi Baru"}
                </h3>
                <button type="button" onClick={() => setIsLocationModalOpen(false)} className="text-gray-400 hover:text-red-500 p-2 transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Titik Lokasi</label>
                  <input 
                    type="text" required value={locationForm.name} onChange={e => setLocationForm({...locationForm, name: e.target.value})}
                    placeholder="Contoh: Stand ITG, Stand Kerkof"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-pink-50 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Kanal Induk (Parent)</label>
                  <select 
                    required value={locationForm.channelId} onChange={e => setLocationForm({...locationForm, channelId: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                  >
                    <option value="">-- Pilih Kanal --</option>
                    {channels.filter(c => c.hasSubLocation).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Alamat Lengkap</label>
                  <input 
                    type="text" required value={locationForm.address} onChange={e => setLocationForm({...locationForm, address: e.target.value})}
                    placeholder="Jl. Raya No. 123, Garut..."
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-pink-50 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Status Lokasi</label>
                  <select 
                    value={locationForm.status} onChange={e => setLocationForm({...locationForm, status: e.target.value as any})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Non-Aktif</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-4 bg-[#FF65C5] hover:bg-[#FF4DA3] text-white font-bold rounded-2xl shadow-lg shadow-pink-200 transition-all mt-4">
                  Simpan Lokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}
