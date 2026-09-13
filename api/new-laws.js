const SOURCES = {
  legislation: 'https://www.legislation.gov.uk/new/data.feed?results-count=18',
  bills: 'https://bills-api.parliament.uk/api/v1/Rss/publicbills.rss'
};

const TOPIC_RULES = [
  ['police-powers', /police|constab|search|arrest|custody|crime|criminal|justice|offender/i],
  ['protest-law', /protest|public order|procession|demonstration|assembly|serious disruption/i],
  ['courts', /court|tribunal|procedure|evidence|sentenc|legal aid|justice/i],
  ['housing', /housing|tenan|landlord|rent|lease|property|homeless/i],
  ['benefits', /benefit|social security|universal credit|pension|allowance|welfare/i],
  ['driving', /road|traffic|vehicle|motor|driv|transport|parking/i],
  ['employment', /employ|worker|wage|pay|labour|labor|workplace|industrial/i],
  ['consumer-rights', /consumer|trade|trading|product|service|market|competition|finance|credit/i]
];

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
function classifyJurisdiction(text='') {
  if (/northern ireland|ulster|\bni\b/i.test(text)) return 'northern-ireland';
  if (/scotland|scottish/i.test(text)) return 'scotland';
  if (/wales|welsh|england/i.test(text)) return 'england-wales';
  return 'uk-wide';
}
function classifyTopics(text='') {
  return TOPIC_RULES.filter(([, rule]) => rule.test(text)).map(([topic]) => topic);
}
function enrich(item) {
  const text = `${item.title || ''} ${item.summary || ''}`;
  return { ...item, jurisdiction: classifyJurisdiction(text), topics: classifyTopics(text) };
}
function parseLegislation(xml) {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  return entries.slice(0, 18).map((entry, i) => enrich({
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
  return items.slice(0, 18).map((item, i) => enrich({
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
  const r = await fetch(url, { headers: { 'user-agent': 'RightsRadarUK/1.1 (+https://rightsradaruk.vercel.app)' } });
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
    const sourceHealth = {
      legislation: lawsResult.status === 'fulfilled' ? 'available' : 'unavailable',
      parliamentBills: billsResult.status === 'fulfilled' ? 'available' : 'unavailable'
    };
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      laws,
      bills,
      errors,
      sourceHealth,
      counts: { laws: laws.length, bills: bills.length, total: laws.length + bills.length },
      note: 'Official-source feed. A Bill is a proposal and is not law unless and until enacted.'
    });
  } catch (e) {
    res.status(500).json({ error: 'Unable to load official law feeds right now.' });
  }
};
