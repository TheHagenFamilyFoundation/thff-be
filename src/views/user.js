export const registerUser =
  `<p>Dear {{ email }},</p>
<br>
<p>Thank You for Registering A User Account at THFF</p>
<br>
<p>You can login here:
<a href="{{ loginLink }}">Login</a>
</p> <br>
<P>You can view your user dashboard here. <a href={{ userPageLink }}>User
    Dashboard</a></p>
<br>
<p>If you haven't created an organization, you can create one on the user page.</p>
<br>

<p>
If you have any questions or comments, please <a href="mailto:support@hagen.foundation" target="_top">contact us.</a>
</p>

Thanks,

<p>THFF Team</p>`;

export const createNewPassword = `
<p>Dear {{ email }},</p>
<p>
    Please create a new password. Click on the link below or paste this into your browser to complete the process:
</p>
<a href="{{ resetLink }}">{{ resetLink }}</a>
<p>
    This link will work for 24 hours or until your password is reset.</p>
<p>
    If you have any questions or comments, please <a href="mailto:support@hagen.foundation" target="_top">contact
        us.</a>
</p>

Thanks,

<p>THFF Team</p>`;

export const resetPassword = `
<p>Dear {{ email }},</p>
<p>
    We have received a request to reset the password for your account.
    If you made this request, please click on the link below or paste this into your browser to complete the process:
</p>
<a href="{{ resetLink }}">{{ resetLink }}</a>
<p>
    This link will work for 24 hours or until your password is reset.</p>
<p>
    If you did not ask to change your password, please ignore this email and your account will remain unchanged.
</p>
<p>
    If you have any questions or comments, please <a href="mailto:support@hagen.foundation" target="_top">contact
        us.</a>
</p>

Thanks,

<p>THFF Team</p>`;

export const resetPasswordConfirm = `
<p>Dear
    {{ email }},</p>
<p>
    Your Password was successfully changed.
</p>
<p>
    If you didn’t make this request,
    <a href="mailto:support@hagen.foundation" target="_top">contact Us</a>
</p>`;
