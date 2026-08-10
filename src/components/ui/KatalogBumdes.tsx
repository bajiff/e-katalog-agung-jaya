// src/components/ui/KatalogBumdes.tsx
import { ProdukCard } from '@/components/ui';
import { useState, useEffect } from 'react';
import { ProdukBumdes } from "@/app/page";
const KatalogBumdes = ({dataProduk} : {dataProduk: ProdukBumdes[]}) => {
  const [produk, setProduk] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      const fetchAPI = await fetch("https://fakestoreapi.com/products?limit=5")
      const response = await fetchAPI.json()
      setProduk(response);
      setIsLoading(false);
    }

    getData()
  }, []);
  return (
    <>
    {isLoading ? (
      <p>Sedang memuat data dari gudang...</p>
    ) : (
      dataProduk.map(item => (
        <ProdukCard key={item.id} harga={item.harga} nama={item.nama} />
      ))
    )}
    </>
  )
}

export default KatalogBumdes;