import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import CompetitorList from './pages/CompetitorList';
import ReportDetail from './pages/ReportDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/competitors" replace />} />
        <Route path="/competitors" element={<CompetitorList />} />
        <Route path="/reports/:date" element={<ReportDetail />} />
        <Route path="*" element={<Navigate to="/competitors" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
