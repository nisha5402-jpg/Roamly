const data = require('../roamly_insights.json');

export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city, hood, persona } = req.query;

  // Validate all params present
  if (!city || !hood || !persona) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // Validate persona is one of the four allowed values
  const VALID_PERSONAS = ['solo', 'family', 'foodie', 'culture'];
  if (!VALID_PERSONAS.includes(persona)) {
    return res.status(400).json({ error: 'Invalid persona' });
  }

  const key = `${city}/${hood}/${persona}`;
  const insight = data[key];

  if (!insight) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Cache for 24 hours on Vercel's CDN — fast for users, zero cost
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  res.status(200).json(insight);
}
