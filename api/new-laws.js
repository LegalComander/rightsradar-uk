const SOURCES = {
  legislation: 'https://www.legislation.gov.uk/new/data.feed?results-count=12',
  bills: 'https://bills-api.parliament.uk/api/v1/Rss/publicbills.rss'
};

function decodeXml(value='') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? decodeXml(m[1]) : '';
}
function atomLink(block) {
  const alt = block.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  const any = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return (alt || any || [,''])[1];
}
function rssLink(block) {
  const direct = block.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i);
  if (direct) return decodeXml(direct[1]);
  return atomLink(block);
}
function cleanDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function parseLegislation(xml) {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  return entries.slice(0, 12).map((entry, i) => ({
    id: `law-${i}-${tag(entry,'id') || atomLink(entry)}`,
    kind: 'law',
    status: 'Published legislation',
    title: tag(entry, 'title') || 'New legislation',
    url: atomLink(entry),
    date: cleanDate(tag(entry, 'published') || tag(entry, 'updated')),
    summary: tag(entry, 'summary') || tag(entry, 'content'),
    source: 'legislation.gov.uk'
  })).filter(x => x.url && x.title);
}
function parseBills(xml) {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items.slice(0, 12).map((item, i) => ({
    id: `bill-${i}-${tag(item,'guid') || rssLink(item)}`,
    kind: 'bill',
    status: 'Parliamentary Bill — not law yet',
    title: tag(item, 'title') || 'Parliamentary Bill',
    url: rssLink(item),
    date: cleanDate(tag(item, 'pubDate') || tag(item, 'dc:date')),
    summary: tag(item, 'description'),
    source: 'UK Parliament'
  })).filter(x => x.url && x.title);
}

async function getText(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'RightsRadarUK/1.0 (+https://rightsradar-uk-three.vercel.app)' } });
  if (!r.ok) throw new Error(`${r.status} from ${url}`);
  return r.text();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  try {
    const [lawsResult, billsResult] = await Promise.allSettled([
      getText(SOURCES.legislation), getText(SOURCES.bills)
    ]);
    const laws = lawsResult.status === 'fulfilled' ? parseLegislation(lawsResult.value) : [];
    const bills = billsResult.status === 'fulfilled' ? parseBills(billsResult.value) : [];
    const errors = [];
    if (lawsResult.status === 'rejected') errors.push('legislation.gov.uk feed temporarily unavailable');
    if (billsResult.status === 'rejected') errors.push('UK Parliament Bills feed temporarily unavailable');
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      laws,
      bills,
      errors,
      note: 'Official-source feed. A Bill is a proposal and is not law unless and until enacted.'
    });
  } catch (e) {
    res.status(500).json({ error: 'Unable to load official law feeds right now.' });
  }
};
