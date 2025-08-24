import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { EnvironmentChecker } from "@/components/EnvironmentChecker";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Home from "./pages/Home";
import OverallCalendar from "./pages/OverallCalendar";
import Notes from "./pages/Notes";
import Subject from "./pages/Subject";
import Book from "./pages/Book";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <div className="min-h-screen">
          <Toaster />
          <Sonner />
          <div className="container mx-auto px-4 py-2">
            <EnvironmentChecker />
          </div>
          <BrowserRouter>
            <SidebarProvider>
              <div className="min-h-screen flex w-full">
                <AppSidebar />
                <main className="flex-1">
                  <header className="h-12 flex items-center border-b px-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold text-primary ml-4">ARO</h1>
                  </header>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/calendar" element={<OverallCalendar />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/subject/:subjectName" element={<Subject />} />
                    <Route path="/book/:subjectName/:bookName" element={<Book />} />
                    <Route path="/notes/:subjectName/:bookName/:chapterName" element={<Notes />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </SidebarProvider>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
