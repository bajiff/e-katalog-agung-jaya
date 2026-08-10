// src/components/ui/KatalogBumdes.tsx
import { ProdukCard } from '@/components/ui';
import { ProdukBumdes } from "@/app/page";
const KatalogBumdes = ({dataProduk} : {dataProduk: ProdukBumdes[]}) => {
  return (
    dataProduk.map(item => (
      <ProdukCard key={item.id} harga={item.harga} nama={item.nama} />
      )
    )
  )
}

export default KatalogBumdes;