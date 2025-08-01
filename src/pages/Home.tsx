import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, Plus } from "lucide-react";
import { useState } from "react";

const Home = () => {
  const [folders, setFolders] = useState([
    "재무회계",
    "세법", 
    "재무관리",
    "원가회계",
    "회계감사"
  ]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      setFolders([...folders, newFolderName.trim()]);
      setNewFolderName("");
      setIsDialogOpen(false);
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
        {folders.map((folder, index) => (
          <Card key={index} className="p-4 text-center cursor-pointer hover:bg-accent">
            <CardContent className="p-0">
              <FolderOpen className="h-12 w-12 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">{folder}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Home;