import { randomUUID } from "node:crypto";
import { upsertMerchant, upsertServiceItem } from "./db.js";

async function seed() {
  console.log("🌱 Seeding sample merchants...\n");

  // ── Merchant 1: Nasi Lemak Kak Ana ────────────────────────────────────────
  const kakAnaId = randomUUID();
  upsertMerchant({
    id: kakAnaId,
    name: "Nasi Lemak Kak Ana",
    description: "Nasi lemak home-cooked by Kak Ana",
    type: "home_food",
    subcategory: "nasi_lemak",
    address: "No 12, Jalan 3, Taman Sri Rampai",
    phone: "",
    operating_hours: JSON.stringify({
      open: "06:30",
      close: "11:00",
      off_days: ["Sunday"],
    }),
    is_active: 1,
    notes:
      "Sambal memang terbaik. Nasi habis by 10am biasanya. Tambah telur recommended.",
  });
  console.log("✓ Merchant: Nasi Lemak Kak Ana");

  const kakAnaItems = [
    {
      name: "Nasi Lemak Biasa",
      price: 3.5,
      category: "main",
      popular: 1,
      description: "",
    },
    {
      name: "NL + Telur",
      price: 5.0,
      category: "main",
      popular: 1,
      description: "Nasi lemak dengan telur goreng",
    },
    {
      name: "NL + Ayam",
      price: 7.0,
      category: "main",
      popular: 0,
      description: "Nasi lemak dengan ayam goreng",
    },
    {
      name: "Sambal Extra",
      price: 1.0,
      category: "addon",
      popular: 0,
      description: "",
    },
    {
      name: "Teh Tarik",
      price: 2.0,
      category: "drink",
      popular: 1,
      description: "",
    },
  ];

  for (const item of kakAnaItems) {
    upsertServiceItem({
      id: randomUUID(),
      merchant_id: kakAnaId,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      is_available: 1,
      popular: item.popular,
      image_url: null,
    });
    console.log(`  + ${item.name} — RM${item.price.toFixed(2)}`);
  }

  // ── Merchant 2: Warung Pak Ali ─────────────────────────────────────────────
  const pakAliId = randomUUID();
  upsertMerchant({
    id: pakAliId,
    name: "Warung Pak Ali",
    description: "Nasi campur warung by Pak Ali",
    type: "kedai_makan",
    subcategory: "nasi_campur",
    address: "Lot 5, Kedai Taman Sri Rampai",
    phone: "",
    operating_hours: JSON.stringify({
      open: "11:00",
      close: "15:00",
      off_days: ["Friday"],
    }),
    is_active: 1,
    notes:
      "Lauk ayam goreng berempah paling laris. Ramai orang lunch hour 12-1pm.",
  });
  console.log("\n✓ Merchant: Warung Pak Ali");

  const pakAliItems = [
    {
      name: "Nasi + 1 Lauk",
      price: 5.0,
      category: "main",
      popular: 0,
      description: "",
    },
    {
      name: "Nasi + 2 Lauk",
      price: 7.0,
      category: "main",
      popular: 1,
      description: "",
    },
    {
      name: "Nasi + 3 Lauk",
      price: 9.0,
      category: "main",
      popular: 0,
      description: "",
    },
    {
      name: "Ayam Goreng Berempah",
      price: 4.0,
      category: "side",
      popular: 1,
      description: "Lauk ayam goreng berempah signature",
    },
    {
      name: "Air Sirap Limau",
      price: 2.5,
      category: "drink",
      popular: 0,
      description: "",
    },
  ];

  for (const item of pakAliItems) {
    upsertServiceItem({
      id: randomUUID(),
      merchant_id: pakAliId,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      is_available: 1,
      popular: item.popular,
      image_url: null,
    });
    console.log(`  + ${item.name} — RM${item.price.toFixed(2)}`);
  }

  // ── Merchant 3: Kuih Makcik Ros ───────────────────────────────────────────
  const makcikRosId = randomUUID();
  upsertMerchant({
    id: makcikRosId,
    name: "Kuih Makcik Ros",
    description: "Kuih tradisional buatan Makcik Ros",
    type: "home_food",
    subcategory: "kuih",
    address: "No 45, Jalan 7, Taman Sri Rampai",
    phone: "",
    operating_hours: JSON.stringify({
      open: "07:00",
      close: "12:00",
      off_days: [],
    }),
    is_active: 1,
    notes:
      "Kuih seri muka dan onde-onde paling best. Order sebelum 9am untuk availability.",
  });
  console.log("\n✓ Merchant: Kuih Makcik Ros");

  const makcikRosItems = [
    {
      name: "Seri Muka",
      price: 1.5,
      category: "main",
      popular: 1,
      description: "",
    },
    {
      name: "Onde-onde",
      price: 2.0,
      category: "main",
      popular: 1,
      description: "",
    },
    {
      name: "Kuih Lapis",
      price: 2.0,
      category: "main",
      popular: 0,
      description: "",
    },
    {
      name: "Epok-epok Sardine",
      price: 3.0,
      category: "main",
      popular: 0,
      description: "",
    },
    {
      name: "Karipap Ayam",
      price: 3.0,
      category: "main",
      popular: 1,
      description: "",
    },
  ];

  for (const item of makcikRosItems) {
    upsertServiceItem({
      id: randomUUID(),
      merchant_id: makcikRosId,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      is_available: 1,
      popular: item.popular,
      image_url: null,
    });
    console.log(`  + ${item.name} — RM${item.price.toFixed(2)}`);
  }

  console.log(
    "\n🎉 Seed complete! Replace with your real neighbourhood kedai data.",
  );
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
