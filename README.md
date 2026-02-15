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

## Supabase Setup (Optional)

The app works with local storage by default. To enable cloud sync:

**⚠️ IMPORTANT: You must manually create the table and row in Supabase - they are NOT created automatically!**

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Create the table** in your Supabase database:
   - Go to your Supabase project dashboard
   - Go to "SQL Editor" in the left sidebar
   - Run this SQL command to create the table:
   ```sql
   CREATE TABLE task_state (
     id TEXT PRIMARY KEY,
     tasks JSONB DEFAULT '[]'::jsonb,
     archived_tasks JSONB DEFAULT '[]'::jsonb,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **Insert the initial row** (required - the app expects this specific row ID):
   ```sql
   INSERT INTO task_state (id) VALUES ('task_state_singleton');
   ```

4. **Configure Row Level Security (RLS)** (Optional but Recommended):
   
   **Current Status:** Your table shows "RLS disabled" and "UNRESTRICTED" - this means anyone with your anon key can access it. This is **fine for personal use**, but you can enable RLS for better practices.
   
   **Option A: Keep RLS Disabled (Simplest)**
   - Works fine for personal/single-user apps
   - No additional setup needed
   - Your app will work as-is
   
   **Option B: Enable RLS (Recommended)**
   - Click the "RLS disabled" button in Table Editor to enable it
   - Then create policies in "Authentication" → "Policies":
     ```sql
     -- Allow anyone to read
     CREATE POLICY "Allow public read" ON task_state FOR SELECT USING (true);
     
     -- Allow anyone to insert/update (for single-user app)
     CREATE POLICY "Allow public write" ON task_state FOR INSERT WITH CHECK (true);
     CREATE POLICY "Allow public update" ON task_state FOR UPDATE USING (true);
     ```
   
   **Note:** Since your anon key is public (it's in your JavaScript code), RLS disabled vs enabled with public policies provides the same security level. Enabling RLS is just a best practice.
   
   See `SUPABASE_SECURITY_GUIDE.md` for detailed explanation.

5. **Get your Supabase credentials**:
   - Go to "Settings" → "API" in Supabase dashboard
   - Copy your "Project URL" (this is your `SUPABASE_URL`)
   - Copy your "anon public" key (this is your `SUPABASE_ANON_KEY`)

6. **Add credentials to `.env`**:
   ```bash
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_TABLE=task_state
   SUPABASE_ROW_ID=task_state_singleton
   ```

**Note**: `SUPABASE_TABLE` and `SUPABASE_ROW_ID` match what you created in steps 2-3. You can change these values if you want different names, but make sure they match your database setup.

## Usage

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

- The app uses Supabase's anonymous key, which is safe to expose in client-side code
- All user data is stored locally in the browser by default
- When using Supabase, ensure proper RLS policies are configured
- User input is sanitized to prevent XSS attacks

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
