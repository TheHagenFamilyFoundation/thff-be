export const inviteUser = `
<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1e293b;">You've Been Invited!</h2>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
    You've been invited to join <strong style="color: #1e293b;">{{ organizationName }}</strong> on The Hagen Family Foundation portal.
</p>
<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
    Create an account to get started. Once you sign up, you'll automatically be added to the organization.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
    <tr>
        <td style="background-color: #008083; border-radius: 8px;">
            <a href="{{ registerLink }}" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                Create Your Account
            </a>
        </td>
    </tr>
</table>
<p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
    Or copy and paste this URL into your browser:
</p>
<p style="margin: 0; font-size: 13px; color: #94a3b8; word-break: break-all;">
    {{ registerLink }}
</p>`;

export const organizationAddedUser = `
<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1e293b;">You've Been Added to an Organization</h2>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
    Your account has been added to <strong style="color: #1e293b;">{{ organizationName }}</strong> on The Hagen Family Foundation portal.
</p>
<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
    Sign in to access your organization dashboard and continue working.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
    <tr>
        <td style="background-color: #008083; border-radius: 8px;">
            <a href="{{ signInLink }}" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                Sign In
            </a>
        </td>
    </tr>
</table>
<p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
    Or copy and paste this URL into your browser:
</p>
<p style="margin: 0; font-size: 13px; color: #94a3b8; word-break: break-all;">
    {{ signInLink }}
</p>`;
