"use client";

import React from "react";
import { useAuth } from "../context/AuthContext";
import OwnerInventory from "../inventory/OwnerInventory";

export default function StockPage() {
  const { currentUser } = useAuth();

  // Protect route: Only admin
  if (currentUser?.role !== "admin") {
    return <div className="p-6 text-center text-gray-500">Akses khusus Admin.</div>;
  }

  return (
    <div className="w-full">
      <OwnerInventory />
    </div>
  );
}
