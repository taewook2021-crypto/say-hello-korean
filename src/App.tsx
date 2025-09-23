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

import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
            <Routes>
              {/* Public routes - Full screen without sidebar */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Index />} />
              
              {/* Protected routes - With sidebar */}
              <Route path="/home" element={
                <ProtectedRoute>
                  <SidebarProvider defaultOpen={true}>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <Home />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } />
              <Route path="/study-tracker" element={
                <ProtectedRoute>
                  <SidebarProvider defaultOpen={true}>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <StudyTracker />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } />
              <Route path="/search" element={
                <ProtectedRoute>
                  <SidebarProvider defaultOpen={true}>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <WrongNoteSearch />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } />
              <Route path="/subject/:subjectName" element={
                <ProtectedRoute>
                  <SidebarProvider defaultOpen={true}>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <Subject />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } />
              <Route path="/subject/:subjectName/wrong-notes" element={
                <ProtectedRoute>
                  <SidebarProvider defaultOpen={true}>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <WrongNoteSubject />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } />
              <Route path="/subject/:subjectName/book/:bookName" element={
                <ProtectedRoute>
                  <SidebarProvider defaultOpen={true}>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <Book />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } />
              <Route path="/notes/:subjectName/:bookName/:chapterName" element={
                <ProtectedRoute>
                  <SidebarProvider defaultOpen={true}>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1">
                        <Notes />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
      </SearchProvider>
    </UnifiedDataProvider>
  </AuthProvider>
);

export default App;
