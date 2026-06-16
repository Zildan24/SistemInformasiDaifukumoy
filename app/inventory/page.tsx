"use client";

import React from "react";
import { useAuth } from "../context/AuthContext";
import AdminInventory from "./AdminInventory";
import OwnerInventory from "./OwnerInventory";

export default function InventoryWrapperPage() {
  const { currentUser } = useAuth();

  if (currentUser?.role === "admin") {
    return <AdminInventory />;
  }

  // Fallback for unauthorized
  return <div className="p-6 text-center text-gray-500">Akses ditolak.</div>;
}
