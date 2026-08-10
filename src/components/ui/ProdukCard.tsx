// src/components/ui/ProdukCard.jsx
import { useState } from 'react';

interface ProdukCardProps {
  nama: string;
  harga: number;
}

const ProdukCard = ({ nama, harga }: ProdukCardProps) => { 
  const [jumlah, setJumlah] = useState(0); 
  const addCart = () => setJumlah(jumlah + 1);
  
  return (
      <section>
        <h3>{nama}</h3>
        <p>Rp {harga}</p>
        <p>Di keranjang: {jumlah}</p>
        <button onClick={addCart}>Tambah Keranjang</button>
      </section>
  )
}

export default ProdukCard;