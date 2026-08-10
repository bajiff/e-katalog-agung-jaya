import { useState } from "react";
import {KatalogBumdes, FormTambahProduk} from "./components/ui/index";

// Buat Interface untuk struktur data Produk yang seragam
export interface ProdukBumdes {
  id: string; // Gunakan string karena kita akan pakai Date.now().toString() untuk ID unik
  nama: string;
  harga: number;
  kategori: string;
}

const App = () => {
  // 1. Buat STATE UTAMA di sini (Lifting State Up)
  // const [daftarProduk, setDaftarProduk] = useState<ProdukBumdes[]>([]);
  const [daftarProduk, setDaftarProduk] = useState<ProdukBumdes[]>([]);
  // 2. Buat fungsi 'tambahProduk' yang menerima 1 parameter (produkBaru ber-tipe ProdukBumdes)
  // Di dalamnya: gunakan setDaftarProduk dengan spread operator untuk menggabungkan daftar lama dengan produkBaru
  const tambahProduk = (produkBaru : ProdukBumdes) => {
    setDaftarProduk([...daftarProduk, produkBaru])
  }

  return (
    <main style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
      {/* 3. Panggil FormTambahProduk dan kirim fungsi tambahProduk lewat props */}
      {/* <FormTambahProduk onTambahProduk={tambahProduk} /> */}
      <FormTambahProduk onTambahProduk={tambahProduk}/>
      {/* 4. Panggil KatalogBumdes dan kirim state daftarProduk lewat props */}
      {/* <KatalogBumdes data={daftarProduk} /> */}
      <KatalogBumdes dataProduk={daftarProduk} />
    </main>
  )
}
export default App;