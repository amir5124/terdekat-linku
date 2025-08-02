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


// KURIR SINTANG
app.get('/jagel-nearme-sintang', async (req, res) => {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    try {
        const url = 'https://app.jagel.id/api/list/search';

        const params = {
            type: 'nearme',
            param: '',
            latitude,
            longitude,
            label: 'makanan',
            app_view_uid: '6106adbdaf37a'
        };


        const headers = {
            'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjQwZmY0NTdkMzFhYTBhZWVhZDBkYTBiMDdkNzAyOGNhYzJjN2E3YjU0ZDNkZDdiNjM2ZTUzNTU0MGUwNGVmMmU5NDM1NDdhYjlmMWU1NjNlIn0.eyJhdWQiOiIxIiwianRpIjoiNDBmZjQ1N2QzMWFhMGFlZWFkMGRhMGIwN2Q3MDI4Y2FjMmM3YTdiNTRkM2RkN2I2MzZlNTM1NTQwZTA0ZWYyZTk0MzU0N2FiOWYxZTU2M2UiLCJpYXQiOjE3NTE4MDIzNjcsIm5iZiI6MTc1MTgwMjM2NywiZXhwIjoxNzgzMzM4MzY3LCJzdWIiOiI0MzA2Nzk5Iiwic2NvcGVzIjpbXX0.SnJlidc8JiNDxrQZV_1O8RoAgB59VGnwszYpejujIJvTCxAsoVLaA5fF39jAPRX90FOHteDnoNutkKW2sQJeeG6S3TyQw5btSi8QCq4E2jnGyV2uc2RQyIMPoIq7SzjIulRQrXmA2PbpG5bbOL4t6U0ieNj5mTYdiCiMeNbc79MwQToT86qoA2qeP7Wgil61tCUZVae5pzVSpU-Eh7KPvzwkAVEKn0s5fmLMtTaDtGAzV496bUz5xB1eCLf9hxuMjmeWHo-EeiB3DHdU5hps97UkENaqgi8A-3LIOp4Q0u1XWMjbvfjT68aTxSnRQB4Te4FIlMPk-bXEEmQaDxTlvC3EXGy1KTQXPe84FG0W6oMxI7TvikcvROh_uXN0D4JW8McWfFWYTTy-FsdLjSFIAstnpqnH366ZxmcSHWrFnGfYd263WpUto3FbmiqAD9MYo_4EUAQ0ovCsRBTKNYKbRc3ltvk0QnaFqPnPl8QhYB0vGA4hbpiBp8oPcj0fbI7xSiJUNbEFwK0JQ1PjH6a3IyPQ1-LyKy7oKINuJVpROtYtNDb2dAYnz34NI_CwfWogjE7Zk_ZOmqRIeMlSIhwL8ULv3N3Yji_mPO_Q_B2goOZdhOTTU4ddpRJ-H9I_xj4ZTqLgY1VMGc_qx99DubQjqUfQJ0UcU_nAORaHf_EOp28',
            'Origin': 'https://kurirstg.umkmdigital.net',
            'Referer': 'https://kurirstg.umkmdigital.net',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
        };

        const response = await axios.get(url, { params, headers });

        // Tampilkan hasil log
        const results = response.data.data?.data || [];

        res.json({ success: true, total: results.length, items: results });
    } catch (error) {
        console.error('❌ Gagal ambil data:', error.response?.data || error.message);
        res.status(500).json({ error: 'Gagal mengambil data', detail: error.message });
    }
});


app.get('/mitra-detail-sintang/:view_uid', async (req, res) => {
    const { view_uid } = req.params;
    const url = `https://app.jagel.id/api/v2/customer/list/${view_uid}`;
    const params = {
        codename: 'kurirstg'
    };

    const headers = {
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjNkYmFkZjU0YWUyMjM3ZjI2NDNkZGQyY2E3YTNhNDViMzg5MzA5MjBhZjUwYmY2YWY3YTBmNGU0YzcyZGY2NDIxNTRjYmQxZjBhMzAyOTdhIn0.eyJhdWQiOiIxIiwianRpIjoiM2RiYWRmNTRhZTIyMzdmMjY0M2RkZDJjYTdhM2E0NWIzODkzMDkyMGFmNTBiZjZhZjdhMGY0ZTRjNzJkZjY0MjE1NGNiZDFmMGEzMDI5N2EiLCJpYXQiOjE3NTE2MzgzOTIsIm5iZiI6MTc1MTYzODM5MiwiZXhwIjoxNzgzMTc0MzkyLCJzdWIiOiIyOTk2NDE1Iiwic2NvcGVzIjpbXX0.Eh7D7_7SHwgLKAW-9bCZ9N6Ek0bdxwpPJgDVvdIrw85GzQMZpsbYcvYQt_dJRtcmJEQClxKqsrJ_JzRuVdbLE4xbl1_9EhWVT9Ho5dZVmIOxYzTBLOLyqPLHPN1TPHOaHZ1ZRcJxkXnMadQS-qVilaYovO57U3ULKErR5C73jOlBAOec66XR75-GBpqamGPAHqsTDAvjUqXX42qE53D2xeSSutNGk743LpKlTpPmMg9viuBrKnUDH3lUj7akpYRmywB9-kjNUHa-uhFbl1BOHb6gBfvag1ml0oXm_9isKKLphMyxlmin-d-akFFB4i3k79z902rpfos7H1KaCc1hVFh5fOZT-xc-2LWyeBTDPRa6-E5_yPRFlJlR-SsCp8_q0KA-uyXfqLgGilbZ2yRd4tkUmfidKoLNrVqvaI9eouzOjK74xN__dD_ZfxxB0ZD1FN96wNZeGXRx2W18byRjjjTtBvF8O3nuTwkVOwxy2Z3LIDkFtPjgifWR8EsjwOIhxD7GAGyXN2jGsUk1H8Av8PsCAuVB4vXwCO7t24UJ8tRCgMZ-OXO4jxpk8kAJGcMd6ashFR9o5BQql6241VnSe240rtms3zUydX7uYo3pNguaADxglvLoOu56Qk9szLSaG3t_8gYR0ZpSsJRkRHRRFKuzTPz2UW8OLOa2rEmZKrM',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://app.linku.co.id/',
        'Origin': 'https://app.linku.co.id'
    };

    try {
        const response = await axios.get(url, { params, headers });
        const detail = response.data?.data;
        console.log(detail, "tail")

        if (!detail) {
            return res.status(404).json({ message: 'Produk tidak ditemukan' });
        }

        const sellerRating = detail.seller_rating;

        res.json({
            view_uid,
            seller_rating: sellerRating,
            nama: detail.title ?? '-',
        });

    } catch (error) {
        console.error('❌ Gagal mengambil detail produk:', error.response?.data || error.message);
        res.status(500).json({ error: 'Gagal mengambil detail produk', detail: error.message });
    }
});

app.get('/mitra-produk-sintang/:view_uid', async (req, res) => {
    const { view_uid } = req.params;
    const { codename = 'kurirstg', page = 1, search_list = '' } = req.query;

    const url = `https://app.jagel.id/api/v2/customer/list/${view_uid}/children`;

    try {
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            params: {
                codename,
                page,
                search_list,
            }
        });

        res.json(response.data);
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Error fetching mitra produk:', error.message);
        res.status(500).json({ error: 'Failed to fetch mitra produk' });
    }
});

app.get('/produk-detail-sintang/:view_uid', async (req, res) => {
    const { view_uid } = req.params;
    const { codename = 'kurirstg' } = req.query;

    const url = `https://app.jagel.id/api/v2/customer/list/${view_uid}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            params: { codename }
        });

        res.json(response.data);
        // console.log('✅ Detail produk berhasil diambil untuk:', view_uid);
    } catch (error) {
        console.error('❌ Gagal ambil produk detail:', error.message);
        res.status(500).json({ error: 'Gagal ambil detail produk' });
    }
});


app.listen(PORT, () => {
    console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});
