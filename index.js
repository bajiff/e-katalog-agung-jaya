// Rak gudang produk BUMDes (Array yang berisi beberapa Object produk)
const gudangProduk = [
  { id: 1, nama: "Keripik Jagung Pasiragung", kategori: "Pangan", harga: 15000 },
  { id: 2, nama: "Anyaman Bambu", kategori: "Kerajinan", harga: 45000 },
  { id: 3, nama: "Sirup Jagung Manis", kategori: "Pangan", harga: 20000 }
];

// 1. FILTER: Koki magang menyaring khusus kategori "Pangan"
const produkPangan = gudangProduk.filter((item) => item.kategori === "Pangan");

// 2. MAP: Koki penyaji membuat daftar teks label untuk display toko
const labelDisplay = gudangProduk.map((item) => `${item.nama} - Rp${item.harga}`);

console.log("Produk Pangan:", produkPangan);
console.log("Label Display:", labelDisplay);