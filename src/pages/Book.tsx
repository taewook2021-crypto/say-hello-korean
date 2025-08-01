import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

const Book = () => {
  const { subjectName, bookName } = useParams<{ subjectName: string; bookName: string }>();
  const [chapters, setChapters] = useState<string[]>([]);
  const [newChapterName, setNewChapterName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddChapter = () => {
    if (newChapterName.trim()) {
      setChapters([...chapters, newChapterName.trim()]);
      setNewChapterName("");
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <Link to={`/subject/${subjectName}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
        </Link>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{decodeURIComponent(subjectName || "")}</p>
          <h1 className="text-2xl font-bold">{decodeURIComponent(bookName || "")}</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 단원 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="chapterName">단원 이름</Label>
                <Input
                  id="chapterName"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder="단원 이름을 입력하세요"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddChapter();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleAddChapter}>
                  추가
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {chapters.map((chapter, index) => (
          <Link key={index} to="/notes">
            <Card className="p-4 text-center cursor-pointer hover:bg-accent">
              <CardContent className="p-0">
                <FileText className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">{chapter}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      {chapters.length === 0 && (
        <div className="text-center text-muted-foreground mt-12">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>아직 추가된 단원이 없습니다.</p>
          <p>+ 버튼을 눌러 단원을 추가해보세요.</p>
        </div>
      )}
    </div>
  );
};

export default Book;