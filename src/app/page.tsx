// src/app/page.tsx
import {KatalogBumdes, FormTambahProduk} from "@/components/ui";

export interface ProdukBumdes {
  id: string;
  nama: string;
  harga: number;
  kategori: string;
}

const App = () => {
  const daftarProduk:  ProdukBumdes[] = [
    {
      id: "1",
      nama: "Baji",
      harga: 10000,
      kategori: "makanan"
    },

    {
      id: "2",
      nama: "Baji",
      harga: 10000,
      kategori: "makanan"
    },
  ];

  return (
    <main style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
      <FormTambahProduk />
      <KatalogBumdes dataProduk={daftarProduk} />
    </main>
  )
}
export default App;