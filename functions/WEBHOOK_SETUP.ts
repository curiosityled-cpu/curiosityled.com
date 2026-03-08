# Typeform Webhook Setup Guide

## Overview
This guide will help you configure the Typeform webhook to properly process Leadership Assessment submissions.

## Prerequisites
- Typeform account with Leadership Assessment form created
- Access to Base44 dashboard (to set environment variables)
- Access to this codebase

---

## Step 1: Set Webhook Secret

1. Go to your Typeform form: https://admin.typeform.com/form/YOUR_FORM_ID
2. Click "Connect" tab
3. Click "Webhooks"
4. Generate a webhook secret (or use existing)
5. Copy the secret
6. In Base44 dashboard, go to Settings → Environment Variables
7. Add: `TYPEFORM_WEBHOOK_SECRET` = `your_secret_here`

---

## Step 2: Get Typeform Field References

### Method A: Via Test Submission (Recommended)

1. Deploy the webhook function (it's already deployed)
2. Get your webhook URL from Base44 dashboard → Functions → typeformWebhook
3. In Typeform, go to Connect → Webhooks
4. Add webhook URL: `https://your-app.base44.io/functions/typeformWebhook`
5. Submit a TEST form response
6. Check the webhook logs in Base44 dashboard → Functions → typeformWebhook → Logs
7. Look for lines like:
   ```
   Answer 1: { field_ref: 'vVWqjMxE', field_type: 'number', value: 8 }
   Answer 2: { field_ref: 'aBcD1234', field_type: 'number', value: 7 }
   ```
8. Copy all the field_ref values

### Method B: Via Typeform API

1. Go to: https://admin.typeform.com/form/YOUR_FORM_ID/create
2. Open browser DevTools → Network tab
3. Look for API call to retrieve form definition
4. Find field refs in the response JSON

---

## Step 3: Update Field Mapping

1. Open `functions/typeformWebhook.js`
2. Find the `FIELD_MAPPING` constant (around line 40)
3. Update with your actual field refs:

```javascript
const FIELD_MAPPING = {
  // Replace these with YOUR actual Typeform field refs from Step 2
  'vVWqjMxE': 'decision_making',        // ← Decision Making questions
  'aBcD1234': 'decision_making',        // ← If multiple questions for same competency
  'xYz56789': 'communication',          // ← Communication questions
  'pQr98765': 'communication',
  'lMn24680': 'resource_management',    // ← Resource Management questions
  'sTu13579': 'stakeholder_management', // ← Stakeholder Management questions
  'vWx86420': 'performance_management', // ← Performance Management questions
  'yZ123456': 'situational_intelligence' // ← Situational Intelligence questions
};
```

**Important Notes:**
- Each Typeform question has a unique field ref (e.g., 'vVWqjMxE')
- If you have multiple questions for one competency, map them all to the same key
- The webhook will calculate the average score for each competency

---

## Step 4: Configure Hidden Fields in Typeform

1. In your Typeform, go to Settings → Hidden fields
2. Add hidden field: `email`
3. When embedding or sharing form, include: `?email={{user_email}}`
4. Example URL: `https://form.typeform.com/to/YOUR_FORM?email=user@example.com`

---

## Step 5: Test End-to-End Flow

### Test Scenario 1: Manual Test

1. Open LeadershipAssessment page
2. Click "Show Test Mode"
3. Click "High Performer"
4. Verify assessment created in database
5. Verify scores are correct

### Test Scenario 2: Real Typeform Submission

1. Get your form URL with email parameter:
   ```
   https://form.typeform.com/to/YOUR_FORM?email=test@example.com
   ```
2. Submit the form
3. Check webhook logs in Base44 dashboard
4. Look for: "✅ Assessment created successfully"
5. Navigate to AssessmentResults page
6. Verify all scores display correctly

### Test Scenario 3: Verify Field Mapping

Submit a test form and check logs for these key indicators:

```
✅ Good mapping:
[Webhook req_xxx] ✅ Mapped vVWqjMxE → decision_making: 8

⚠️ Unmapped field (needs to be added):
[Webhook req_xxx] ⚠️ Unmapped field ref: zZz99999

❌ No scores extracted:
[Webhook req_xxx] Calculated scores: { decision_making: 0, communication: 0, ... }
^ This means field refs are wrong or answers not parsed correctly
```

---

## Step 6: Production Checklist

Before going live:

- [ ] `TYPEFORM_WEBHOOK_SECRET` is set
- [ ] All field refs mapped in `FIELD_MAPPING`
- [ ] Hidden field `email` configured in Typeform
- [ ] Webhook URL added to Typeform Connect panel
- [ ] Test submission processed successfully
- [ ] Assessment record created with all scores > 0
- [ ] AssessmentResults page displays correctly
- [ ] Email notifications sent (if configured)

---

## Troubleshooting

### Problem: Scores are all 0

**Cause:** Field refs not mapped correctly

**Solution:**
1. Submit test form
2. Check logs for "⚠️ Unmapped field ref"
3. Add those refs to FIELD_MAPPING

### Problem: Email not found error

**Cause:** Hidden field not configured

**Solution:**
1. Go to Typeform → Settings → Hidden fields
2. Add `email` field
3. Include in URL: `?email={{user_email}}`

### Problem: Invalid signature error

**Cause:** Webhook secret mismatch

**Solution:**
1. Verify `TYPEFORM_WEBHOOK_SECRET` matches Typeform
2. Check for extra spaces or line breaks
3. Regenerate secret if needed

### Problem: Assessment not appearing in app

**Cause:** RLS permissions or email mismatch

**Solution:**
1. Check user's email matches form submission
2. Verify Assessment entity RLS allows user to read own records
3. Check database for assessment record with correct email

---

## Support

If you encounter issues:

1. Check webhook logs in Base44 dashboard
2. Look for request_id in logs: `[Webhook req_12345]`
3. Review full error message
4. Contact support with request_id

---

## Advanced: Multiple Questions Per Competency

If you have multiple questions per competency, the webhook automatically averages them:

```javascript
const FIELD_MAPPING = {
  // Decision Making - 3 questions
  'dm_q1_ref': 'decision_making',
  'dm_q2_ref': 'decision_making',
  'dm_q3_ref': 'decision_making',
  
  // Communication - 2 questions
  'comm_q1_ref': 'communication',
  'comm_q2_ref': 'communication',
};

// If user answers:
// dm_q1: 8, dm_q2: 9, dm_q3: 7
// Result: decision_making = (8+9+7)/3 = 8 (rounded)
``