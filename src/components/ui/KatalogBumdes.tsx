// src/components/ui/KatalogBumdes.jsx

import { ProdukCard } from './index';
import { ProdukBumdes } from '../../App';
const KatalogBumdes = ({dataProduk} : {dataProduk: ProdukBumdes[]}) => {
  return (
      dataProduk.map(item => (
        <ProdukCard key={item.id} harga={item.harga} nama={item.nama} />
      ))
  )
}

export default KatalogBumdes;