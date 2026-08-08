// Rak gudang produk BUMDes (Array yang berisi beberapa Object produk)
const gudangProduk = [
  { id: 1, nama: "Keripik Jagung Pasiragung", kategori: "Pangan", harga: 15000 },
  { id: 2, nama: "Anyaman Bambu", kategori: "Kerajinan", harga: 45000 },
  { id: 3, nama: "Sirup Jagung Manis", kategori: "Pangan", harga: 20000 }
];

// 1. FILTER: Koki magang menyaring khusus kategori "Pangan"
const produkPangan = gudangProduk.filter(item => item.kategori === "Pangan");

// 2. MAP: Koki penyaji membuat daftar teks label untuk display toko
const labelDisplay = gudangProduk.map(item => `${item.nama} - Rp${item.harga}`);

// console.log("Produk Pangan:", produkPangan);
// console.log("Label Display:", labelDisplay);

const daftarNomor = [10,20,30,40];
const getDaftarNomorByNumber = daftarNomor.find(number => number > 20);

console.log(`Mencari nomor lebih dari 20: ${getDaftarNomorByNumber}`);

const mapNamaDanKategori = gudangProduk.map(item => `Nama: ${item.nama}\nKategori: ${item.kategori}`)
// console.log(mapNamaDanKategori.join("\n\n"))

const nama = "Baji";
const peran = "Full-Stack Dev";
// Cara kuno: "Halo, nama saya " + nama + " sebagai " + peran
// Cara modern (Template Literal):
const perkenalan = `Halo, nama saya ${nama} sebagai ${peran}`;
console.log(perkenalan)

// Destructuring
const produkBumdes = {namaProduk: "Keripik Singkong", hargaProduk:12000, stok: 80}

const {namaProduk, hargaProduk} = produkBumdes
console.log(namaProduk, hargaProduk)

