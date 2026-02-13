/**
 * Branded email layout wrapper for all THFF emails.
 * Wrap template body content with this to get consistent header, footer, and styling.
 *
 * Usage: wrapInLayout(bodyHtml)
 */
export function wrapInLayout(body) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Hagen Family Foundation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 24px 0 16px 0;">
                            <img src="https://thff-static-assets.s3.amazonaws.com/images/logo.png"
                                 alt="The Hagen Family Foundation"
                                 width="80"
                                 style="display: block; width: 80px; height: auto;" />
                        </td>
                    </tr>

                    <!-- Body Card -->
                    <tr>
                        <td style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 40px 36px;">
                            ${body}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 24px 16px 0 16px;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;">
                                The Hagen Family Foundation
                            </p>
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                                <a href="https://hagenfamilyfoundation.org" style="color: #008083; text-decoration: none;">hagenfamilyfoundation.org</a>
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #d1d5db;">
                                Questions? <a href="mailto:support@hagenfamilyfoundation.org" style="color: #008083; text-decoration: none;">support@hagenfamilyfoundation.org</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
