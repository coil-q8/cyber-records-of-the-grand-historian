import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { HomePage } from './pages/HomePage'

const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })))
const ArchivePage = lazy(() => import('./pages/ArchivePage').then((module) => ({ default: module.ArchivePage })))
const EventPage = lazy(() => import('./pages/EventPage').then((module) => ({ default: module.EventPage })))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then((module) => ({ default: module.FavoritesPage })))
const GraphPage = lazy(() => import('./pages/GraphPage').then((module) => ({ default: module.GraphPage })))
const InsightsPage = lazy(() => import('./pages/InsightsPage').then((module) => ({ default: module.InsightsPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const StatisticsPage = lazy(() => import('./pages/StatisticsPage').then((module) => ({ default: module.StatisticsPage })))
const TimelinePage = lazy(() => import('./pages/TimelinePage').then((module) => ({ default: module.TimelinePage })))
const VolumePage = lazy(() => import('./pages/VolumePage').then((module) => ({ default: module.VolumePage })))
const VolumesPage = lazy(() => import('./pages/VolumesPage').then((module) => ({ default: module.VolumesPage })))
const YearPage = lazy(() => import('./pages/YearPage').then((module) => ({ default: module.YearPage })))

export function App() {
  return <BrowserRouter><Suspense fallback={<div className="archive-loading"><span>检索卷宗……</span><i /></div>}><Routes><Route element={<Layout />}><Route index element={<HomePage />} /><Route path="volumes" element={<VolumesPage />} /><Route path="volume/:category" element={<VolumePage />} /><Route path="timeline" element={<TimelinePage />} /><Route path="year/:year" element={<YearPage />} /><Route path="archive" element={<ArchivePage />} /><Route path="event/:id" element={<EventPage />} /><Route path="insights" element={<InsightsPage />} /><Route path="statistics" element={<StatisticsPage />} /><Route path="graph" element={<GraphPage />} /><Route path="favorites" element={<FavoritesPage />} /><Route path="about" element={<AboutPage />} /><Route path="404" element={<NotFoundPage />} /><Route path="*" element={<Navigate to="/404" replace />} /></Route></Routes></Suspense></BrowserRouter>
}
