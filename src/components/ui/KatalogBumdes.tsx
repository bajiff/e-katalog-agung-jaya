// src/components/ui/KatalogBumdes.jsx
// import {daftarProduk} from "../../data/index";
import { ProdukCard } from './index';
import { useState, useEffect } from 'react';
import { ProdukBumdes } from '../../App';
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
      produk.map(item => (
        <ProdukCard key={item.id} harga={item.price} nama={item.title} />
      ))
    )}
    </>
  )
}

export default KatalogBumdes;