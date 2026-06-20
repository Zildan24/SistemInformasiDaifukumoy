"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { addDays, format } from "date-fns";
import { supabase } from "../../supabaseClient";
import { useAuth } from "./AuthContext";

// --- Types ---
export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category?: string;
  hpp?: number;
  prices?: Record<string, number>;
  isActive?: boolean;
};

export type Pricing = {
  id: string;
  productId: string;
  channelId: string;
  locationId: string;
  price: number;
};

export type Stock = {
  id: string;
  productId: string;
  location: string;
  quantityActual: number;
  lastUpdated: string;
};

export type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  description: string;
  locationId?: string;
  location?: string;
};

export type PreOrder = {
  id: string;
  resellerId: string;
  resellerName: string;
  resellerPhone?: string;
  productId: string;
  quantity: number;
  pickupDate: string;
  adminNotes?: string;
  status: "menunggu pembayaran" | "pesanan diterima" | "sedang dibuat" | "siap diambil" | "selesai" | "gagal";
  createdAt: string;
  snapToken?: string | null;
};

export type ProductionLog = { id: string; date: string; productId: string; morningProduction: number; soldQuantity: number; realWaste?: number; reusableWaste?: number; canal?: string; subLocation?: string; hppSnapshot?: number; priceSnapshot?: number; };
export type GlobalStockLog = { id: string; date: string; productId: string; type: "in" | "out"; quantity: number; description: string; };
export type StockTransfer = { id: string; date: string; productId: string; quantity: number; destination: string; };
export type RawMaterial = { id: string; name: string; unit: string; minStock: number; currentStock: number; };
export type RawMaterialLog = { id: string; rawMaterialId: string; date: string; type: "in" | "out"; quantity: number; description: string; };
export type Channel = { id: string; name: string; description: string; status: "active" | "inactive"; hasSubLocation: boolean; };
export type Location = { id: string; channelId: string; name: string; address: string; status: "active" | "inactive"; };
export type PromoBanner = { id: string; title: string; subtitle?: string; imageUrl: string; slideOrder: number; isActive: boolean; clickUrl?: string; };
export type ProductionPlan = { id?: string; target_date: string; product_id: string; channel_id: string; location_id?: string | null; avg_past_week_qty: number; target_production_qty: number; is_finalized: boolean; created_at?: string; };

type DataContextType = {
  products: Product[];
  stocks: Stock[];
  transactions: Transaction[];
  preOrders: PreOrder[];
  productionLogs: ProductionLog[];
  channels: Channel[];
  locations: Location[];
  pricings: Pricing[];
  globalStockLogs: GlobalStockLog[];
  stockTransfers: StockTransfer[];
  rawMaterials: RawMaterial[];
  rawMaterialLogs: RawMaterialLog[];
  
  // Real Supabase methods
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  updateStock: (stockId: string, newQuantity: number) => Promise<void>;
  addPreOrder: (preOrder: Omit<PreOrder, "id" | "status" | "createdAt" | "snapToken"> & { status?: PreOrder["status"], snapToken?: string, createdAt?: string }) => Promise<PreOrder | null>;
  updatePreOrderStatus: (preOrderId: string, status: PreOrder["status"], adminNotes?: string, skipRefresh?: boolean) => Promise<void>;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  addChannel: (channel: Omit<Channel, "id">) => Promise<void>;
  updateChannel: (id: string, channel: Partial<Channel>) => Promise<void>;
  deleteChannel: (id: string) => Promise<void>;
  
  addLocation: (location: Omit<Location, "id">) => Promise<void>;
  updateLocation: (id: string, location: Partial<Location>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;

  addStockTransfer: (transfer: Omit<StockTransfer, "id">) => Promise<void>;
  
  addRawMaterial: (item: Omit<RawMaterial, "id">) => Promise<void>;
  updateRawMaterial: (id: string, item: Partial<RawMaterial>) => Promise<void>;
  deleteRawMaterial: (id: string) => Promise<void>;
  addRawMaterialLog: (log: Omit<RawMaterialLog, "id">) => Promise<void>;

  promoBanners: PromoBanner[];
  addPromoBanner: (banner: Omit<PromoBanner, "id">) => Promise<void>;
  updatePromoBanner: (id: string, banner: Partial<PromoBanner>) => Promise<void>;
  deletePromoBanner: (id: string) => Promise<void>;


  // User Profile methods
  fetchUserProfile: (userId: string, authProvider?: "google" | "manual") => Promise<any>;
  updateUserProfile: (userId: string, whatsapp: string) => Promise<void>;

  // Local/Mock methods for non-migrated features
  // Local/Mock methods for non-migrated features
  addGlobalStockLog: (log: Omit<GlobalStockLog, "id">) => void;
  saveOpname: (logId: string | undefined, date: string, productId: string, canal: string, subLocation: string, sold: number, realWaste: number, reusableWaste: number, assigned: number) => Promise<void>;
  saveProductionPlans: (plans: Omit<ProductionPlan, "id" | "created_at">[]) => Promise<void>;
  refreshData: () => Promise<void>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { setIsProfileComplete, setCurrentUser, currentUser } = useAuth();
  
  // States mapped to Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  
  // Local/Mock states for UI that isn't fully migrated yet
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [pricings, setPricings] = useState<Pricing[]>([]);
  const [globalStockLogs, setGlobalStockLogs] = useState<GlobalStockLog[]>([]);
  const [rawMaterialLogs, setRawMaterialLogs] = useState<RawMaterialLog[]>([]);

  // 1. Ambil Data (Read/Select) dari Supabase
  const refreshData = async () => {
    try {
      // Channels
      const { data: channelData } = await supabase.from('channels').select('*');
      if (channelData) {
        setChannels(channelData.map(c => ({
          id: c.id.toString(),
          name: c.name,
          description: c.description || '',
          status: c.status === 'Aktif' ? 'active' : 'inactive',
          hasSubLocation: c.require_sub_location
        })));
      }

      // Locations
      const { data: locationData } = await supabase.from('locations').select('*');
      if (locationData) {
        setLocations(locationData.map(l => ({
          id: l.id.toString(),
          channelId: l.channel_id.toString(),
          name: l.name,
          address: l.address || '',
          status: l.status === 'Aktif' ? 'active' : 'inactive'
        })));
      }

      // Products & Product Channel Prices
      const { data: productData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      const { data: priceData } = await supabase.from('product_channel_prices').select('*');
      
      if (productData) {
        setProducts(productData.map(p => {
          const prices: Record<string, number> = {};
          if (priceData) {
            priceData.filter(pr => pr.product_id === p.id).forEach(pr => {
              prices[pr.channel_id.toString()] = Number(pr.specific_price);
            });
          }
          return {
            id: p.id.toString(),
            name: p.name,
            price: Number(p.general_price),
            hpp: Number(p.hpp_modal),
            category: p.category || '',
            description: p.description || '',
            imageUrl: p.image_url || '',
            isActive: p.is_active,
            prices
          };
        }));
      }

      // Global Stocks
      const { data: stockData } = await supabase.from('global_stocks').select('*');
      if (stockData) {
        setStocks(stockData.map(s => ({
          id: s.product_id.toString(),
          productId: s.product_id.toString(),
          location: 'gudang',
          quantityActual: s.qty_gudang,
          lastUpdated: s.updated_at
        })));
      }

      // Stock Mutations
      const { data: mutData } = await supabase.from('stock_mutations').select('*, locations(name)').order('created_at', { ascending: false });
      if (mutData) {
        setGlobalStockLogs(mutData.map(m => ({
          id: m.id.toString(),
          date: m.created_at.split('T')[0],
          productId: m.product_id.toString(),
          type: m.type === 'Tambah Produksi' ? 'in' : 'out',
          quantity: m.qty,
          description: m.notes || ''
        })));

        setStockTransfers(mutData.filter(m => m.type.startsWith('Kirim ke Cabang')).map(m => {
          let dest = m.locations?.name;
          if (!dest && m.notes) {
            if (m.notes.includes('Otomatisasi PO')) dest = m.notes.replace('Otomatisasi PO ', 'PO: ');
            else if (m.notes.includes('Transfer stok ke ')) dest = m.notes.replace('Transfer stok ke ', '');
          }
          return {
            id: m.id.toString(),
            date: m.created_at.split('T')[0],
            productId: m.product_id.toString(),
            quantity: m.qty,
            destination: dest || 'Cabang/Reseller'
          };
        }));
      }

      // Transactions (Financial Records)
      const { data: trxData } = await supabase.from('financial_records').select('*, locations(name)').order('recorded_at', { ascending: false });
      if (trxData) {
        setTransactions(trxData.map(t => {
          let locName = t.locations?.name;
          if (!locName && t.notes) {
             if (t.notes.includes('Opname Stand ')) {
               locName = t.notes.split('Opname Stand ')[1];
             } else if (t.notes.includes('PO Reseller - ')) {
               locName = 'Reseller';
             }
          }
          return {
            id: t.id.toString(),
            type: t.type === 'Pemasukan' ? 'income' : 'expense',
            amount: Number(t.amount),
            category: t.category,
            date: t.recorded_at,
            description: t.notes || '',
            locationId: t.location_id?.toString(),
            location: locName
          };
        }));
      }

      // PreOrders (Join with Users to get Reseller Name)
      const { data: poData, error: poErr } = await supabase.from('pre_orders').select('*, users(name, phone_number)');
      if (poData && !poErr) {
        setPreOrders(poData.map(po => {
          let localStatus: PreOrder["status"] = "pesanan diterima";
          const dbStatus = po.status.toLowerCase();
          if (dbStatus === "menunggu pembayaran") localStatus = "menunggu pembayaran";
          else if (dbStatus === "sedang dibuat") localStatus = "sedang dibuat";
          else if (dbStatus === "siap diambil") localStatus = "siap diambil";
          else if (dbStatus === "selesai") localStatus = "selesai";
          else if (dbStatus === "gagal") localStatus = "gagal";

          return {
            id: po.id.toString(),
            resellerId: po.reseller_id,
            resellerName: po.users?.name || 'Unknown',
            resellerPhone: po.users?.phone_number || '',
            productId: po.product_id?.toString() || '',
            quantity: po.quantity || 0,
            pickupDate: po.pickup_date || '',
            adminNotes: po.admin_notes || '',
            status: localStatus,
            createdAt: po.created_at,
            snapToken: po.snap_token || null
          };
        }));
      } else if (poErr) {
        console.error("Gagal menarik data PO:", poErr);
      }

      // Raw Materials
      const { data: rmData } = await supabase.from('raw_materials').select('*');
      if (rmData) {
        setRawMaterials(rmData.map(rm => ({
          id: rm.id.toString(),
          name: rm.name,
          unit: rm.unit,
          minStock: rm.safety_stock,
          currentStock: rm.current_stock
        })));
      }

      // Raw Material Logs
      const { data: rmLogData } = await supabase.from('raw_material_mutations').select('*').order('created_at', { ascending: false });
      if (rmLogData) {
        setRawMaterialLogs(rmLogData.map(l => ({
          id: l.id.toString(),
          rawMaterialId: l.material_id.toString(),
          date: l.created_at.split('T')[0],
          type: l.type === 'Barang Masuk' ? 'in' : 'out',
          quantity: l.qty,
          description: l.notes || ''
        })));
      }

      // Stock Opnames (Production Logs)
      const { data: opnames } = await supabase.from('stock_opnames').select('*, channels(name), locations(name)');
      if (opnames) {
        setProductionLogs(opnames.map(op => ({
          id: op.id.toString(),
          date: op.date,
          productId: op.product_id.toString(),
          canal: op.channels?.name || '',
          subLocation: op.locations?.name || '',
          morningProduction: op.stock_assigned,
          soldQuantity: op.sold_qty,
          realWaste: op.real_waste,
          reusableWaste: op.reusable_waste,
          hppSnapshot: op.hpp_snapshot,
          priceSnapshot: op.price_snapshot
        })));
      }

      // Promo Banners
      const { data: bannerData } = await supabase.from('promo_banners').select('*').order('slide_order', { ascending: true });
      if (bannerData) {
        setPromoBanners(bannerData.map(b => ({
          id: b.id.toString(),
          title: b.title,
          subtitle: b.subtitle || undefined,
          imageUrl: b.image_url,
          slideOrder: b.slide_order,
          isActive: b.is_active,
          clickUrl: b.click_url || undefined
        })));
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- CRUD Profil Tambahan ---
  const fetchUserProfile = async (userId: string, authProvider: "google" | "manual" = "manual") => {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error) {
      console.error("Gagal menarik profil:", error.message);
      return null;
    }
    
    return {
      name: data.name,
      email: data.email, 
      whatsapp: data.phone_number
    };
  };

  const updateUserProfile = async (userId: string, whatsapp: string) => {
    const { data, error } = await supabase
      .from('users')
      .update({ phone_number: whatsapp })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      alert("Gagal update profil: " + error.message);
      return;
    }

    if (data) {
      setIsProfileComplete(true);
      if (currentUser) {
        setCurrentUser({ ...currentUser, phone_number: whatsapp });
      }
    }
  };

  // --- CRUD Supabase Migrated ---
  
  // Channels
  const addChannel = async (channel: Omit<Channel, "id">) => {
    const { data, error } = await supabase.from('channels').insert([{
      name: channel.name,
      description: channel.description,
      require_sub_location: channel.hasSubLocation,
      status: channel.status === 'active' ? 'Aktif' : 'Nonaktif'
    }]).select().single();
    if (error) alert("Gagal menambah kanal: " + error.message);
    else if (data) {
      setChannels([...channels, {
        id: data.id.toString(),
        name: data.name,
        description: data.description || '',
        status: data.status === 'Aktif' ? 'active' : 'inactive',
        hasSubLocation: data.require_sub_location
      }]);
    }
  };
  
  const updateChannel = async (id: string, channel: Partial<Channel>) => {
     const payload: any = {};
     if (channel.name !== undefined) payload.name = channel.name;
     if (channel.description !== undefined) payload.description = channel.description;
     if (channel.hasSubLocation !== undefined) payload.require_sub_location = channel.hasSubLocation;
     if (channel.status !== undefined) payload.status = channel.status === 'active' ? 'Aktif' : 'Nonaktif';
     const { data, error } = await supabase.from('channels').update(payload).eq('id', id).select().single();
     if (error) alert("Gagal update kanal: " + error.message);
     else if (data) {
        setChannels(channels.map(c => c.id === id ? {
          ...c,
          name: data.name,
          description: data.description || '',
          status: data.status === 'Aktif' ? 'active' : 'inactive',
          hasSubLocation: data.require_sub_location
        } : c));
     }
  };
  
  const deleteChannel = async (id: string) => {
     const { error } = await supabase.from('channels').delete().eq('id', id);
     if (error) alert("Gagal hapus kanal: " + error.message);
     else {
       setChannels(channels.filter(c => c.id !== id));
       setLocations(locations.filter(l => l.channelId !== id));
     }
  };

  // Locations
  const addLocation = async (location: Omit<Location, "id">) => {
    const { data, error } = await supabase.from('locations').insert([{
      channel_id: parseInt(location.channelId),
      name: location.name,
      address: location.address,
      status: location.status === 'active' ? 'Aktif' : 'Nonaktif'
    }]).select().single();
    if (error) alert("Gagal menambah lokasi: " + error.message);
    else if (data) {
       setLocations([...locations, {
          id: data.id.toString(),
          channelId: data.channel_id.toString(),
          name: data.name,
          address: data.address || '',
          status: data.status === 'Aktif' ? 'active' : 'inactive'
       }]);
    }
  };
  
  const updateLocation = async (id: string, location: Partial<Location>) => {
    const payload: any = {};
    if (location.name !== undefined) payload.name = location.name;
    if (location.address !== undefined) payload.address = location.address;
    if (location.channelId !== undefined) payload.channel_id = parseInt(location.channelId);
    if (location.status !== undefined) payload.status = location.status === 'active' ? 'Aktif' : 'Nonaktif';
    const { data, error } = await supabase.from('locations').update(payload).eq('id', id).select().single();
    if (error) alert("Gagal update lokasi: " + error.message);
    else if (data) {
       setLocations(locations.map(l => l.id === id ? {
         ...l,
         name: data.name,
         address: data.address || '',
         channelId: data.channel_id.toString(),
         status: data.status === 'Aktif' ? 'active' : 'inactive'
       } : l));
    }
  };
  
  const deleteLocation = async (id: string) => {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) alert("Gagal hapus lokasi: " + error.message);
    else {
       setLocations(locations.filter(l => l.id !== id));
    }
  };

  // Financial Records
  const addTransaction = async (t: Omit<Transaction, "id">) => {
    const { data, error } = await supabase.from('financial_records').insert([{
      type: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      amount: t.amount,
      category: t.category,
      recorded_at: t.date,
      notes: t.description,
      location_id: t.locationId ? parseInt(t.locationId) : null,
      created_by: currentUser?.id
    }]).select().single();

    if (error) alert("Gagal menambah transaksi: " + error.message);
    else if (data) {
      setTransactions([{
        id: data.id.toString(),
        type: data.type === 'Pemasukan' ? 'income' : 'expense',
        amount: Number(data.amount),
        category: data.category,
        date: data.recorded_at,
        description: data.notes || '',
        locationId: data.location_id?.toString()
      }, ...transactions]);
    }
  };

  // Global Stocks
  const updateStock = async (stockId: string, newQuantity: number) => {
    // stockId adalah productId
    const { data, error } = await supabase.from('global_stocks')
      .update({ qty_gudang: newQuantity, updated_at: new Date().toISOString() })
      .eq('product_id', stockId)
      .select().single();

    if (error) alert("Gagal update stok: " + error.message);
    else if (data) {
      setStocks(prev => prev.map(s => s.productId === stockId ? { 
        ...s, 
        quantityActual: data.qty_gudang, 
        lastUpdated: data.updated_at 
      } : s));
    }
  };

  const triggerProductionPlanAutomation = async (productId: number, pickupDate: string, quantity: number) => {
    try {
      const { data: channelData } = await supabase.from('channels').select('id').ilike('name', '%reseller%').single();
      const resellerChannelId = channelData?.id;

      if (resellerChannelId) {
        const { data: existingPlan } = await supabase.from('production_plans')
          .select('*')
          .eq('target_date', pickupDate)
          .eq('product_id', productId)
          .eq('channel_id', resellerChannelId)
          .single();

        if (existingPlan) {
          await supabase.from('production_plans')
            .update({ target_production_qty: existingPlan.target_production_qty + quantity })
            .eq('id', existingPlan.id);
        } else {
          await supabase.from('production_plans').insert([{
            target_date: pickupDate,
            product_id: productId,
            channel_id: resellerChannelId,
            target_production_qty: quantity,
            avg_past_week_qty: 0,
            is_finalized: false
          }]);
        }
      }
    } catch (err) {
      console.error("Gagal update production_plans (Automasi 1):", err);
    }
  };

  // Pre Orders
  const addPreOrder = async (po: Omit<PreOrder, "id" | "status" | "createdAt" | "snapToken"> & { status?: PreOrder["status"], snapToken?: string, createdAt?: string }): Promise<PreOrder | null> => {
    let dbStatus = 'Pesanan Diterima';
    if (po.status === 'menunggu pembayaran') dbStatus = 'Menunggu Pembayaran';
    else if (po.status === 'sedang dibuat') dbStatus = 'Sedang Dibuat';
    else if (po.status === 'siap diambil') dbStatus = 'Siap Diambil';
    else if (po.status === 'selesai') dbStatus = 'Selesai';
    else if (po.status === 'gagal') dbStatus = 'Gagal';

    const payload: any = {
      reseller_id: po.resellerId,
      product_id: parseInt(po.productId),
      quantity: po.quantity,
      pickup_date: po.pickupDate,
      total_amount: (products.find(p => p.id === po.productId)?.price || 0) * po.quantity,
      status: dbStatus,
      snap_token: po.snapToken || null
    };
    if (po.createdAt) {
      payload.created_at = po.createdAt;
    }

    const { data, error } = await supabase.from('pre_orders').insert([payload]).select('*, users(name)').single();

    if (error) {
      alert("Gagal membuat PO (Pastikan Anda sudah menambah kolom product_id, quantity, & snap_token di Supabase!): " + error.message);
      throw new Error(error.message);
    } else if (data) {
      let localStatus: PreOrder["status"] = "pesanan diterima";
      const retStatus = data.status.toLowerCase();
      if (retStatus === "menunggu pembayaran") localStatus = "menunggu pembayaran";
      else if (retStatus === "sedang dibuat") localStatus = "sedang dibuat";
      else if (retStatus === "siap diambil") localStatus = "siap diambil";
      else if (retStatus === "selesai") localStatus = "selesai";
      else if (retStatus === "gagal") localStatus = "gagal";

      // 1. Automasi 1: Menembak data ke production_plans saat Pesanan Diterima
      if (data.status === 'Pesanan Diterima') {
        await triggerProductionPlanAutomation(data.product_id, data.pickup_date, data.quantity);
      }

      const newPo: PreOrder = {
        id: data.id.toString(),
        resellerId: data.reseller_id,
        resellerName: data.users?.name || 'Unknown',
        productId: data.product_id?.toString() || po.productId,
        quantity: data.quantity || po.quantity,
        pickupDate: data.pickup_date || po.pickupDate,
        status: localStatus,
        createdAt: data.created_at || po.createdAt || new Date().toISOString(),
        snapToken: data.snap_token || null
      };

      setPreOrders(prev => [newPo, ...prev]);
      return newPo;
    }
    return null;
  };

  const updatePreOrderStatus = async (poId: string, status: PreOrder["status"], adminNotes?: string, skipRefresh = false) => {
    let po = preOrders.find(p => p.id === poId);
    let wasFetchedFromDb = false;

    if (!po) {
      const { data: dbPo } = await supabase
        .from('pre_orders')
        .select('*, users(name)')
        .eq('id', parseInt(poId))
        .maybeSingle();

      if (dbPo) {
        wasFetchedFromDb = true;
        let localStatus: PreOrder["status"] = "pesanan diterima";
        const retStatus = dbPo.status.toLowerCase();
        if (retStatus === "menunggu pembayaran") localStatus = "menunggu pembayaran";
        else if (retStatus === "sedang dibuat") localStatus = "sedang dibuat";
        else if (retStatus === "siap diambil") localStatus = "siap diambil";
        else if (retStatus === "selesai") localStatus = "selesai";
        else if (retStatus === "gagal") localStatus = "gagal";

        po = {
          id: dbPo.id.toString(),
          resellerId: dbPo.reseller_id,
          resellerName: dbPo.users?.name || 'Unknown',
          productId: dbPo.product_id?.toString() || '',
          quantity: dbPo.quantity || 0,
          pickupDate: dbPo.pickup_date || '',
          status: localStatus,
          createdAt: dbPo.created_at,
          snapToken: dbPo.snap_token || null
        };
      }
    }

    if (!po) return;

    let dbStatus = "Pesanan Diterima";
    if (status === "menunggu pembayaran") dbStatus = "Menunggu Pembayaran";
    else if (status === "sedang dibuat") dbStatus = "Sedang Dibuat";
    else if (status === "siap diambil") dbStatus = "Siap Diambil";
    else if (status === "selesai") dbStatus = "Selesai";
    else if (status === "gagal") dbStatus = "Gagal";

    const payload: any = { status: dbStatus };
    if (adminNotes !== undefined) payload.admin_notes = adminNotes;

    const { data, error } = await supabase.from('pre_orders')
      .update(payload)
      .eq('id', poId)
      .select().single();

    if (error) alert("Gagal ubah status: " + error.message);
    else if (data) {
      let localStatus: PreOrder["status"] = "pesanan diterima";
      const retStatus = data.status.toLowerCase();
      if (retStatus === "menunggu pembayaran") localStatus = "menunggu pembayaran";
      else if (retStatus === "sedang dibuat") localStatus = "sedang dibuat";
      else if (retStatus === "siap diambil") localStatus = "siap diambil";
      else if (retStatus === "selesai") localStatus = "selesai";
      else if (retStatus === "gagal") localStatus = "gagal";

      // 1. Automasi 1: Menembak data ke production_plans saat Pesanan Diterima dari Menunggu Pembayaran
      if (dbStatus === "Pesanan Diterima" && po.status === "menunggu pembayaran") {
        await triggerProductionPlanAutomation(parseInt(po.productId), po.pickupDate, po.quantity);
      }

      // 2. Automasi 2: "Siap Diambil" -> Moci yang selesai dibuat menambah saldo global_stocks
      if (status === "siap diambil" && po.status !== "siap diambil" && po.status !== "selesai") {
         try {
           const { data: stockData } = await supabase.from('global_stocks').select('qty_gudang').eq('product_id', po.productId).single();
           const currentQty = stockData?.qty_gudang || 0;
           await updateStock(po.productId, currentQty + po.quantity);
         } catch(err) {
           console.error("Gagal update global_stocks (Automasi 2):", err);
         }
      }

      // 3. Automasi 3: "Selesai" -> Mutasi Stok, Stok Opname, Pencatatan Keuangan
      if (status === "selesai" && po.status !== "selesai") {
         try {
           const { data: channelData } = await supabase.from('channels').select('id').ilike('name', '%reseller%').single();
           const resellerChannelId = channelData?.id;

           // Automasi 3.1: Mutasi Stok (Kurangi global_stocks)
           const { data: stockData } = await supabase.from('global_stocks').select('qty_gudang').eq('product_id', po.productId).single();
           const currentQty = stockData?.qty_gudang || 0;
           
           await supabase.from('stock_mutations').insert([{
             product_id: parseInt(po.productId),
             type: 'Kirim ke Cabang/Reseller',
             qty: po.quantity,
             notes: `Otomatisasi PO ${po.resellerName}`,
             created_by: currentUser?.id
           }]);

           await updateStock(po.productId, Math.max(0, currentQty - po.quantity));

           // Automasi 3.2: Stok Opname Otomatis
           const product = products.find(p => p.id === po.productId);
           if (resellerChannelId) {
             await supabase.from('stock_opnames').insert([{
               date: po.pickupDate,
               product_id: parseInt(po.productId),
               channel_id: resellerChannelId,
               stock_assigned: po.quantity, // qty_dikirim = PO qty
               sold_qty: po.quantity,       // qty_terjual = PO qty
               real_waste: 0,
               reusable_waste: 0,
               hpp_snapshot: product?.hpp || 0,
               price_snapshot: product?.price || 0,
               created_by: currentUser?.id
             }]);
           }

           // Automasi 3.3: Pencatatan Keuangan
           const totalAmount = (product?.price || 0) * po.quantity;
           await supabase.from('financial_records').insert([{
             type: 'Pemasukan',
             amount: totalAmount,
             category: 'Penjualan',
             recorded_at: new Date().toISOString(),
             notes: `Penjualan PO Reseller - ${po.resellerName}`,
             created_by: currentUser?.id
           }]);

         } catch (err) {
           console.error("Gagal menjalankan Automasi 3:", err);
         }
      }

      if (wasFetchedFromDb) {
        await refreshData();
      } else {
        setPreOrders(prev => prev.map(p => p.id === poId ? { 
          ...p, 
          status: localStatus,
          adminNotes: data.admin_notes || p.adminNotes
        } : p));
        
        if (!skipRefresh && (status === 'selesai' || status === 'siap diambil')) {
          refreshData();
        }
      }
    }
  };

  // Products
  const addProduct = async (product: Omit<Product, "id">) => {
    const { data, error } = await supabase.from('products').insert([{
      name: product.name,
      general_price: product.price,
      hpp_modal: product.hpp || 0,
      description: product.description,
      image_url: product.imageUrl,
      category: product.category,
      is_active: product.isActive ?? true
    }]).select().single();

    if (error) alert("Gagal tambah produk: " + error.message);
    else if (data) {
      const newProd = {
        id: data.id.toString(),
        name: data.name,
        price: Number(data.general_price),
        hpp: Number(data.hpp_modal),
        category: data.category || '',
        description: data.description || '',
        imageUrl: data.image_url || '',
        isActive: data.is_active,
        prices: product.prices || {}
      };
      
      // Insert channel prices if any
      if (product.prices && Object.keys(product.prices).length > 0) {
        const pricePayload = Object.keys(product.prices).map(channelId => ({
          product_id: data.id,
          channel_id: parseInt(channelId),
          specific_price: product.prices![channelId]
        }));
        await supabase.from('product_channel_prices').insert(pricePayload);
      }
      
      setProducts([...products, newProd]);
      
      const { data: sData } = await supabase.from('global_stocks').insert([{
        product_id: data.id,
        qty_gudang: 0
      }]).select().single();
      
      if (sData) {
        setStocks([...stocks, {
          id: sData.product_id.toString(),
          productId: sData.product_id.toString(),
          location: 'gudang',
          quantityActual: sData.qty_gudang,
          lastUpdated: sData.updated_at
        }]);
      }
    }
  };

  const updateProduct = async (id: string, updatedProduct: Partial<Product>) => {
    const payload: any = {};
    if (updatedProduct.name !== undefined) payload.name = updatedProduct.name;
    if (updatedProduct.price !== undefined) payload.general_price = updatedProduct.price;
    if (updatedProduct.hpp !== undefined) payload.hpp_modal = updatedProduct.hpp;
    if (updatedProduct.description !== undefined) payload.description = updatedProduct.description;
    if (updatedProduct.imageUrl !== undefined) payload.image_url = updatedProduct.imageUrl;
    if (updatedProduct.isActive !== undefined) payload.is_active = updatedProduct.isActive;

    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();

    if (error) alert("Gagal update produk: " + error.message);
    else if (data) {
      // Upsert prices
      if (updatedProduct.prices) {
        // Delete existing prices for this product to keep it simple
        await supabase.from('product_channel_prices').delete().eq('product_id', parseInt(id));
        
        const pricePayload = Object.keys(updatedProduct.prices).map(channelId => ({
          product_id: parseInt(id),
          channel_id: parseInt(channelId),
          specific_price: updatedProduct.prices![channelId]
        }));
        if (pricePayload.length > 0) {
          await supabase.from('product_channel_prices').insert(pricePayload);
        }
      }

      setProducts(products.map(p => p.id === id ? { 
        ...p, 
        name: data.name, 
        price: Number(data.general_price), 
        hpp: Number(data.hpp_modal),
        description: data.description || '', 
        imageUrl: data.image_url || '', 
        isActive: data.is_active,
        prices: updatedProduct.prices || p.prices
      } : p));
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert("Gagal menghapus produk: " + error.message);
    else {
      setProducts(products.filter(p => p.id !== id));
      setStocks(stocks.filter(s => s.productId !== id));
    }
  };

  // Stock Mutations
  const addStockTransfer = async (transfer: Omit<StockTransfer, "id">) => {
    const currentStock = stocks.find(s => s.productId === transfer.productId)?.quantityActual || 0;
    
    if (transfer.quantity > currentStock) {
        throw new Error(`Stok gudang tidak mencukupi! (Sisa stok: ${currentStock})`);
    }

    const locId = locations.find(l => l.name === transfer.destination)?.id;

    const { data: mutData, error: mutError } = await supabase.from('stock_mutations').insert([{
        product_id: parseInt(transfer.productId),
        type: 'Kirim ke Cabang',
        qty: transfer.quantity,
        destination_location_id: locId ? parseInt(locId) : null,
        notes: `Transfer stok ke ${transfer.destination}`,
        created_by: currentUser?.id
    }]).select().single();

    if (mutError) throw new Error(mutError.message);
    if (mutData) {
        const newTransfer = { ...transfer, id: mutData.id.toString(), date: mutData.created_at.split('T')[0] };
        setStockTransfers([newTransfer, ...stockTransfers]);
        
        setGlobalStockLogs([{
          id: mutData.id.toString(),
          date: mutData.created_at.split('T')[0],
          productId: transfer.productId,
          type: 'out',
          quantity: transfer.quantity,
          description: `Transfer stok ke ${transfer.destination}`
        }, ...globalStockLogs]);

        await updateStock(transfer.productId, currentStock - transfer.quantity);
    }
  };

  // Raw Materials
  const addRawMaterial = async (item: Omit<RawMaterial, "id">) => {
    const { data, error } = await supabase.from('raw_materials').insert([{
      name: item.name,
      safety_stock: item.minStock,
      current_stock: item.currentStock,
      unit: item.unit
    }]).select().single();
    if (error) throw new Error(error.message);
    if (data) {
      setRawMaterials([...rawMaterials, {
        id: data.id.toString(),
        name: data.name,
        unit: data.unit,
        minStock: data.safety_stock,
        currentStock: data.current_stock
      }]);
    }
  };
  
  const updateRawMaterial = async (id: string, item: Partial<RawMaterial>) => {
    const payload: any = {};
    if (item.name !== undefined) payload.name = item.name;
    if (item.minStock !== undefined) payload.safety_stock = item.minStock;
    if (item.currentStock !== undefined) payload.current_stock = item.currentStock;
    if (item.unit !== undefined) payload.unit = item.unit;
    
    const { data, error } = await supabase.from('raw_materials').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    if (data) {
      setRawMaterials(rawMaterials.map(rm => rm.id === id ? {
        ...rm,
        name: data.name,
        unit: data.unit,
        minStock: data.safety_stock,
        currentStock: data.current_stock
      } : rm));
    }
  };
  
  const deleteRawMaterial = async (id: string) => {
    const { error } = await supabase.from('raw_materials').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setRawMaterials(rawMaterials.filter(rm => rm.id !== id));
  };

  const addRawMaterialLog = async (log: Omit<RawMaterialLog, "id">) => {
    const { data: mutData, error: mutError } = await supabase.from('raw_material_mutations').insert([{
        material_id: parseInt(log.rawMaterialId),
        type: log.type === 'in' ? 'Barang Masuk' : 'Lapor Pemakaian',
        qty: log.quantity,
        notes: log.description,
        created_by: currentUser?.id
    }]).select().single();

    if (mutError) throw new Error(mutError.message);

    if (mutData) {
        setRawMaterialLogs([{ ...log, id: mutData.id.toString(), date: mutData.created_at.split('T')[0] }, ...rawMaterialLogs]);
        
        const rm = rawMaterials.find(r => r.id === log.rawMaterialId);
        if (rm) {
           const newStock = log.type === 'in' ? rm.currentStock + log.quantity : rm.currentStock - log.quantity;
           await updateRawMaterial(log.rawMaterialId, { currentStock: newStock });
        }
    }
  };


  // --- LOCAL METHODS (Fungsi Mocking untuk Modul yang belum migrasi penuh ke Supabase) ---
  const saveOpnamesBatch = async (batchData: any[]) => {
    if (batchData.length === 0) return;

    const date = batchData[0].date;
    const canal = batchData[0].canal;
    const subLocation = batchData[0].subLocation;

    const channelObj = channels.find(c => c.name === canal);
    const locationObj = locations.find(l => l.name === subLocation);

    if (!channelObj) return;

    let totalGross = 0;
    const newLogs: ProductionLog[] = [];

    // Proses seluruh opname secara berurutan (Pseudo-Transaction)
    for (const item of batchData) {
      const product = products.find(p => p.id === item.productId);
      
      // Ambil harga: Cek apakah ada harga khusus untuk channel ini, jika tidak pakai general_price
      const unitPrice = product?.prices?.[channelObj.id] || product?.price || 0;
      totalGross += item.sold * unitPrice;

      const payload = {
        date: item.date,
        channel_id: parseInt(channelObj.id),
        location_id: locationObj ? parseInt(locationObj.id) : null,
        product_id: parseInt(item.productId),
        stock_assigned: item.assigned,
        sold_qty: item.sold,
        real_waste: item.realWaste,
        reusable_waste: item.reusableWaste,
        hpp_snapshot: product?.hpp || 0,
        price_snapshot: unitPrice,
        created_by: currentUser?.id
      };

      let newLogId = item.logId;

      if (item.logId && !item.logId.startsWith('log')) {
         await supabase.from('stock_opnames').update(payload).eq('id', item.logId);
      } else {
         let query = supabase.from('stock_opnames')
           .select('id').eq('date', item.date).eq('channel_id', parseInt(channelObj.id))
           .eq('product_id', parseInt(item.productId));
         
         if (locationObj) query = query.eq('location_id', parseInt(locationObj.id));
         else query = query.is('location_id', null);

         const { data: existing } = await query.maybeSingle();

         if (existing) {
           await supabase.from('stock_opnames').update(payload).eq('id', existing.id);
           newLogId = existing.id.toString();
         } else {
           const { data } = await supabase.from('stock_opnames').insert([payload]).select().single();
           if (data) newLogId = data.id.toString();
         }
      }

      newLogs.push({
        id: newLogId || `log${Date.now()}_${item.productId}`,
        date: item.date,
        productId: item.productId,
        canal: item.canal,
        subLocation: item.subLocation,
        morningProduction: item.assigned,
        soldQuantity: item.sold,
        realWaste: item.realWaste,
        reusableWaste: item.reusableWaste,
        hppSnapshot: product?.hpp || 0,
        priceSnapshot: unitPrice
      });
    }

    // Insert ke tabel financial_records HANYA SEKALI setelah semua opname berhasil
    if (totalGross > 0) {
      await supabase.from('financial_records').insert([{
        type: 'Pemasukan',
        category: 'Penjualan',
        amount: totalGross,
        location_id: locationObj ? parseInt(locationObj.id) : null,
        notes: `Pemasukan otomatis dari Opname Stand ${subLocation || canal}`,
        recorded_at: new Date().toISOString(),
        created_by: currentUser?.id
      }]);
    }

    // Update Local State
    setProductionLogs(prev => {
      let updated = [...prev];
      for (const newLog of newLogs) {
        const existingIndex = updated.findIndex(l => l.date === newLog.date && l.productId === newLog.productId && l.canal === newLog.canal && l.subLocation === newLog.subLocation);
        if (existingIndex >= 0) {
          updated[existingIndex] = newLog;
        } else {
          updated.push(newLog);
        }
      }
      return updated;
    });
    
    // Auto-refresh untuk menarik ulang semua data transaksi
    refreshData();
  };  

  // Promo Banners CRUD
  const addPromoBanner = async (banner: Omit<PromoBanner, "id">) => {
    const { data, error } = await supabase.from('promo_banners').insert([{
      title: banner.title,
      subtitle: banner.subtitle,
      image_url: banner.imageUrl,
      slide_order: banner.slideOrder,
      is_active: banner.isActive,
      click_url: banner.clickUrl
    }]).select().single();
    if (error) alert("Gagal menambah banner: " + error.message);
    else if (data) {
      setPromoBanners([...promoBanners, {
        id: data.id.toString(),
        title: data.title,
        subtitle: data.subtitle || undefined,
        imageUrl: data.image_url,
        slideOrder: data.slide_order,
        isActive: data.is_active,
        clickUrl: data.click_url || undefined
      }].sort((a, b) => a.slideOrder - b.slideOrder));
    }
  };

  const updatePromoBanner = async (id: string, banner: Partial<PromoBanner>) => {
    const payload: any = {};
    if (banner.title !== undefined) payload.title = banner.title;
    if (banner.subtitle !== undefined) payload.subtitle = banner.subtitle;
    if (banner.imageUrl !== undefined) payload.image_url = banner.imageUrl;
    if (banner.slideOrder !== undefined) payload.slide_order = banner.slideOrder;
    if (banner.isActive !== undefined) payload.is_active = banner.isActive;
    if (banner.clickUrl !== undefined) payload.click_url = banner.clickUrl;

    const { data, error } = await supabase.from('promo_banners').update(payload).eq('id', parseInt(id)).select().single();
    if (error) alert("Gagal mengupdate banner: " + error.message);
    else if (data) {
      setPromoBanners(promoBanners.map(b => b.id === id ? {
        ...b,
        ...banner,
        subtitle: banner.subtitle || b.subtitle,
        clickUrl: banner.clickUrl || b.clickUrl
      } : b).sort((a, b) => a.slideOrder - b.slideOrder));
    }
  };

  const deletePromoBanner = async (id: string) => {
    const { error } = await supabase.from('promo_banners').delete().eq('id', parseInt(id));
    if (error) alert("Gagal menghapus banner: " + error.message);
    else {
      setPromoBanners(promoBanners.filter(b => b.id !== id));
    }
  };
  
  const addGlobalStockLog = async (log: Omit<GlobalStockLog, "id">) => {
    const { data: mutData, error: mutError } = await supabase.from('stock_mutations').insert([{
        product_id: parseInt(log.productId),
        type: log.type === 'in' ? 'Tambah Produksi' : 'Kirim ke Cabang',
        qty: log.quantity,
        notes: log.description,
        created_by: currentUser?.id
    }]).select().single();

    if (mutError) throw new Error(mutError.message);

    if (mutData) {
        setGlobalStockLogs([{ ...log, id: mutData.id.toString(), date: mutData.created_at.split('T')[0] }, ...globalStockLogs]);
        
        const currentStock = stocks.find(s => s.productId === log.productId)?.quantityActual || 0;
        const newStock = log.type === 'in' ? currentStock + log.quantity : currentStock - log.quantity;
        await updateStock(log.productId, newStock);
    }
  };
  
  const saveProductionPlans = async (plans: Omit<ProductionPlan, "id" | "created_at">[]) => {
    if (plans.length === 0) return;
    
    const date = plans[0].target_date;
    const channel_id = plans[0].channel_id;
    const location_id = plans[0].location_id;

    let query = supabase.from('production_plans').delete()
      .eq('target_date', date)
      .eq('channel_id', parseInt(channel_id as string));
    
    if (location_id) query = query.eq('location_id', parseInt(location_id as string));
    else query = query.is('location_id', null);

    await query;

    const payload = plans.map(p => ({
      target_date: p.target_date,
      product_id: parseInt(p.product_id as string),
      channel_id: parseInt(p.channel_id as string),
      location_id: p.location_id ? parseInt(p.location_id as string) : null,
      avg_past_week_qty: p.avg_past_week_qty,
      target_production_qty: p.target_production_qty,
      is_finalized: p.is_finalized
    }));

    const { error } = await supabase.from('production_plans').insert(payload);
    if (error) {
      alert("Gagal menyimpan rencana produksi: " + error.message);
      console.error(error);
    }
  };

  const value = {
      products, stocks, transactions, preOrders, productionLogs, channels, locations, pricings,
      globalStockLogs, stockTransfers, rawMaterials, rawMaterialLogs,
      addTransaction, updateStock, addPreOrder, updatePreOrderStatus,
      addProduct, updateProduct, deleteProduct,
      addChannel, updateChannel, deleteChannel, addLocation, updateLocation, deleteLocation,
      addGlobalStockLog, addStockTransfer, saveOpnamesBatch, saveProductionPlans,
      addRawMaterial, updateRawMaterial, deleteRawMaterial, addRawMaterialLog,
      fetchUserProfile, updateUserProfile,
      promoBanners, addPromoBanner, updatePromoBanner, deletePromoBanner,
      refreshData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
