import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, Plus } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex justify-end mb-6">
        <Button size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="p-4 text-center cursor-pointer hover:bg-accent">
          <CardContent className="p-0">
            <FolderOpen className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">수학</p>
          </CardContent>
        </Card>
        
        <Card className="p-4 text-center cursor-pointer hover:bg-accent">
          <CardContent className="p-0">
            <FolderOpen className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">영어</p>
          </CardContent>
        </Card>
        
        <Card className="p-4 text-center cursor-pointer hover:bg-accent">
          <CardContent className="p-0">
            <FolderOpen className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">과학</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;