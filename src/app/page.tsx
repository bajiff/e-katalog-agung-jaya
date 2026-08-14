// src/app/page.tsx
import { prisma } from '../../lib/prisma';
const Home = async () => {  
  const produks = await prisma.produk.findMany();
  return (
    <main>
      {produks.map(item => (
        <section key={item.id}>
          <h2>{item.nama}</h2>
          <p>{item.deskripsi}</p>
          <p>Price: ${item.harga.toFixed(2)}</p>
          <p>Stok: {item.stok}</p>
          <p>Kategori: {item.kategori}</p>
        </section>
      ))}
    </main>
  )
}

export default Home;