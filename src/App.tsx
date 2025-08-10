import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Notes from "./pages/Notes";
import Subject from "./pages/Subject";
import Book from "./pages/Book";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import OcrDemo from "./pages/OcrDemo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="dark min-h-screen">
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/subject/:subjectName" element={<Subject />} />
            <Route path="/book/:subjectName/:bookName" element={<Book />} />
            <Route path="/notes/:subjectName/:bookName/:chapterName" element={<Notes />} />
            <Route path="/ocr-demo" element={<OcrDemo />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
