export const registerUser = `
<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1e293b;">Welcome to THFF!</h2>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
    Thank you for creating your account. You're all set to get started.
</p>
<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
    From your dashboard, you can create an organization, manage proposals, and upload documents.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
    <tr>
        <td style="background-color: #008083; border-radius: 8px;">
            <a href="{{ loginLink }}" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                Sign In to Your Account
            </a>
        </td>
    </tr>
</table>
<p style="margin: 0 0 8px 0; font-size: 14px; color: #94a3b8;">
    You can also go directly to your <a href="{{ userPageLink }}" style="color: #008083; text-decoration: none;">User Dashboard</a>.
</p>`;

export const createNewPassword = `
<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1e293b;">Create a New Password</h2>
<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
    Please create a new password for your account. Click the button below to get started:
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
    <tr>
        <td style="background-color: #008083; border-radius: 8px;">
            <a href="{{ resetLink }}" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                Create Password
            </a>
        </td>
    </tr>
</table>
<p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
    Or copy and paste this URL into your browser:
</p>
<p style="margin: 0 0 24px 0; font-size: 13px; color: #94a3b8; word-break: break-all;">
    {{ resetLink }}
</p>
<p style="margin: 0; font-size: 13px; color: #94a3b8;">
    This link will expire in 24 hours.
</p>`;

export const resetPassword = `
<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1e293b;">Reset Your Password</h2>
<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
    We received a request to reset the password for your account. Click the button below to choose a new password:
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
    <tr>
        <td style="background-color: #008083; border-radius: 8px;">
            <a href="{{ resetLink }}" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                Reset Password
            </a>
        </td>
    </tr>
</table>
<p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
    Or copy and paste this URL into your browser:
</p>
<p style="margin: 0 0 24px 0; font-size: 13px; color: #94a3b8; word-break: break-all;">
    {{ resetLink }}
</p>
<p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">
    This link will expire in 24 hours.
</p>
<p style="margin: 0; font-size: 13px; color: #94a3b8;">
    If you didn't request a password reset, you can safely ignore this email.
</p>`;

export const resetPasswordConfirm = `
<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1e293b;">Password Updated</h2>
<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
    Your password has been successfully changed.
</p>
<p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
    If you didn't make this change, please
    <a href="mailto:support@hagenfamilyfoundation.org" style="color: #008083; text-decoration: none;">contact us immediately</a>.
</p>`;
