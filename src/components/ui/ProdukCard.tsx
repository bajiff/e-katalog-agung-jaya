// src/components/ui/ProdukCard.tsx
"use client"
import { useState } from 'react';

interface ProdukCardProps {
  nama: string;
  harga: number;
}

const ProdukCard = ({ nama, harga }: ProdukCardProps) => { 
  const [jumlah, setJumlah] = useState(0); 
  const addCart = () => setJumlah(jumlah + 1);
  
  return (
      <section className="rounded-2xl shadow-2xl border-2 flex flex-col gap-y-1 p-2">
        <h3 className="text-lg font-bold">{nama}</h3>
        <p className="text-gray-600">Rp {harga}</p>
        <p>Di keranjang: {jumlah}</p>
        <button className="bg-green-600 text-white rounded px-2 hover:bg-green-800 duration-200 transition"
        onClick={addCart}>Tambah Keranjang</button>
      </section> 
  )
}

export default ProdukCard;