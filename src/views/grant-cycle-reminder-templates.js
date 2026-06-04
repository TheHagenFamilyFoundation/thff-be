/** Handlebars HTML fragments (wrapped by email layout at send time). */

export const proposalDraftStillIncomplete24h = `
<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1e293b;">Your proposal is still a draft</h2>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
  Hi{{#if recipientFirstName}} {{ recipientFirstName }}{{/if}}, you started a grant proposal for <strong>{{ organizationName }}</strong>
  but it is not finished yet. When you have a moment, please sign in and complete the remaining sections.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px 0; border-radius: 8px; overflow: hidden;">
    <tr>
        <td style="background-color: #fffbeb; padding: 16px 20px; border-left: 4px solid #d97706;">
            <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Project title</p>
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">{{ projectTitle }}</p>
        </td>
    </tr>
</table>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
  <strong>Soft deadline:</strong> we encourage organizations to aim for <strong>{{ softDeadlineDateLabel }}</strong> so the board can review materials in a timely way.
  This is not a hard cutoff—we continue to accept proposals through our board meeting, typically <strong>June or July</strong>, when awards are decided.
</p>
<p style="margin: 0; font-size: 14px; color: #94a3b8;">
  <a href="{{ portalUrl }}" style="color: #0d9488; font-weight: 600;">Open the portal and continue your proposal</a>
</p>`;

export const grantCycleSoftDeadlineTwoWeeks = `
<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1e293b;">Grant portal — gentle reminder ({{ grantYear }})</h2>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
  Hello{{#if recipientFirstName}} {{ recipientFirstName }}{{/if}},
</p>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
  We are about two weeks from our <strong>soft target date of {{ softDeadlineDateLabel }}</strong> for the {{ grantYear }} grant cycle.
  <strong>{{ organizationName }}</strong> has at least one proposal on file for this cycle (submitted or in progress). Please sign in and confirm everything is complete and accurate before that date if you can.
</p>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
  <strong>Important:</strong> May&nbsp;1 is a <em>soft</em> deadline only. We still accept proposals after that date, up through our board meeting in <strong>June/July</strong>, when funding decisions are made.
</p>
<p style="margin: 0; font-size: 14px; color: #94a3b8;">
  <a href="{{ portalUrl }}" style="color: #0d9488; font-weight: 600;">Sign in to the applicant portal</a>
</p>`;

export const grantCycleSoftDeadlineThreeDays = `
<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1e293b;">Wrap up your {{ grantYear }} proposal</h2>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
  Hello{{#if recipientFirstName}} {{ recipientFirstName }}{{/if}},
</p>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
  Our <strong>soft portal target of {{ softDeadlineDateLabel }}</strong> is a few days away. Your organization, <strong>{{ organizationName }}</strong>, has at least one
  open or in-progress proposal for this cycle. If you intend to apply, now is a good time to review and submit—or finish any remaining sections.
</p>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
  Again, this is a <em>soft</em> deadline: we continue to accept proposals through the board meeting in <strong>June/July</strong>. We simply want to make sure nothing is left half-finished by mistake.
</p>
<p style="margin: 0; font-size: 14px; color: #94a3b8;">
  <a href="{{ portalUrl }}" style="color: #0d9488; font-weight: 600;">Open your organization dashboard</a>
</p>`;
