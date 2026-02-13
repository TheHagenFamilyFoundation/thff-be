export const inviteUser = `
<p>Dear {{ email }},</p>
<br>
<p>You have been invited to join <strong>{{ organizationName }}</strong> on The Hagen Family Foundation portal.</p>
<br>
<p>To get started, please create an account by clicking the link below:</p>
<p><a href="{{ registerLink }}">Create Your Account</a></p>
<p>Or copy and paste this URL into your browser: {{ registerLink }}</p>
<br>
<p>Once you've created your account, you will automatically be added to <strong>{{ organizationName }}</strong>.</p>
<br>
<p>
If you have any questions or comments, please <a href="mailto:support@hagenfamilyfoundation.org" target="_top">contact us.</a>
</p>

Thanks,

<p>THFF Team</p>`;
