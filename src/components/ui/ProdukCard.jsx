// src/components/ui/ProdukCard.jsx
import  { useState } from 'react'

const ProdukCard = ({ nama, harga}) => {
  const [jumlah, setJumlah] = useState(0);
  const addCart = () => setJumlah(jumlah + 1);
  return (
      <section>
        <h3>{nama}</h3>
        <p>{harga}</p>
        <p>{jumlah}</p>
        <button onClick={() => addCart()}>Tambah Keranjang</button>
      </section>
  )
}

export default ProdukCard;