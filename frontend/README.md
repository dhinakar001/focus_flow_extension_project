# FocusFlow Frontend

Modern React-based dashboard UI for FocusFlow with TailwindCSS and modular components.

## Features

- 🎨 **Modern Design**: Professional Zoho-level UI with TailwindCSS
- 🧩 **Modular Components**: Reusable UI components based on shadcn/ui patterns
- 📱 **Responsive**: Mobile-first design with grid layouts
- ⚡ **Smooth Animations**: CSS transitions and animations
- 🎯 **Professional Palette**: Carefully chosen color scheme

## Getting Started

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Build

```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   ├── Dashboard/    # Main dashboard
│   │   ├── FocusTimer/   # Timer component
│   │   ├── Analytics/    # Analytics panels
│   │   └── QuickActions/ # Quick actions widget
│   ├── lib/
│   │   └── utils.js      # Utility functions
│   ├── App.jsx           # Root component
│   └── index.css         # Global styles
├── widgets/              # Widget HTML files
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Components

### UI Components

- **Button**: Multiple variants (primary, secondary, outline, ghost, danger, success)
- **Card**: Container component with header, content, footer
- **Badge**: Status indicators with variants
- **Progress**: Progress bar component

### Feature Components

- **FocusTimer**: Interactive focus timer with modes and duration selection
- **AnalyticsPanel**: Dashboard with stats cards and charts
- **QuickActions**: Quick action buttons for common tasks
- **Dashboard**: Main layout component

## Styling

Uses TailwindCSS with a custom configuration:

- Professional color palette (primary, accent, success, warning, danger)
- Custom animations (fade-in, slide-up, scale-in)
- Responsive breakpoints
- Dark mode support (prepared)

## Widget Integration

The widget HTML files in `widgets/` can be embedded in Zoho Cliq. They use React via CDN and TailwindCSS via CDN for standalone operation.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

