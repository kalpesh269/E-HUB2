const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3030;

app.use(cors());
app.use(express.json());

// Helper: Search phone using public Mobile Specs API
async function searchPhone(query) {
  // 1. Search for a list of matching phones
  const searchResp = await fetch(`https://api-mobilespecs.azharimm.dev/v2/search?query=${encodeURIComponent(query)}`);
  const searchData = await searchResp.json();
  if (!searchData || !searchData.data || !Array.isArray(searchData.data.phones) || searchData.data.phones.length === 0)
    return null;
  const best = searchData.data.phones[0];
  // 2. Lookup full detail for best match
  const slug = best.slug;
  const detailResp = await fetch(`https://api-mobilespecs.azharimm.dev/v2/${slug}`);
  const detailData = await detailResp.json();
  if (!detailData || !detailData.data) return null;
  const d = detailData.data;
  // Convert to common format for frontend table
  return {
    name: d.phone_name,
    image: d.thumbnail || (d.specifications && d.specifications.find(s=>s.title==='Launch')?.specs?.[0]?.val?.[0]) || best.image,
    display: d.specifications?.find(g=>g.title==='Display')?.specs?.map(s=>`${s.key}: ${s.val.join(', ')}`).join(' | ') || '',
    processor: d.specifications?.find(g=>g.title==='Platform')?.specs?.find(s=>/chip|cpu|processor/i.test(s.key))?.val[0] || '',
    ram: (d.specifications?.find(g=>g.title==='Memory')?.specs?.find(s=>/ram/i.test(s.key))?.val[0] || '').replace(/ROM.*$/i, ''),
    storage: d.specifications?.find(g=>g.title==='Memory')?.specs?.find(s=>/storage|internal/i.test(s.key))?.val[0] || '',
    battery: d.specifications?.find(g=>g.title==='Battery')?.specs?.map(s=>s.val.join(', ')).join(' | ') || '',
    os: d.os,
    mainCamera: d.specifications?.find(g=>/camera/i.test(g.title))?.specs?.find(s=>/main|primary/i.test(s.key))?.val[0] || '',
    frontCamera: d.specifications?.find(g=>/camera/i.test(g.title))?.specs?.find(s=>/selfie|front/i.test(s.key))?.val[0] || '',
    refreshRate: d.specifications?.find(g=>g.title==='Display')?.specs?.find(s=>/refresh/i.test(s.key))?.val?.[0] || '',
    build: d.specifications?.find(g=>g.title==='Body')?.specs?.filter(s=>/build|glass|frame|protection/i.test(s.key)).map(s=>s.val.join(', ')).join(' | '),
    weight: d.specifications?.find(g=>g.title==='Body')?.specs?.find(s=>/weight/i.test(s.key))?.val?.[0] || '',
    waterResistance: d.specifications?.find(g=>g.title==='Body')?.specs?.find(s=>/water|resist/i.test(s.key))?.val?.[0] || '',
    wirelessCharging: d.specifications?.find(g=>g.title==='Features')?.specs?.find(s=>/wireless/i.test(s.key))?.val?.[0] || '',
    price: d.specifications?.find(g=>g.title==='Misc')?.specs?.find(s=>/price/i.test(s.key))?.val?.[0] || '',
  };
}

// Placeholder API: laptops/tablets search
async function searchLaptopOrTablet(query, type) {
  // For real deployment use Bing/Google Custom Search API here
  // For demo, return a placeholder result
  return {
    name: query,
    image: '',
    display: '',
    processor: '',
    ram: '',
    storage: '',
    gpu: '',
    battery: '',
    os: '',
    weight: '',
    build: '',
    mainCamera: '',
    frontCamera: '',
    price: '',
  };
}

app.get('/api/search', async (req, res) => {
  const { type, query } = req.query;
  if (!type || !query) return res.status(400).json({ error: 'Missing parameters' });
  try {
    let result = null;
    if (type === 'smartphones' || type === 'smartphone' || type==='phone' || type==='phones') {
      result = await searchPhone(query);
    } else if (type === 'laptops' || type === 'laptop') {
      result = await searchLaptopOrTablet(query, 'laptop');
    } else if (type === 'tablets' || type === 'tablet') {
      result = await searchLaptopOrTablet(query, 'tablet');
    }
    if (result && result.name) {
      return res.json(result);
    }
    return res.status(404).json({ error: 'Not found'});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});