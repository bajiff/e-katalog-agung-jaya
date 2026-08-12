// src/app/page.tsx

import { PrismaClient } from "@/prisma/client";


const getData = async () => {
  const prisma = new PrismaClient();
  const produkBumdes = await prisma.produk.findMany();
  
  return (
    <main>
      {produkBumdes.map(item => (
        <section key={item.id}>
          <h1>{item.nama}</h1>
          <p>{item.harga}</p>
          <p>{item.kategori}</p>
        </section>
      ))}
    </main>
  )
}

export default getData;