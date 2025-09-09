const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./firebase');
const admin = require('firebase-admin');
const app = express();
app.use(cors());

const PORT = 3000;

// — Semua endpoint seperti sync-nearme, jagel-nearme, mitra-detail, mitra-produk, produk-detail tetap seperti sebelumnya —

// Endpoint untuk nearme
app.get('/jagel-nearme', async (req, res) => {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude dan longitude wajib diisi' });
    }

    try {
        const response = await axios.get('https://app.jagel.id/api/list/search', {
            params: {
                type: 'nearme',
                param: '',
                latitude,
                longitude,
                label: 'ufood',
                app_view_uid: '617f701ba3b3a'
            },
            headers: {
                'Authorization': 'Bearer ...', // Ganti token sesuai kebutuhan
                'Origin': 'https://app.linku.co.id',
                'Referer': 'https://app.linku.co.id/',
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        const mitraList = response.data?.data?.data || [];
        console.log('✅ Jumlah mitra ditemukan:', mitraList.length);

        // Parallel get + enrich data with seller_rating (with caching)
        const enrichedMitraList = await Promise.all(mitraList.map(async mitra => {
            const view_uid = mitra.view_uid;
            if (!view_uid) return null;

            const docRef = db.collection('mitra').doc(view_uid);
            const docSnap = await docRef.get();

            let seller_rating = 4.0;

            if (docSnap.exists) {
                const data = docSnap.data();
                seller_rating = data.seller_rating ?? 4.0;
            } else {
                // 🔍 Fetch detail from jagel if not cached
                try {
                    const detailRes = await axios.get(`https://app.jagel.id/api/v2/customer/list/${view_uid}`, {
                        params: { codename: 'iknlinku' },
                        headers: {
                            'Authorization': 'Bearer ...',
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': 'https://app.linku.co.id/',
                            'Origin': 'https://app.linku.co.id'
                        }
                    });

                    const detail = detailRes.data?.data;
                    seller_rating = detail?.seller_rating ?? 4.0;

                    // Simpan ke Firestore
                    await docRef.set({
                        view_uid: mitra.view_uid,
                        title: mitra.title ?? '-',
                        image: mitra.image ?? '',
                        content: mitra.content ?? '',
                        is_open: mitra.is_open ?? 0,
                        close_status: mitra.close_status ?? '',
                        distance: parseFloat(mitra.distance?.toFixed(4)) || null,
                        seller_rating: seller_rating,
                        created_at: admin.firestore.FieldValue.serverTimestamp()
                    });

                    console.log(`📥 Mitra baru disimpan: ${mitra.title}`);
                } catch (detailErr) {
                    console.error(`❌ Gagal ambil detail untuk ${view_uid}:`, detailErr.message);
                }
            }

            return {
                view_uid: mitra.view_uid,
                title: mitra.title ?? '-',
                image: mitra.image ?? '',
                content: mitra.content ?? '',
                is_open: mitra.is_open ?? 0,
                close_status: mitra.close_status ?? '',
                distance: parseFloat(mitra.distance?.toFixed(4)) || null,
                seller_rating: seller_rating
            };
        }));

        // Filter null jika ada mitra yang error
        const cleanList = enrichedMitraList.filter(Boolean);

        res.json({
            success: true,
            total: cleanList.length,
            items: cleanList
        });

    } catch (error) {
        console.error('❌ Gagal ambil data nearme:', error.response?.data || error.message);
        res.status(500).json({ error: 'Gagal mengambil data', detail: error.message });
    }
});

// Ambil daftar mitra dari Firestore
async function getAllMitraViewUids() {
    const snapshot = await admin.firestore().collection('mitra').get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            view_uid: doc.id,
            nama_mitra: data.title ?? '-',
            distance: data.distance ?? 0
        };
    });
}

// Ambil daftar produk anak dari mitra
async function fetchProdukMitra(view_uid) {
    try {
        const res = await axios.get(`https://app.jagel.id/api/v2/customer/list/${view_uid}/children`, {
            params: { codename: 'iknlinku' },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const produkList = res.data?.data?.data ?? [];
        return Array.isArray(produkList) ? produkList : [];
    } catch (error) {
        console.error(`❌ Gagal ambil produk mitra ${view_uid}:`, error.message);
        return [];
    }
}

// Ambil detail produk (untuk sold, rating, dsb)
async function fetchProdukDetail(view_uid) {
    try {
        const res = await axios.get(`https://app.jagel.id/api/v2/customer/list/${view_uid}`, {
            params: { codename: 'iknlinku' },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        return res.data?.data ?? {};
    } catch (error) {
        console.error(`❌ Gagal ambil detail produk ${view_uid}:`, error.message);
        return {};
    }
}

// Sinkronisasi semua produk dari semua mitra
async function syncProdukMitra() {
    const mitraList = await getAllMitraViewUids(); // [{view_uid, nama_mitra, distance}]

    for (const mitra of mitraList) {
        const { view_uid, nama_mitra, distance } = mitra;
        const produkList = await fetchProdukMitra(view_uid);

        if (!Array.isArray(produkList)) {
            console.warn(`⚠️ Produk dari mitra ${view_uid} bukan array.`);
            continue;
        }

        for (const produk of produkList) {
            if (!produk.view_uid) continue;

            const produkDetail = await fetchProdukDetail(produk.view_uid);

            const finalData = {
                ...produk,
                mitra_uid: view_uid,
                nama_mitra,
                distance,
                sold: produkDetail.sold ?? 0,
                is_open: produkDetail.is_open ?? 0,
                seller_rating: produkDetail.seller_rating ?? 4.0,
                parent_name: produkDetail.parent_name ?? '',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            };

            const produkRef = admin.firestore().collection('produk').doc(produk.view_uid);
            const produkSnap = await produkRef.get();

            if (!produkSnap.exists) {
                await produkRef.set(finalData);
                console.log(`✅ Produk disimpan: ${produk.title} dari ${nama_mitra}`);
            } else {
                // jika ingin update juga, gunakan:
                // await produkRef.set(finalData, { merge: true });
                console.log(`ℹ️ Produk ${produk.title} dari ${nama_mitra} sudah ada`);
            }
        }
    }
}

// Jalankan cron setiap 1 jam
setInterval(() => {
    console.log('⏳ Menjalankan cron job sync produk mitra...');
    syncProdukMitra().catch(console.error);
}, 5 * 60 * 1000); // setiap 5 menit



app.listen(PORT, () => console.log(`🚀 Server jalan di http://localhost:${PORT}`));
