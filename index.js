const express = require('express');
const axios = require('axios');
const cors = require('cors'); // ✅ tambahkan ini

const app = express();
const PORT = 3000;

// ✅ aktifkan CORS untuk semua origin
app.use(cors());

app.get('/jagel-nearme', async (req, res) => {
    const { latitude, longitude, page = 1, limit = 12 } = req.query;

    try {
        const response = await axios.get('https://app.jagel.id/api/list/search', {
            params: {
                type: 'nearme',
                param: '',
                latitude,
                longitude,
                label: 'makanan',
                app_view_uid: '617f701ba3b3a'
            },
            headers: {
                'Authorization': 'Bearer ...', // Ganti token jika perlu
                'Origin': 'https://app.linku.co.id',
                'Referer': 'https://app.linku.co.id/',
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        const allItems = response.data.data?.data || [];
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const paginatedItems = allItems.slice(startIndex, startIndex + parseInt(limit));

        res.json({
            success: true,
            page: parseInt(page),
            limit: parseInt(limit),
            total: allItems.length,
            total_pages: Math.ceil(allItems.length / limit),
            items: paginatedItems
        });
    } catch (error) {
        console.error('❌ Gagal ambil data nearme:', error.response?.data || error.message);
        res.status(500).json({ error: 'Gagal mengambil data', detail: error.message });
    }
});

// 2. GET /mitra-detail/:view_uid
app.get('/mitra-detail/:view_uid', async (req, res) => {
    const { view_uid } = req.params;
    const url = `https://app.jagel.id/api/v2/customer/list/${view_uid}`;

    try {
        const response = await axios.get(url, {
            params: { codename: 'iknlinku' },
            headers: {
                'Authorization': 'Bearer ...', // Gunakan token yang valid
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://app.linku.co.id/',
                'Origin': 'https://app.linku.co.id'
            }
        });

        const detail = response.data?.data;
        if (!detail) return res.status(404).json({ message: 'Mitra tidak ditemukan' });

        res.json({
            view_uid,
            seller_rating: detail.seller_rating,
            nama: detail.title ?? '-',
        });
    } catch (error) {
        console.error('❌ Gagal mengambil detail mitra:', error.message);
        res.status(500).json({ error: 'Gagal mengambil detail mitra', detail: error.message });
    }
});

// 3. GET /mitra-produk/:view_uid
app.get('/mitra-produk/:view_uid', async (req, res) => {
    const { view_uid } = req.params;
    const { codename = 'iknlinku', page = 1, search_list = '' } = req.query;

    try {
        const response = await axios.get(`https://app.jagel.id/api/v2/customer/list/${view_uid}/children`, {
            params: { codename, page, search_list },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('❌ Gagal mengambil produk mitra:', error.message);
        res.status(500).json({ error: 'Gagal mengambil produk mitra' });
    }
});

// 4. GET /produk-detail/:view_uid
app.get('/produk-detail/:view_uid', async (req, res) => {
    const { view_uid } = req.params;
    const { codename = 'iknlinku' } = req.query;

    try {
        const response = await axios.get(`https://app.jagel.id/api/v2/customer/list/${view_uid}`, {
            params: { codename },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('❌ Gagal mengambil detail produk:', error.message);
        res.status(500).json({ error: 'Gagal mengambil detail produk' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});
