// src/components/ui/FormTambahProduk.tsx
import { useState } from 'react';

const FormTambahProduk = () => {
  // 1. Buat 3 State untuk menyimpan input pengguna:
  // - namaProduk (nilai awal: string kosong "")
  // - hargaProduk (nilai awal: string kosong "") -> Biarkan string dulu agar mudah saat input form
  // - kategori (nilai awal: string kosong "")
  const [namaProduk, setNamaProduk] = useState("");
  const [hargaProduk, setHargaProduk] = useState("");
  const [kategori, setKategori] = useState("");

  // 2. Buat fungsi penanganan submit
  // Perhatikan cara penulisan tipe data event (e) di TypeScript!
  const tanganiSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // a. Cegat perilaku bawaan browser (reload)
    e.preventDefault();
    // b. Cetak data ke console, misalnya: console.log({ namaProduk, hargaProduk, kategori })
    console.log({namaProduk, hargaProduk, kategori})
    // c. (Opsional/Poin Plus) Kosongkan kembali form dengan men-set ketiga state jadi "" (string kosong)
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