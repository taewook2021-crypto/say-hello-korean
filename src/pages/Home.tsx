import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BookOpen, Plus, Calendar, Search, ChevronRight, MoreVertical, Trash2, Edit, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { TodayReviews } from "@/components/TodayReviews";
import { useToast } from "@/hooks/use-toast";
import PDFAttachmentModal from "@/components/PDFAttachmentModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useData } from "@/contexts/DataContext";

const Home = () => {
  const navigate = useNavigate();
  const [newSubject, setNewSubject] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [booksLoading, setBooksLoading] = useState<{[key: string]: boolean}>({});
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<'subject' | 'book'>('subject');
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [deleteTargetName, setDeleteTargetName] = useState("");
  
  const { toast } = useToast();
  const { subjects, subjectBooks, loading, refreshBooksForSubject, addSubject, deleteSubject, deleteBook } = useData();

  const loadBooksForSubject = async (subjectName: string) => {
    if (subjectBooks[subjectName]) return;
    
    setBooksLoading(prev => ({ ...prev, [subjectName]: true }));
    
    try {
      await refreshBooksForSubject(subjectName);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setBooksLoading(prev => ({ ...prev, [subjectName]: false }));
    }
  };

  async function toggleSubject(subject: string) {
    if (expandedSubject === subject) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subject);
      await loadBooksForSubject(subject);
    }
  }

  async function handleAddSubject() {
    if (!newSubject.trim()) return;

    try {
      await addSubject(newSubject.trim());
      setNewSubject("");
      setShowAddDialog(false);
    } catch (error) {
      // Error already handled in context
    }
  }

  const handleDeleteSubject = async (subjectName: string) => {
    try {
      await deleteSubject(subjectName);
      setShowDeleteConfirmDialog(false);
    } catch (error) {
      // Error already handled in context
    }
  };

  const handleDeleteBook = async (subjectName: string, bookName: string) => {
    try {
      await deleteBook(subjectName, bookName);
      setShowDeleteConfirmDialog(false);
    } catch (error) {
      // Error already handled in context
    }
  };

  const openDeleteDialog = (type: 'subject' | 'book', name: string, subjectName?: string) => {
    setDeleteTargetType(type);
    setDeleteTargetName(name);
    setDeleteTargetId(subjectName || ''); // Store subject name for book deletion
    setShowDeleteConfirmDialog(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Hero Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">내 학습 공간</h1>
            <p className="text-lg text-muted-foreground">
              체계적인 학습으로 성취를 만들어보세요
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              검색
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="h-12"
          >
            <Plus className="h-4 w-4 mr-2" />
            새 과목 추가
          </Button>
          <PDFAttachmentModal>
            <Button 
              variant="outline" 
              className="h-12"
            >
              <Upload className="h-4 w-4 mr-2" />
              PDF 첨부
            </Button>
          </PDFAttachmentModal>
        </div>
      </div>

      {/* Today's Reviews */}
      <div className="mb-12">
        <TodayReviews />
      </div>

      {/* Subjects Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">전체 과목</h2>
          <span className="text-sm text-muted-foreground">{subjects.length}개</span>
        </div>
        
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-1/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {subjects.map((subject) => (
              <div key={subject} className="group">
                <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSubject(subject)}
                    className="p-1 h-8 w-8"
                  >
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform ${
                        expandedSubject === subject ? 'rotate-90' : ''
                      }`} 
                    />
                  </Button>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-lg">{subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      {subjectBooks[subject] ? `${subjectBooks[subject].length}개의 책` : '책을 추가해보세요'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDeleteDialog('subject', subject)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Link 
                      to={`/subject/${encodeURIComponent(subject)}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Expanded Books */}
                {expandedSubject === subject && (
                  <div className="ml-12 mt-2 space-y-1">
                    {booksLoading[subject] ? (
                      <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <div key={index} className="h-8 bg-muted rounded animate-pulse"></div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {subjectBooks[subject]?.map((book) => (
                          <div key={book} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors group/book">
                            <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Link
                              to={`/book/${encodeURIComponent(subject)}/${encodeURIComponent(book)}`}
                              className="text-sm text-foreground flex-1 hover:underline"
                            >
                              {book}
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover/book:opacity-100 transition-opacity">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDeleteDialog('book', book, subject)}>
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Link to={`/book/${encodeURIComponent(subject)}/${encodeURIComponent(book)}`}>
                              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover/book:opacity-100 transition-opacity" />
                            </Link>
                          </div>
                        ))}
                        {(!subjectBooks[subject] || subjectBooks[subject].length === 0) && (
                          <p className="text-sm text-muted-foreground italic p-3">
                            등록된 책이 없습니다
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {subjects.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">아직 과목이 없어요</h3>
                <p className="text-muted-foreground mb-4">첫 번째 과목을 추가해서 학습을 시작해보세요!</p>
                  <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  과목 추가하기
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Subject Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 과목 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="과목명을 입력하세요"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                취소
              </Button>
              <Button onClick={handleAddSubject} disabled={!newSubject.trim()}>
                추가
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTargetName}</strong> {deleteTargetType === 'subject' ? '과목' : '책'}을 삭제하면 관련된 모든 데이터가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteTargetType === 'subject') {
                  handleDeleteSubject(deleteTargetName);
                } else if (deleteTargetType === 'book') {
                  handleDeleteBook(deleteTargetId, deleteTargetName);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Home;
