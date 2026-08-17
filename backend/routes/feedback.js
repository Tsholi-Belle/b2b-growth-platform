const express = require('express');
const router = express.Router();
const { saveSurveyFeedback } = require('../services/storageService');

/**
 * POST /api/feedback/survey
 * Submits beta feedback along with automated client technical context to storage
 */
router.post('/survey', async (req, res) => {
  try {
    const {
      rating,
      user_role,
      optimizer_feedback,
      proposal_feedback,
      feature_requests,
      general_comments,
      technical_context
    } = req.body || {};

    if (!rating) {
      return res.status(400).json({ error: 'Rating (1-5) is required' });
    }

    const payload = {
      rating: parseInt(rating, 10),
      user_role: user_role || 'Beta Tester',
      optimizer_feedback: optimizer_feedback || '',
      proposal_feedback: proposal_feedback || '',
      feature_requests: feature_requests || '',
      general_comments: general_comments || '',
      technical_details: {
        userAgent: technical_context?.userAgent || 'Unknown',
        platform: technical_context?.platform || 'Unknown',
        screenResolution: technical_context?.screenResolution || 'Unknown',
        activeTab: technical_context?.activeTab || 'overview',
        currency: technical_context?.currency || 'ZAR',
        lastSimulatedSpend: technical_context?.lastSimulatedSpend || null,
        capturedAt: new Date().toISOString()
      },
      recipient_notification: 'hello@kalixara.com'
    };

    const result = await saveSurveyFeedback(payload);

    console.log(`[FeedbackSurvey] New Beta Feedback recorded [${result.id}]: Rating ${rating}/5 | Sent to hello@kalixara.com`);

    res.status(200).json({
      status: 'success',
      survey_id: result.id,
      storage: result.storage,
      message: 'Feedback received and saved to Google Cloud Storage. Thank you for shaping ArchEngine AI!'
    });
  } catch (err) {
    console.error('Failed to process feedback survey:', err);
    res.status(500).json({ error: 'Internal server error processing survey' });
  }
});

module.exports = router;
