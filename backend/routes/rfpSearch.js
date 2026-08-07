const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const SAM_API_KEY = process.env.SAM_GOV_API_KEY;
const SAM_BASE_URL = 'https://api.sam.gov/opportunities/v2/search';

/**
 * GET /api/rfp/search
 * Searches SAM.gov for RFP opportunities
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword, agency, naics_code, posted_from, posted_to, limit = 10 } = req.query;

    if (!SAM_API_KEY) {
        return res.status(500).json({ error: 'SAM.gov API key is not configured.' });
    }

    const queryParams = new URLSearchParams({
      api_key: SAM_API_KEY,
      limit: limit.toString()
    });

    if (keyword) queryParams.append('title', keyword); // Approximation for keyword search
    if (agency) queryParams.append('agency', agency);
    if (naics_code) queryParams.append('ncode', naics_code);
    if (posted_from) queryParams.append('postedFrom', posted_from);
    if (posted_to) queryParams.append('postedTo', posted_to);
    
    // Add default pt (publish type) to get active opportunities
    queryParams.append('ptype', 'o,p'); // p=presolicitation, o=solicitation

    const url = `${SAM_BASE_URL}?${queryParams.toString()}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`SAM API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform SAM.gov response to our structured format
    const opportunities = (data.opportunitiesData || []).map(opp => ({
        id: opp.noticeId,
        title: opp.title,
        agency: opp.department || opp.agency,
        posted_date: opp.postedDate,
        response_deadline: opp.responseDeadLine,
        naics_code: opp.naicsCode,
        set_aside: opp.typeOfSetAsideDescription,
        solicitation_number: opp.solicitationNumber,
        description_preview: opp.description || 'No description provided.',
        url: opp.uiLink
    }));

    res.json({
        total: data.totalRecords,
        opportunities
    });

  } catch (error) {
    console.error('Error searching RFPs:', error);
    res.status(500).json({ error: 'Failed to search RFPs on SAM.gov' });
  }
});

/**
 * GET /api/rfp/:notice_id
 * Get details for a specific SAM.gov opportunity
 */
router.get('/:notice_id', async (req, res) => {
  try {
    const { notice_id } = req.params;

    if (!SAM_API_KEY) {
        return res.status(500).json({ error: 'SAM.gov API key is not configured.' });
    }

    // Using search API with noticeId as a filter since SAM v2 API details endpoint requires careful parameterization
    const queryParams = new URLSearchParams({
      api_key: SAM_API_KEY,
      noticeId: notice_id,
      limit: '1'
    });

    const url = `${SAM_BASE_URL}?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`SAM API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.opportunitiesData || data.opportunitiesData.length === 0) {
        return res.status(404).json({ error: 'Opportunity not found' });
    }

    const opp = data.opportunitiesData[0];
    
    res.json({
        id: opp.noticeId,
        title: opp.title,
        agency: opp.department || opp.agency,
        posted_date: opp.postedDate,
        response_deadline: opp.responseDeadLine,
        naics_code: opp.naicsCode,
        set_aside: opp.typeOfSetAsideDescription,
        solicitation_number: opp.solicitationNumber,
        description: opp.description || 'No description provided.',
        url: opp.uiLink,
        contact: opp.pointOfContact || []
    });

  } catch (error) {
    console.error('Error fetching RFP details:', error);
    res.status(500).json({ error: 'Failed to fetch RFP details' });
  }
});

module.exports = router;
