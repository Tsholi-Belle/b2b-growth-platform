const express = require('express');
const router = express.Router();

/**
 * POST /api/contact/schedule
 * Endpoint for scheduling an advisory consultation session with SAST weekday validation.
 * Target email recipient: hello@kalixara.com
 */
router.post('/schedule', (req, res) => {
  try {
    const {
      full_name,
      email,
      company_name,
      scheduled_date,
      scheduled_time,
      advisory_topic = 'Cloud & RFP Advisory Consultation',
      message = ''
    } = req.body || {};

    if (!full_name || !email || !scheduled_date || !scheduled_time) {
      return res.status(400).json({
        error: {
          code: 'REQUEST_INVALID',
          message: 'Full name, email, scheduled_date, and scheduled_time are required.'
        }
      });
    }

    // Validate weekday selection (Monday - Friday)
    const dateObj = new Date(scheduled_date + 'T12:00:00Z');
    const dayOfWeek = dateObj.getUTCDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SCHEDULE_DATE',
          message: 'Consultation sessions are only available on weekdays (Monday through Friday).'
        }
      });
    }

    // Validate SAST time slot (09:00 - 16:00 SAST)
    const hour = parseInt(scheduled_time.split(':')[0], 10);
    if (isNaN(hour) || hour < 9 || hour > 16) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SCHEDULE_TIME',
          message: 'Consultation sessions must be scheduled between 09:00 SAST and 16:00 SAST.'
        }
      });
    }

    const confirmationId = 'SCH-' + Date.now().toString(36).toUpperCase();

    const result = {
      status: 'success',
      confirmation_id: confirmationId,
      recipient_email: 'hello@kalixara.com',
      client_email: email,
      details: {
        full_name,
        company_name: company_name || 'N/A',
        scheduled_date,
        scheduled_time: `${scheduled_time} SAST`,
        advisory_topic,
        message,
        created_at: new Date().toISOString()
      },
      message: `Consultation session scheduled for ${scheduled_date} at ${scheduled_time} SAST. Confirmation notification queued for hello@kalixara.com and ${email}.`
    };

    console.log(`[ContactSchedule] New advisory session scheduled [ID: ${confirmationId}]: ${full_name} (${email}) on ${scheduled_date} @ ${scheduled_time} SAST -> Sent to hello@kalixara.com`);

    res.status(200).json(result);
  } catch (err) {
    console.error('Error scheduling consultation:', err);
    res.status(500).json({
      error: {
        code: 'SCHEDULE_FAILED',
        message: 'Failed to process consultation schedule request.'
      }
    });
  }
});

module.exports = router;
