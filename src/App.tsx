import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DataProvider } from "@/contexts/DataContext";
import { SearchProvider } from "@/contexts/SearchContext";
import Notes from "./pages/Notes";
import Subject from "./pages/Subject";
import Book from "./pages/Book";
import Home from "./pages/Home";
import WrongNoteSubject from "./pages/WrongNoteSubject";
import StudyTracker from "./pages/StudyTracker";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => (
    <DataProvider>
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
                <AppSidebar />

                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    
                    <Route path="/home" element={<Home />} />
                     <Route path="/study-tracker" element={<StudyTracker />} />
                    <Route path="/subject/:subjectName" element={<Subject />} />
                    <Route path="/subject/:subjectName/wrong-notes" element={<WrongNoteSubject />} />
                    <Route path="/subject/:subjectName/book/:bookName" element={<Book />} />
                    <Route path="/notes/:subjectName/:bookName/:chapterName" element={<Notes />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </BrowserRouter>
            </div>
          </SidebarProvider>
        </TooltipProvider>
      </ThemeProvider>
    </SearchProvider>
  </DataProvider>
);

export default App;
