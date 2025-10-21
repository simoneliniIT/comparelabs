# Customizing Supabase Email Templates

This guide explains how to customize the email templates for your AI Model Comparison app.

## Available Templates

Supabase provides several email templates you can customize:

1. **Confirm signup** - Sent when users register
2. **Invite user** - Sent when inviting users
3. **Magic Link** - Sent for passwordless login
4. **Change Email Address** - Sent when users change their email
5. **Reset Password** - Sent when users request password reset

## How to Customize

### Step 1: Access Email Templates

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Edit the Template

1. Select the template you want to customize (e.g., "Confirm signup")
2. Replace the default HTML with your custom template
3. Click **Save**

### Step 3: Available Variables

Supabase provides these variables you can use in your templates:

- `{{ .ConfirmationURL }}` - The confirmation/action URL
- `{{ .Token }}` - The confirmation token
- `{{ .TokenHash }}` - The hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - The user's email address

### Step 4: Test Your Template

1. Create a test account to see how the email looks
2. Check both desktop and mobile views
3. Test all links to ensure they work correctly

## Custom Template Provided

We've created a custom email template in `docs/supabase-email-template.html` that:

- Matches your app's branding
- Uses a clean, modern design
- Is mobile-responsive
- Includes clear call-to-action buttons
- Provides fallback text links

## Customization Tips

### Colors
- Primary button: `#6366f1` (indigo)
- Text: `#000000` (black) for headings, `#333333` for body
- Background: `#f5f5f5` (light gray)

### Fonts
Uses system fonts for fast loading and consistent appearance across devices.

### Mobile Responsive
The template uses tables for maximum email client compatibility and includes responsive design principles.

## Additional Customizations

You can also customize:

1. **Email sender name**: Settings → Authentication → SMTP Settings
2. **Reply-to address**: Settings → Authentication → SMTP Settings
3. **Rate limiting**: Settings → Authentication → Rate Limits

## Need Help?

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Email Template Best Practices](https://supabase.com/docs/guides/auth/auth-email-templates#best-practices)
