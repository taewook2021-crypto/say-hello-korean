import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, Plus } from "lucide-react";
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
      const { data, error } = await (supabase as any)
        .from('subjects')
        .select('name')
        .order('name');
      
      if (error) throw error;
      
      setFolders(data.map((subject: any) => subject.name));
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast({
        title: "오류",
        description: "과목을 불러오는데 실패했습니다.",
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
            <Link key={index} to={`/subject/${encodeURIComponent(folder)}`}>
              <Card className="p-4 text-center cursor-pointer hover:bg-accent">
                <CardContent className="p-0">
                  <FolderOpen className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">{folder}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Home;