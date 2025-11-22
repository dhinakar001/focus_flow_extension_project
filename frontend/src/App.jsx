/**
 * Main App Component
 * 
 * Root component with error boundary and global error handling
 * 
 * @module App
 */

import React from 'react';
import Dashboard from './components/Dashboard/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;
