// src/app/page.tsx
import { useState } from "react";
import {KatalogBumdes, FormTambahProduk} from "@/components/ui";

export interface ProdukBumdes {
  id: string;
  nama: string;
  harga: number;
  kategori: string;
}

const App = () => {
  const [daftarProduk, setDaftarProduk] = useState<ProdukBumdes[]>([]);
  const tambahProduk = (produkBaru : ProdukBumdes) => {
    setDaftarProduk([...daftarProduk, produkBaru])
  }

  return (
    <main style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
      <FormTambahProduk onTambahProduk={tambahProduk}/>
      <KatalogBumdes dataProduk={daftarProduk} />
    </main>
  )
}
export default App;