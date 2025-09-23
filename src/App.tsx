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
          <SidebarProvider defaultOpen={true}>
            <div className="min-h-screen flex w-full">
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Index />} />
                  
                  {/* Protected routes */}
                  <Route path="/home" element={
                    <ProtectedRoute>
                      <AppSidebar />
                      <main className="flex-1">
                        <Home />
                      </main>
                    </ProtectedRoute>
                  } />
                  <Route path="/study-tracker" element={
                    <ProtectedRoute>
                      <AppSidebar />
                      <main className="flex-1">
                        <StudyTracker />
                      </main>
                    </ProtectedRoute>
                  } />
                  <Route path="/search" element={
                    <ProtectedRoute>
                      <AppSidebar />
                      <main className="flex-1">
                        <WrongNoteSearch />
                      </main>
                    </ProtectedRoute>
                  } />
                  <Route path="/subject/:subjectName" element={
                    <ProtectedRoute>
                      <AppSidebar />
                      <main className="flex-1">
                        <Subject />
                      </main>
                    </ProtectedRoute>
                  } />
                  <Route path="/subject/:subjectName/wrong-notes" element={
                    <ProtectedRoute>
                      <AppSidebar />
                      <main className="flex-1">
                        <WrongNoteSubject />
                      </main>
                    </ProtectedRoute>
                  } />
                  <Route path="/subject/:subjectName/book/:bookName" element={
                    <ProtectedRoute>
                      <AppSidebar />
                      <main className="flex-1">
                        <Book />
                      </main>
                    </ProtectedRoute>
                  } />
                  <Route path="/notes/:subjectName/:bookName/:chapterName" element={
                    <ProtectedRoute>
                      <AppSidebar />
                      <main className="flex-1">
                        <Notes />
                      </main>
                    </ProtectedRoute>
                  } />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </div>
          </SidebarProvider>
        </TooltipProvider>
      </ThemeProvider>
      </SearchProvider>
    </UnifiedDataProvider>
  </AuthProvider>
);

export default App;
