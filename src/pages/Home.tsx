import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Home = () => {
  const [folders, setFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      console.log('Loading subjects from database...');
      const { data, error } = await (supabase as any)
        .from('subjects')
        .select('name')
        .order('name');
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Subjects loaded:', data);
      setFolders(data?.map((subject: any) => subject.name) || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
      // If database tables don't exist yet, show default subjects
      setFolders([
        "재무회계",
        "세법", 
        "재무관리",
        "원가회계",
        "회계감사"
      ]);
      toast({
        title: "알림",
        description: "기본 과목을 표시합니다. 데이터베이스 설정이 필요합니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const { error } = await (supabase as any)
        .from('subjects')
        .insert({ name: newFolderName.trim() });
      
      if (error) throw error;
      
      setFolders([...folders, newFolderName.trim()]);
      setNewFolderName("");
      setIsDialogOpen(false);
      toast({
        title: "성공",
        description: "새 과목이 추가되었습니다.",
      });
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({
        title: "오류",
        description: "과목 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    try {
      const { error } = await (supabase as any)
        .from('subjects')
        .delete()
        .eq('name', folderName);
      
      if (error) throw error;
      
      setFolders(folders.filter(folder => folder !== folderName));
      toast({
        title: "성공",
        description: "과목이 삭제되었습니다.",
      });
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({
        title: "오류",
        description: "과목 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex justify-end mb-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 폴더 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="folderName">폴더 이름</Label>
                <Input
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="폴더 이름을 입력하세요"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddFolder();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleAddFolder}>
                  추가
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="p-4 text-center animate-pulse">
              <CardContent className="p-0">
                <div className="h-12 w-12 bg-muted rounded mx-auto mb-2" />
                <div className="h-4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          folders.map((folder, index) => (
            <div key={index} className="relative group">
              <Link to={`/subject/${encodeURIComponent(folder)}`}>
                <Card className="p-4 text-center cursor-pointer hover:bg-accent">
                  <CardContent className="p-0">
                    <FolderOpen className="h-12 w-12 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium">{folder}</p>
                  </CardContent>
                </Card>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>폴더 삭제</AlertDialogTitle>
                    <AlertDialogDescription>
                      '{folder}' 폴더를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteFolder(folder)}>
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Home;