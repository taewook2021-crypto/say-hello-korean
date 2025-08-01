import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

const Subject = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const [books, setBooks] = useState<string[]>([]);
  const [newBookName, setNewBookName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddBook = () => {
    if (newBookName.trim()) {
      setBooks([...books, newBookName.trim()]);
      setNewBookName("");
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{decodeURIComponent(subjectName || "")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 교재 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bookName">교재 이름</Label>
                <Input
                  id="bookName"
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  placeholder="교재 이름을 입력하세요"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddBook();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleAddBook}>
                  추가
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {books.map((book, index) => (
          <Card key={index} className="p-4 text-center cursor-pointer hover:bg-accent">
            <CardContent className="p-0">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">{book}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {books.length === 0 && (
        <div className="text-center text-muted-foreground mt-12">
          <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>아직 추가된 교재가 없습니다.</p>
          <p>+ 버튼을 눌러 교재를 추가해보세요.</p>
        </div>
      )}
    </div>
  );
};

export default Subject;