import React, { useEffect, useState } from "react";
import { api } from "../api";

// картинки
import keyboard from "../assets/gpro_keyboard.png";
import mouse from "../assets/razer.jpg";
import headset from "../assets/steel.jpg";
import corsair from "../assets/k95.png";
import xbox from "../assets/xbox.jpg";
import dualsense from "../assets/ps5.png";
import hyperx from "../assets/hyperx.webp";
import mousepad from "../assets/razer2.webp";
import g733 from "../assets/log.webp";
import rog from "../assets/asus.webp";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await api.getProducts();
    setProducts(data);
  };

  // 🔥 ЖЕСТКО привязываем изображения по порядку
  const images = [
    keyboard,
    mouse,
    headset,
    hyperx,
    corsair,
    xbox,
    dualsense,
    mousepad,
    g733,
    rog
  ];

  return (
    <div style={{ padding: 30 }}>
      <h1>Gaming Store</h1>

      {products.map((p, index) => (
        <div
          key={p.id}
          style={{
            border: "1px solid #ccc",
            padding: 15,
            marginBottom: 20,
            borderRadius: 10
          }}
        >
          <img
            src={images[index]}
            alt={p.name}
            style={{ width: 200 }}
          />

          <h3>{p.name}</h3>
          <p><b>Категория:</b> {p.category}</p>
          <p>{p.description}</p>
          <p><b>Цена:</b> ${p.price}</p>
          <p><b>В наличии:</b> {p.stock}</p>
          <p><b>Рейтинг:</b> ⭐ {p.rating}</p>
        </div>
      ))}
    </div>
  );
}