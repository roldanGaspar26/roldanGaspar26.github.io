# Smart Task Dashboard

A modern, feature-rich task management web application with a beautiful UI and powerful productivity features.

## Features

- ✅ **Task Management**: Create, edit, delete, and organize tasks
- 📅 **Calendar View**: Visual calendar to see tasks by date
- 🎯 **Priority & Categories**: Organize tasks by priority and category
- 📊 **Dashboard Analytics**: Track productivity with statistics
- 🌙 **Dark Mode**: Toggle between light and dark themes
- 🔔 **Reminders**: Browser notifications for upcoming tasks
- ⏱️ **Time Tracking**: Track time spent on tasks
- 🏷️ **Tags & Subtasks**: Organize tasks with tags and subtasks
- 💾 **Cloud Sync**: Optional Supabase integration for cloud storage
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile

## Setup Instructions

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (optional, only needed for generating env.js from .env file)

### Installation

1. **Clone or download this repository**

2. **Set up environment variables** (optional, for Supabase integration):
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_TABLE=task_state
   SUPABASE_ROW_ID=task_state_singleton
   ```

3. **Generate env.js** (if using Supabase):
   ```bash
   node scripts/generate-env.js
   ```
   This will create `assets/js/env.js` from your `.env` file.

4. **Open the application**:
   - Simply open `index.html` in your web browser, or
   - Use a local web server (recommended):
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Node.js (http-server)
     npx http-server
     
     # Using PHP
     php -S localhost:8000
     ```
   - Then navigate to `http://localhost:8000` in your browser

## Authentication & Data Storage

The app supports two modes:

- **Guest Users**: Data is stored only in browser's localStorage (device-only, completely private)
- **Authenticated Owner**: Data is synced to Supabase cloud storage (accessible from any device)

### How It Works

- **Without Login**: All visitors can use the app with data stored locally on their device
- **With Login**: The owner can log in to sync data to Supabase cloud storage
- **Privacy**: Guest users' data never leaves their device - it's completely private

## Supabase Setup (For Owner Authentication)

**⚠️ IMPORTANT: You must manually update the database schema and configure authentication!**

### 1. Create a Supabase Project

Create a project at [supabase.com](https://supabase.com)

### 2. Update Database Schema

The app now uses per-user data storage. Update your existing table or create a new one:

**If you have an existing table**, migrate it:
```sql
-- Add user_id column
ALTER TABLE task_state 
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remove old primary key constraint (if exists)
ALTER TABLE task_state DROP CONSTRAINT IF EXISTS task_state_pkey;

-- Create new primary key on user_id
ALTER TABLE task_state 
  ADD PRIMARY KEY (user_id);

-- Remove old id column if it exists and is not needed
-- ALTER TABLE task_state DROP COLUMN IF EXISTS id;
```

**If creating a new table**:
```sql
CREATE TABLE task_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tasks JSONB DEFAULT '[]'::jsonb,
  archived_tasks JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Enable Row Level Security (RLS) - REQUIRED

RLS is **required** for authentication to work properly:

```sql
-- Enable RLS
ALTER TABLE task_state ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users can read own data" 
  ON task_state FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" 
  ON task_state FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" 
  ON task_state FOR UPDATE 
  USING (auth.uid() = user_id);
```

### 4. Configure Authentication Providers

In Supabase Dashboard → Authentication → Providers:

- **Email/Password**: Enabled by default
- **Google OAuth**: Enable and configure (requires OAuth credentials)
- **GitHub OAuth**: Enable and configure (requires OAuth credentials)

For OAuth setup, see [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)

### 5. Configure Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- Add your site URL to "Redirect URLs" (e.g., `https://yourdomain.com` or `http://localhost:8000` for local testing)

### 6. Get Your Supabase Credentials

- Go to "Settings" → "API" in Supabase dashboard
- Copy your "Project URL" (this is your `SUPABASE_URL`)
- Copy your "anon public" key (this is your `SUPABASE_ANON_KEY`)

### 7. Add Credentials to `.env`

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_TABLE=task_state
```

**Note**: `SUPABASE_ROW_ID` is no longer needed - the app now uses `user_id` from authentication.

## Usage

### For Guest Users (No Login)
- Use the app immediately - all data is stored locally on your device
- Data is private and never sent to any server
- Data persists in your browser until you clear browser data

### For Owner (With Login)
1. **Login**: Click the "Login" button in the header
2. **Sign Up**: Create an account with email/password or use OAuth (Google/GitHub)
3. **Cloud Sync**: Once logged in, your tasks sync to Supabase cloud storage
4. **Multi-Device**: Access your tasks from any device by logging in
5. **Logout**: Click "Logout" to switch back to local-only mode

### General Features
- **Add Task**: Click the "Add New Task" button
- **Filter Tasks**: Use the filter buttons to view tasks by status, category, or date
- **Edit Task**: Click the edit icon on any task
- **Complete Task**: Check the checkbox on a task
- **View Details**: Click on a task to see full details
- **Calendar View**: Click "Calendar View" to see tasks on a calendar
- **Search**: Click the search icon to search tasks
- **Dark Mode**: Toggle dark mode with the moon/sun icon

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Notes

- **Guest Users**: Data is stored only in browser localStorage - completely private, never sent to servers
- **Authenticated Users**: Data is stored in Supabase with Row Level Security (RLS) policies ensuring users can only access their own data
- The app uses Supabase's anonymous key, which is safe to expose in client-side code
- User input is sanitized to prevent XSS attacks
- OAuth authentication is handled securely by Supabase and OAuth providers
- Session tokens are managed by Supabase Auth and persist securely
- **Important**: RLS policies must be configured correctly for authentication to work securely

## Development

### Project Structure

```
TodoTaskWebsite/
├── index.html          # Main HTML file
├── assets/
│   ├── css/
│   │   └── styles.css  # Custom styles
│   └── js/
│       ├── app.js      # Main application logic
│       └── env.js      # Environment variables (generated)
├── scripts/
│   └── generate-env.js # Script to generate env.js
├── .env                # Environment variables (not in git)
├── .env.example        # Example environment file
└── README.md           # This file
```

## Production Deployment

### Static Hosting

This is a static web application that can be deployed to:

- **Netlify**: Drag and drop the folder or connect to Git
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Push to a GitHub repository and enable Pages
- **AWS S3 + CloudFront**: Upload files to S3 bucket
- **Any web server**: Upload files to your web server

### Before Deploying

1. ✅ Ensure `.env` is configured (if using Supabase)
2. ✅ Run `node scripts/generate-env.js` to generate `env.js`
3. ✅ Test the application locally
4. ✅ Verify Supabase RLS policies are configured correctly
5. ✅ Check that `.env` is in `.gitignore` (never commit secrets!)

### Build Process

No build process is required! The app works as-is. However, you may want to:

- Minify CSS and JavaScript for production
- Optimize images (if you add any)
- Add a service worker for offline support (future enhancement)

## Troubleshooting

### Tasks not syncing to Supabase

- Check that `.env` is configured correctly
- Verify `env.js` was generated: `node scripts/generate-env.js`
- Check browser console for errors
- Verify Supabase table exists and RLS policies allow access

### Dark mode not persisting

- Check browser localStorage is enabled
- Clear browser cache and try again

### Notifications not working

- Ensure browser notification permissions are granted
- Check that the site is served over HTTPS (required for notifications)

## License

This project is open source and available for personal and commercial use.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the project repository.
