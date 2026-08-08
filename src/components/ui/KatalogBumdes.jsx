// src/components/ui/KatalogBumdes.jsx
import {daftarProduk} from "../../data/index";
import { ProdukCard } from './index';

const KatalogBumdes = () => {
  // Return JSX (elemen div)
  // Di dalamnya, gunakan daftarProduk.map((item) => ( ... ))
  // Return komponen <ProdukCard /> dari dalam map
  // Kirimkan prop 'key' menggunakan item.id
  // Kirimkan prop 'nama' dan 'harga' dari data item
  return (
    <section>
    {daftarProduk.map(item => (
      <ProdukCard key={item.id} nama={item.nama} harga={item.harga} />
    ))}
    </section>
  )
}

export default KatalogBumdes;