// src/components/ui/FormTambahProduk.tsx
import { useState } from 'react';
import { ProdukBumdes } from '../../App';
interface FormProps {
  onTambahProduk: (produk: ProdukBumdes) => void;
}
const FormTambahProduk = ({onTambahProduk} :FormProps) => {
  const [namaProduk, setNamaProduk] = useState("");
  const [hargaProduk, setHargaProduk] = useState("");
  const [kategori, setKategori] = useState("");

  const tanganiSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log({namaProduk, hargaProduk, kategori})
    const produkBaru = {id: Date.now().toString(), nama: namaProduk, harga: Number(hargaProduk), kategori: kategori}
    onTambahProduk(produkBaru)
    setNamaProduk(""); 
    setHargaProduk("");
    setKategori("");
  };

  return (
    <section>
      <h2>Tambah Produk Baru</h2>
      
      {/* 3. Pasang event onSubmit pada tag <form> */}
      <form onSubmit={tanganiSubmit}>
        
        {/* INPUT NAMA */}
        <div>
          <label>Nama Produk: </label>
          {/* Pasang value ke state namaProduk */}
          {/* Pasang onChange untuk men-set namaProduk dengan e.target.value */}
          <input type="text" value={namaProduk} onChange={(e) => setNamaProduk(e.target.value)} />
        </div>

        {/* INPUT HARGA */}
        <div>
          <label>Harga: </label>
          {/* Lakukan hal yang sama seperti input nama, tapi hubungkan ke state hargaProduk */}
          <input type="number" value={hargaProduk} onChange={e => setHargaProduk(e.target.value)} /> 
        </div>

        {/* INPUT KATEGORI (Opsional pakai tag <select>, atau <input> biasa dulu juga boleh) */}
        <div>
          <label htmlFor="kategori">Kategori: </label>
          <select name="kategori" id="kategori" value={kategori} onChange={e => setKategori(e.target.value)}>
            <option value="">Pilih</option>
            <option value="makanan">Makanan</option>
            <option value="minuman">Minuman</option>
            <option value="elektronik">Elektronik</option>
          </select>
        </div>
        <button type="submit">Simpan Produk</button>
      </form>
    </section>
  );
};

export default FormTambahProduk;