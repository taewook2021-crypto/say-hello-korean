import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UnifiedDataProvider } from "@/contexts/UnifiedDataContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Notes from "./pages/Notes";
import Subject from "./pages/Subject";
import Book from "./pages/Book";
import Home from "./pages/Home";
import WrongNoteSubject from "./pages/WrongNoteSubject";
import StudyTracker from "./pages/StudyTracker";
import WrongNoteSearch from "./pages/WrongNoteSearch";
import Backup from "./pages/Backup";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const App = () => (
  <AuthProvider>
    <UnifiedDataProvider>
      <SearchProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <SidebarProvider defaultOpen={true}>
              <Routes>
                {/* Public routes - Full screen without sidebar */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/" element={<Index />} />
                
                {/* Protected routes - With persistent sidebar */}
                <Route path="/home" element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <div className="p-4">
                          <SidebarTrigger className="mb-4" />
                          <Home />
                        </div>
                      </main>
                    </div>
                  </ProtectedRoute>
                } />
                <Route path="/study-tracker" element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <div className="p-4">
                          <SidebarTrigger className="mb-4" />
                          <StudyTracker />
                        </div>
                      </main>
                    </div>
                  </ProtectedRoute>
                } />
                <Route path="/search" element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <div className="p-4">
                          <SidebarTrigger className="mb-4" />
                          <WrongNoteSearch />
                        </div>
                      </main>
                    </div>
                  </ProtectedRoute>
                } />
                <Route path="/backup" element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <div className="p-4">
                          <SidebarTrigger className="mb-4" />
                          <Backup />
                        </div>
                      </main>
                    </div>
                  </ProtectedRoute>
                } />
                <Route path="/subject/:subjectName" element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <div className="p-4">
                          <SidebarTrigger className="mb-4" />
                          <Subject />
                        </div>
                      </main>
                    </div>
                  </ProtectedRoute>
                } />
                <Route path="/subject/:subjectName/wrong-notes" element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <div className="p-4">
                          <SidebarTrigger className="mb-4" />
                          <WrongNoteSubject />
                        </div>
                      </main>
                    </div>
                  </ProtectedRoute>
                } />
                <Route path="/subject/:subjectName/book/:bookName" element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <div className="p-4">
                          <SidebarTrigger className="mb-4" />
                          <Book />
                        </div>
                      </main>
                    </div>
                  </ProtectedRoute>
                } />
                <Route path="/notes/:subjectName/:bookName/:chapterName" element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <div className="p-4">
                          <SidebarTrigger className="mb-4" />
                          <Notes />
                        </div>
                      </main>
                    </div>
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
      </SearchProvider>
    </UnifiedDataProvider>
  </AuthProvider>
);

export default App;
