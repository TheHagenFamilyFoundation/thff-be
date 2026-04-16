/**
 * Grant award notification after board meeting.
 * Placeholders: recipientName, organizationName, amountGranted, meetingYear, proposalTitle
 */
export const grantNotificationEmail = `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #1e293b;">
  Dear {{recipientName}},
</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #334155;">
  We are pleased to inform you that <strong>{{organizationName}}</strong> has been awarded a grant from The Hagen Family Foundation following our {{meetingYear}} funding meeting.
</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #334155;">
  <strong>Grant amount:</strong> {{amountGranted}}<br />
  {{#if proposalTitle}}<strong>Project:</strong> {{proposalTitle}}<br />{{/if}}
</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #334155;">
  We are grateful for the work your organization does in the community. This award reflects our confidence in your program and our mission to serve as a catalyst for change.
</p>
<p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: #334155;">
  Sincerely,
</p>
<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #1e293b;">
  <strong>The Hagen Family Foundation</strong><br />
  <span style="color: #64748b; font-size: 14px;">A Catalyst for Change</span>
</p>
`;
