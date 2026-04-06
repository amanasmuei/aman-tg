# Bila Siap? — Merchant Onboarding Playbook

> For onboarding kedai, warung, makcik-makcik jual makanan dari rumah, atau sesiapa jual makanan di taman anda.

---

## Mindset Before You Go

- **You are NOT selling anything.** You're offering a FREE way to get more customers.
- **Zero commitment, zero fees.** Merchant doesn't pay anything. No contract. Handshake deal.
- **You handle everything.** Merchant just cooks / jual like usual. You relay orders via WhatsApp.
- **Be humble.** Speak their language, their dialect, their tempo.
- **Show, don't tell.** Open the app and show them what it looks like.

---

## The 60-Second Pitch (Malay)

### Opening (address them properly)

> "Assalamualaikum Makcik / Kak / Abang / Bang Haji. Saya Aman, tinggal kat [taman/jalan]. Boleh saya curi masa 2 minit je?"

Wait for them to say OK. Don't rush.

### The Hook

> "Saya ada buat satu mini-app dalam Telegram — macam GrabFood, tapi untuk orang-orang area kita je. Tujuan dia nak jimatkan masa orang, tak payah datang tunggu, dan tolong kedai macam kedai makcik ni dapat lagi ramai customer."

### How It Works (Make It Simple)

> "Orang bukak app, pilih kedai makcik, pilih apa nak makan. Then saya terus dapat notification — saya WhatsApp makcik tanya ada ke tak, makcik cakap ada, saya roger balik orang tu, dia tahu bila boleh datang pickup. Bayar macam biasa kat makcik terus — tunai atau DuitNow."

### The "No Risk" Close

> "Makcik tak payah buat apa-apa. Tak payah buat akaun, tak payah download. WhatsApp macam biasa je. Free, takda caj, takda komitmen. Kalau tak suka, cakap je saya, saya delete nama makcik dari app."

### Show Them the App

**Open your phone, open the mini app, show them the Kedai tab.**

> "Tengok ni, macam ni rupa dia. Nanti nama kedai makcik pun muncul macam ni, customer boleh tengok menu makcik, harga, bila buka, semua."

### The Ask

> "Saya nak tolong makcik je. Boleh saya amik gambar menu dengan list harga, dan nombor WhatsApp makcik? Lepas tu malam ni juga nama makcik dah ada dalam app."

---

## Variations (Based On Who You're Talking To)

### Home cook / Bisnes Rumah (e.g., Makcik jual kuih dari rumah)

> "Makcik, saya dengar makcik jual [kuih/nasi lemak/lauk] dari rumah kan? Saya nak tolong makcik senang terima tempahan. Tak payah repeat dekat WhatsApp group lagi — orang boleh order terus dalam satu app."

### Kedai / Warung owner

> "Abang, banyak orang taman kita malas keluar sebab jalan jam, minyak mahal. Kalau ada app yang bagitahu orang bila nasi dah siap, confirm abang jual lagi laris. Lunch hour orang tak yah tunggu, datang pickup je."

### If they're skeptical

> "Abang, saya faham — banyak orang dah cuba macam-macam tapi tak jadi. Yang ni saya bukan nak buat untung dulu, saya nak tolong area kita je. Kalau dalam 1 minggu abang rasa tak worth it, cakap je, saya cabut balik nama abang."

### If they ask "how much?"

> "Zero. Tak berapa sen pun. Memang free untuk MVP phase. Kalau nanti ramai customer dan abang rasa berbaloi, kita bincang pasal subscription kecil-kecilan. Tapi untuk sekarang, saya nak belajar dulu ada demand ke tak."

### If they ask "how does customer pay?"

> "Customer bayar kat makcik/abang directly masa pickup. Tunai atau DuitNow. Saya tak handle duit langsung — saya cuma route orders je."

---

## Data Collection Checklist

**Before you leave the kedai, make sure you have:**

- [ ] **Nama kedai / bisnes** (e.g., "Nasi Lemak Makcik Kiah", "Bisnes Rumah Kak Zai")
- [ ] **Type:**
  - `home_food` — jual dari rumah, tiada fizikal kedai
  - `kedai_makan` — proper kedai/warung/gerai dengan alamat
- [ ] **Subcategory** (e.g., `nasi_lemak`, `kuih`, `nasi_campur`, `roti`, `air_balang`)
- [ ] **Alamat penuh** (nombor rumah / lot / gerai + jalan + taman)
- [ ] **WhatsApp number** (format 60xxxxxxxxxx, no `+`, no dashes)
- [ ] **Operating hours** (e.g., "6.30am - 11am" → `0630-1100`)
- [ ] **Hari tutup** (e.g., Friday, Sunday — atau "takda" if open daily)
- [ ] **Menu lengkap** — photo + list all items:
  - Item name
  - Price (RM)
  - Category (main / side / drink / addon)
  - Is it popular? (⭐)
- [ ] **Notes / local knowledge** — things customers should know:
  - "Sambal memang pedas"
  - "Nasi habis by 10am biasanya"
  - "Booking 1 jam before pickup"
  - "Weekend lagi crowded"

---

## Photo Checklist

Take these photos:

1. **Menu board / harga** (for verification later)
2. **Kedai / rumah exterior** (so customers can recognize the pickup location)
3. **Signature dish** (optional, for marketing)
4. **Owner** (with permission — for trust/social proof)

---

## After You Leave

### Option A — While You're Still Walking (Fastest)

Use the bot commands on your phone (you'll get these after this deploy):

```
/add_merchant Nasi Lemak Kak Ana | home_food | No 12 Jln 3 Taman Sri Rampai | 60123456789 | 0630-1100 | sunday | Sambal terbaik, habis by 10am
```

Then add items:
```
/add_item Kak Ana | Nasi Lemak Biasa | 3.50 | main | 1
/add_item Kak Ana | NL + Telur | 5.00 | main | 1
/add_item Kak Ana | NL + Ayam | 7.00 | main | 0
/add_item Kak Ana | Teh Tarik | 2.00 | drink | 1
```

Verify:
```
/list_merchants
/list_items Kak Ana
```

### Option B — Come Home First

Paste the data here in chat (to Claude) and I'll insert it via API. Tell me:
- Name, type, address, phone, hours, off days, notes
- Menu items (name, price, category, popular?)

---

## The First Order

Once the merchant is in the app:

1. **Send yourself a WhatsApp message** to the merchant: *"Makcik, nanti kalau ada order dari app, saya WhatsApp makcik. Takda apa-apa — nama app tu Bila Siap? kalau customer tanya."*
2. **Tell 3 friends/family** about the app:
   > "Aku buat satu app untuk order makan dari kedai area kita. Try try, aku dah add [Makcik X]. Buka t.me/aman_agent_platform_bot → Open Mini App → Kedai tab → pilih kedai."
3. **Wait for the first real order notification.**
4. **When it comes:**
   - WhatsApp the kedai immediately: *"Assalamualaikum makcik, ada order dari Bila Siap? untuk [item] × [qty]. Total RM[X]. Boleh siap dalam berapa minit?"*
   - Wait for confirmation
   - Reply `/confirm <short_id>` in your bot chat
   - Reply `/ready <short_id>` when the makcik says it's ready
5. **Follow up with the customer** after pickup: *"Okay tak? Nak try kedai lain?"*
6. **Document what broke.** Everything. Write it down.

---

## Metrics to Track (First 2 Weeks)

| Metric | Target Week 1 | Target Week 2 |
|--------|--------------|---------------|
| Real merchants onboarded | 3 | 5-10 |
| Real orders placed | 1 | 5 |
| Successful fulfillments | 1 | 4 |
| Unique customers | 1 | 3 |
| Repeat orders | 0 | 1 |

**If Week 1 hits 1 order, you have something. If Week 2 hits 5 orders and 1 repeat, you have product-market fit signal.**

---

## Common Objections & Answers

| They say... | You say... |
|------------|-----------|
| "Sekarang takda masa" | "Boleh saya datang balik esok pagi/petang?" |
| "Saya tak pandai guna teknologi" | "Makcik tak payah guna apa-apa — saya yang uruskan, makcik buat macam biasa je" |
| "Kang takda order macamana?" | "Tak apa, nama makcik dalam app je dah free promotion. Kalau takda order, takda loss." |
| "Aku dah ada GrabFood/FoodPanda" | "Bagus! Ni tambahan je — GrabFood cut 30%, ni zero cut. Lagi untung untuk makcik." |
| "Boleh saya fikir dulu?" | "Boleh, saya datang balik minggu depan ya. Kalau makcik nak tanya apa-apa, ni nombor saya: [your number]" |
| "Kenapa kau buat ni?" | "Saya orang taman ni juga. Nak buat area kita lagi happening. Nak orang senang beli dari kedai-kedai kita ni." |

---

## Golden Rules

1. **Don't leave without data.** If they agree, collect everything on the spot.
2. **Show them the result.** Open the app and show them their name after you add them.
3. **Set expectation: slow start.** Tell them "mungkin takda order langsung dulu, it's OK. We build awareness together."
4. **Respond FAST when first order comes.** <5 min response time for the first few orders. Speed builds trust on both sides.
5. **Over-communicate with merchants.** Daily update WhatsApp: *"Hari ni 2 orders untuk makcik, semua siap."*
6. **Treat the first 5 merchants like royalty.** They are your design partners, not vendors.

---

## Remember

> **"The first 10 customers of a marketplace are a relationship business, not a tech business."**
>
> — Every YC marketplace founder ever

The code is done. The real work is walking outside and talking to one person. InsyaAllah, you got this. 🏘️
