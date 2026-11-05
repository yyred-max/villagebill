# PRD — SplitBill Village (judul kerja)

> Dokumen ini adalah sumber kebenaran untuk AI coding agent. Baca seluruhnya sebelum menulis kode. Baca juga `HACKATHON.md` (live: https://nearhackathon.com/HACKATHON.md) dan ikuti bagian "Never without the human's explicit confirmation".

## 1. Ringkasan
**SplitBill Village** adalah dApp patungan tagihan di **NEAR** dengan tampilan game 2D pixel art. Satu grup patungan = satu desa kecil. Satu tagihan = satu proyek bangunan. Setiap anggota yang membayar porsinya *on-chain* menaikkan tahap bangunan. Saat semua porsi lunas, bangunan selesai dan tiap anggota bisa mengklaim lencana NFT sebagai bukti lunas.

- **Basis:** port dari proyek Stellar Soroban `SplitBill` (https://github.com/yyred-max/Stellar-meetup). Kode lama = **baseline**, hanya integrasi NEAR yang dibangun selama 1-14 Nov 2026 yang dinilai.
- **Track target:** `games` (utama), `realworld`, `nfts` (boleh lebih dari satu).
- **Bahasa UI:** Inggris (juri internasional). **Bahasa README untuk juri:** Inggris.

## 2. Masalah dan tujuan
**Masalah:** patungan tagihan sering molor, tidak transparan, dan canggung menagih.
**Tujuan produk:**
1. Pembayaran porsi yang transparan dan terverifikasi *on-chain*.
2. Pengalaman yang menyenangkan sehingga pengguna mau kembali (game loop), dan pemain non-crypto tidak merasa memakai blockchain.
3. Demo yang bisa dicoba juri dengan langkah "lakukan X, lihat Y".

**Bukan tujuan (non-goals):** dunia terbuka ala Minecraft, multiplayer real-time, marketplace NFT, token sendiri, deploy mainnet untuk fitur inti, privasi/enkripsi porsi.

## 3. Pengguna dan skenario
| Peran | Kebutuhan |
|---|---|
| **Owner** (penalang tagihan) | Membuat grup, menambah anggota dan porsinya, menerima pembayaran |
| **Member** | Melihat porsinya, membayar, mendapat progres dan lencana |

**Skenario utama (demo):** Owner membuat grup "Makan Malam" -> menambah 2 anggota dengan porsi -> anggota membayar -> bangunan naik tahap di peta -> semua lunas, bangunan selesai -> anggota mengklaim lencana NFT -> XP dan level naik di leaderboard.

## 4. Fitur dan prioritas
### P0 — Inti (wajib selesai)
| ID | Fitur | Keterangan |
|---|---|---|
| F1 | Connect wallet NEAR | Via NEAR Wallet Selector (verifikasi paket dan versi terbaru di https://docs.near.org/) |
| F2 | Buat grup | Owner memberi nama grup |
| F3 | Tambah anggota + porsi | Anggota ditambahkan lewat **akun bernama NEAR** (mis. `rere.testnet`), porsi dalam NEAR |
| F4 | Ubah porsi | Owner boleh mengubah porsi anggota **selama anggota itu belum membayar** |
| F5 | Bayar porsi | Anggota membayar jumlah tepat sesuai porsi, dana diteruskan ke owner |
| F6 | Feed aktivitas | Log "grup dibuat / anggota ditambah / anggota membayar", diperbarui otomatis (polling) |
| F7 | Error handling dua lapis | Level wallet dan level contract (lihat bagian 6.3) |

### P1 — Pembeda (kerjakan setelah P0 stabil)
| ID | Fitur | Keterangan |
|---|---|---|
| F8 | Lencana NFT bukti lunas | NEP-171; anggota yang sudah bayar mengklaim lencana setelah grup lunas |
| F9 | Statistik, XP, level, leaderboard | Dihitung dari aktivitas on-chain |
| F10 | Daftar penunggak | Anggota yang belum membayar ditampilkan sebagai "proyek macet" |
| F11 | Skin game pixel art 2D | Lihat bagian 7 |

### P2 — Stretch (hanya jika waktu sisa)
| ID | Fitur | Keterangan |
|---|---|---|
| F12 | Bayar dengan token apa pun via NEAR Intents | Penerima mendapat stablecoin. **Tidak ada testnet untuk Intents**: pakai mainnet, akun dev terpisah, nominal sangat kecil, dan quote `dry: true`. Lihat Q-006, Q-007 di HACKATHON.md |

Jika P2 tidak sempat, jangan dipaksakan. P0 + P1 sudah cukup untuk submit.

## 5. Game loop
1. **Mulai:** pemain connect wallet, melihat desa (peta kecil) dengan satu bangunan per grup.
2. **Aksi:** bayar porsi (aksi utama) atau membuat proyek baru.
3. **Imbalan:** bangunan naik tahap (mis. 0% fondasi -> 50% dinding -> 100% selesai), XP bertambah, lencana NFT bisa diklaim.
4. **Alasan kembali:** level, leaderboard, dan "proyek macet" yang menagih kontribusi.

Aturan progres: tahap bangunan = persentase anggota yang sudah lunas (atau persentase total dana terkumpul). Pilih salah satu dan konsisten: **gunakan persentase dana terkumpul**.

## 6. Spesifikasi teknis

### 6.1 Stack
| Komponen | Teknologi |
|---|---|
| Smart contract | Rust + `near-sdk-rs`, `near-contract-standards` untuk NEP-171 |
| Frontend | React + TypeScript + Vite |
| Game layer | Phaser 3 (2D), dirender dalam halaman React |
| Wallet | NEAR Wallet Selector |
| Akses chain | `near-api-js` atau API resmi terbaru (verifikasi di docs) |
| Jaringan | **NEAR testnet** untuk P0 dan P1 |
| Deploy frontend | Vercel (demo hosted, jaga aktif sampai minimal 18 Nov 2026) |

Verifikasi versi paket, endpoint RPC, dan API di dokumentasi resmi sebelum dipakai. Jangan mengandalkan ingatan.

### 6.2 Fungsi contract
| Fungsi | Siapa | Deskripsi |
|---|---|---|
| `create_group(name)` | Owner | Membuat grup, mengembalikan `group_id` |
| `add_member(group_id, member, share)` | Owner | Menambah anggota dan porsi (yoctoNEAR) |
| `update_share(group_id, member, new_share)` | Owner | Hanya jika anggota belum bayar |
| `pay_share(group_id)` (`#[payable]`) | Member | Deposit yang dilampirkan harus sama dengan porsi; dana diteruskan ke owner |
| `claim_badge(group_id)` | Member | Mint NFT jika grup lunas dan pemanggil sudah bayar; satu lencana per anggota per grup |
| `get_groups()` / `get_group(group_id)` | Siapa pun | Data grup |
| `get_members(group_id)` | Siapa pun | Daftar anggota, porsi, status bayar |
| `get_user_stats(account_id)` | Siapa pun | Grup dibuat, porsi dibayar, XP, level |
| `get_leaderboard(limit)` | Siapa pun | Urutan berdasarkan XP, dengan batas jumlah |

Data minimal:
- `Group { id, owner, name, members, status (Open | Settled) }`
- `Member { share, paid }`
- `UserStats { groups_created, shares_paid, xp }`

XP (angka awal, boleh disesuaikan): +10 membuat grup, +20 membayar porsi, +50 saat grup yang diikuti lunas. Level = `xp / 100 + 1`.

### 6.3 Error
| Layer | Error | Kapan |
|---|---|---|
| Wallet | `not_found` | Wallet tidak terdeteksi |
| Wallet | `rejected` | Pengguna menolak koneksi atau signing |
| Wallet | `insufficient_balance` | Saldo NEAR kurang untuk deposit dan gas |
| Contract | `AlreadyPaid` | Anggota membayar porsi yang sudah lunas |
| Contract | `NotAMember` | Akun bukan anggota grup |
| Contract | `IncorrectAmount` | Deposit tidak sama dengan porsi |
| Contract | `NotOwner` | Bukan owner memanggil fungsi khusus owner |
| Contract | `GroupSettled` | Mengubah grup yang sudah lunas |
| Contract | `GroupNotSettled` | Klaim lencana sebelum grup lunas |
| Contract | `BadgeAlreadyClaimed` | Klaim lencana kedua kali |

Semua error contract harus tampil sebagai pesan yang mudah dipahami di UI, bukan teks mentah.

### 6.4 Event
Contract mengeluarkan event log berformat JSON (NEP-297) untuk: grup dibuat, anggota ditambah, porsi diubah, porsi dibayar, grup lunas, lencana diklaim. Frontend memperbarui feed dengan polling method `view` secara berkala (mis. tiap 10 detik) sebagai cara paling sederhana.

### 6.5 Struktur repo (usulan)
```
/
├── contracts/splitbill-near/   # Rust, near-sdk
├── frontend/                   # React + TS + Vite + Phaser
│   ├── src/components/         # WalletConnect, CreateGroup, AddMember, PayShare
│   ├── src/game/               # scene Phaser, sprite, peta
│   ├── src/lib/                # wallet.ts, contract.ts
│   └── public/assets/          # pixel art + file LICENSE/credits
├── README.md                   # untuk juri (Inggris)
├── PRD.md
└── LICENSE                     # MIT
```

## 7. Pixel art 2D
- **Gaya:** satu peta kecil (tile 16x16 atau 32x32), satu set bangunan 3 tahap, avatar sederhana. Tidak ada dunia terbuka.
- **Sumber aset:** gunakan paket aset **gratis berlisensi jelas** (mis. CC0 dari Kenney atau OpenGameArt). Catat sumber dan lisensi di `public/assets/CREDITS.md`.
- **Fallback bila aset belum ada:** gambar bentuk sederhana dengan kode (kotak berwarna di canvas Phaser) supaya alur P0 tidak terblokir.
- **Jangan** membuat sprite lewat API gambar tanpa persetujuan manusia, dan jangan menempelkan API key ke kode.
- Fungsi game tidak boleh bergantung pada aset: tanpa aset, aplikasi tetap bisa dipakai lewat UI biasa.

## 8. Kriteria penerimaan
| Fitur | Diterima jika |
|---|---|
| F1 | Wallet terhubung dan akun tampil; menolak koneksi menampilkan pesan error |
| F2-F3 | Grup dan anggota tersimpan dan terbaca ulang setelah refresh |
| F4 | Porsi anggota yang belum bayar bisa diubah; yang sudah bayar menolak dengan `AlreadyPaid` |
| F5 | Deposit tepat -> status lunas dan dana sampai ke owner; deposit salah -> `IncorrectAmount` |
| F6 | Aktivitas baru muncul di feed tanpa reload manual |
| F7 | Setiap error di tabel 6.3 punya pesan UI dan minimal satu unit test |
| F8 | Lencana hanya bisa diklaim setelah grup lunas, satu kali per anggota |
| F9 | XP dan level berubah sesuai aturan 6.2 dan tampil di leaderboard |
| F11 | Bangunan berubah tahap sesuai persentase dana; tanpa aset tetap berfungsi |

**Tes contract minimum:** 1 skenario sukses penuh (buat -> tambah -> bayar -> lunas -> klaim) + 1 tes untuk tiap error di 6.3. Jalankan dengan `cargo test`.

## 9. Rencana kerja (14 hari)
| Hari | Target |
|---|---|
| 1-2 | Setup repo baru, tandai baseline, kerangka contract, deploy "hello" ke testnet, wallet connect |
| 3-5 | Contract P0 (F2-F5) + tes; frontend form dasar |
| 6-7 | Feed aktivitas, error handling, deploy frontend demo |
| 8-10 | P1: lencana NFT, statistik, leaderboard, penunggak |
| 11-12 | Skin game pixel art (F11) |
| 13 | README, video demo, rapikan bug (desimal/pembulatan dan overflow teks hash dari proyek lama) |
| 14 | Repo publik, post demo di X, submit sebelum **2026-11-14T23:59 UTC** |

P2 (Intents) hanya dikerjakan jika P0 + P1 sudah stabil sebelum hari 11.

## 10. Aturan hackathon yang wajib dipatuhi
- **Baseline:** repo baru dengan commit awal sebagai baseline, atau branch plus tag `pre-hackathon` dan `hackathon-submission`. Satu repo hanya bisa disubmit sekali.
- **README (Inggris, untuk pembaca mesin dan manusia):** apa produknya, masalah yang diselesaikan, cara mencoba dengan langkah "do X - see Y", fitur NEAR yang dipakai, pengungkapan bahwa ini port dari proyek Stellar (beserta tautannya), daftar library, template, dan kode AI, serta bagian yang menaut ke diff periode hackathon.
- **Demo:** video wajib bila demo hanya lokal; demo hosted dijaga aktif minimal sampai 18 Nov 2026.
- **Lisensi:** MIT + file `LICENSE`.
- **Submit:** hanya setelah repo publik dan post X siap. Payload dicetak penuh dan menunggu konfirmasi manusia. Jangan mengarang nilai (nama, email, akun NEAR, dll.).

## 11. Aturan kerja untuk AI agent
1. **Jangan** push, membuat repo publik, memposting, menandatangani transaksi, deploy mainnet, atau submit tanpa konfirmasi eksplisit manusia.
2. **Jangan** commit secret. Kunci dan token hanya lewat environment variable; sediakan `.env.example`.
3. Kerjakan berurutan sesuai prioritas P0 -> P1 -> P2. Selesaikan dan uji satu fitur sebelum pindah.
4. Setiap perubahan: jelaskan file apa yang diubah dan alasannya, supaya manusia bisa meninjau dan memahami kodenya.
5. Verifikasi API, versi paket, dan alamat di dokumentasi resmi, bukan dari ingatan.
6. Jika spesifikasi ambigu atau bertentangan dengan `HACKATHON.md`, **berhenti dan tanya manusia**.
7. Catat penggunaan AI dan library untuk README.

## 12. Keputusan terbuka (diputuskan manusia)
- Nama final proyek.
- Apakah P2 (Intents) dikerjakan.
- Paket aset pixel art yang dipakai.
- Track final yang dipilih saat submit.
