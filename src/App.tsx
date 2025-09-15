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
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <Toaster />
              <Sonner />
              <BrowserRouter>
                {/* Header with Sidebar Trigger */}
                <header className="fixed top-0 left-0 right-0 h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
                  <SidebarTrigger className="ml-4" />
                  <div className="ml-4 font-semibold text-foreground">학습 도우미</div>
                </header>

                <AppSidebar />

                <main className="flex-1 pt-12">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/home" element={<Home />} />
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
