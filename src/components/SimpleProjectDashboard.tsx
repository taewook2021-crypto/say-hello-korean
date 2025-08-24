import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, X, Plus, File, Folder, Upload, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  icon: string;
  goal: string;
  archiveCount: number;
  borderColor: string;
}

interface Item {
  id: string;
  project_id: string;
  item_type: 'archive' | 'folder';
  title?: string | null;
  name?: string | null;
  source_type?: 'text' | 'pdf' | 'link' | null;
  raw_content?: string | null;
  file_url?: string | null;
  link_url?: string | null;
  description?: string | null;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  is_deleted: boolean;
}

const initialProjects: Project[] = [
  {
    id: '1',
    name: '영어 학습',
    icon: '🌱',
    goal: '목표: 입이 트이기 활용',
    archiveCount: 3,
    borderColor: '#8B5CF6' // purple
  },
  {
    id: '2',
    name: '재테크',
    icon: '🌿',
    goal: '목표: 순자산 1000만원',
    archiveCount: 5,
    borderColor: '#22C55E' // green
  },
  {
    id: '3',
    name: '서울대학교 25\'2',
    icon: '🌳',
    goal: '목표: 합격하기',
    archiveCount: 8,
    borderColor: '#EF4444' // red
  },
  {
    id: '4',
    name: '면접 대비',
    icon: '🌱',
    goal: '목표: 자신감 향상',
    archiveCount: 2,
    borderColor: '#6B7280' // gray
  },
  {
    id: '5',
    name: '회계사 시험',
    icon: '🌿',
    goal: '목표: 1차 합격',
    archiveCount: 6,
    borderColor: '#F97316' // orange
  }
];

export const SimpleProjectDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const deleteProject = (projectId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // 프로젝트 카드 클릭 이벤트 방지
    }
    
    const projectToDelete = projects.find(p => p.id === projectId);
    if (projectToDelete && confirm(`"${projectToDelete.name}" 프로젝트를 삭제하시겠습니까?`)) {
      setProjects(projects.filter(p => p.id !== projectId));
      
      // 만약 현재 선택된 프로젝트가 삭제되는 경우 메인 화면으로 돌아가기
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    }
  };

  const ProjectCard: React.FC<{ project: Project }> = ({ project }) => (
    <Card
      className="group relative p-6 cursor-pointer border-l-4 h-48"
      style={{ borderLeftColor: project.borderColor }}
      onClick={() => setSelectedProject(project)}
    >
      {/* 삭제 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 p-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
        onClick={(e) => deleteProject(project.id, e)}
      >
        <X className="w-4 h-4" />
      </Button>

      <div className="h-full flex flex-col justify-between">
        <div>
          <div className="text-3xl mb-3">{project.icon}</div>
          <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">{project.goal}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          아카이브 {project.archiveCount}개
        </div>
      </div>
    </Card>
  );

  const ProjectDetail: React.FC<{ project: Project }> = ({ project }) => {
    const [items, setItems] = useState<Item[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Archive modal state
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [archiveTitle, setArchiveTitle] = useState('');
    const [archiveDescription, setArchiveDescription] = useState('');
    const [archiveSourceType, setArchiveSourceType] = useState<'text' | 'pdf' | 'link'>('text');
    const [archiveContent, setArchiveContent] = useState('');
    const [archiveUrl, setArchiveUrl] = useState('');
    
    // Folder modal state
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [folderName, setFolderName] = useState('');

    const fetchItems = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('items')
          .select('*')
          .eq('project_id', project.id)
          .eq('is_deleted', false);
        
        if (currentFolderId) {
          query = query.eq('parent_id', currentFolderId);
        } else {
          query = query.is('parent_id', null);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setItems((data || []) as Item[]);
      } catch (error) {
        console.error('Error fetching items:', error);
        toast({
          title: "Error",
          description: "Failed to load items",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchItems();
    }, [project.id, currentFolderId]);

    const createArchive = async () => {
      if (!archiveTitle.trim()) return;
      
      try {
        const newItem = {
          project_id: project.id,
          item_type: 'archive' as const,
          title: archiveTitle.trim(),
          description: archiveDescription.trim() || null,
          source_type: archiveSourceType,
          raw_content: archiveSourceType === 'text' ? archiveContent : null,
          link_url: archiveSourceType === 'link' ? archiveUrl : null,
          parent_id: currentFolderId
        };

        const { data, error } = await supabase
          .from('items')
          .insert([newItem])
          .select()
          .single();

        if (error) throw error;

        setItems([data as Item, ...items]);
        setArchiveModalOpen(false);
        setArchiveTitle('');
        setArchiveDescription('');
        setArchiveContent('');
        setArchiveUrl('');
        
        toast({
          title: "Archive created",
          description: "Your archive has been added successfully"
        });
      } catch (error) {
        console.error('Error creating archive:', error);
        toast({
          title: "Error",
          description: "Failed to create archive",
          variant: "destructive"
        });
      }
    };

    const createFolder = async () => {
      if (!folderName.trim()) return;
      
      try {
        const newItem = {
          project_id: project.id,
          item_type: 'folder' as const,
          name: folderName.trim(),
          parent_id: currentFolderId
        };

        const { data, error } = await supabase
          .from('items')
          .insert([newItem])
          .select()
          .single();

        if (error) throw error;

        setItems([data as Item, ...items]);
        setFolderModalOpen(false);
        setFolderName('');
        
        toast({
          title: "Folder created",
          description: "Your folder has been added successfully"
        });
      } catch (error) {
        console.error('Error creating folder:', error);
        toast({
          title: "Error",
          description: "Failed to create folder",
          variant: "destructive"
        });
      }
    };

    return (
      <div className="min-h-screen bg-background p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProject(null)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로
            </Button>
            <h1 className="text-2xl font-bold">{project.name}</h1>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => deleteProject(project.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            프로젝트 삭제
          </Button>
        </div>

        {/* Content Area */}
        <div className="relative w-full min-h-96">
          {/* Center Hub */}
          <div className="flex justify-center mb-8">
            <div className="bg-background border-2 border-primary rounded-lg p-6">
              <h2 className="text-2xl font-bold text-center text-primary">{project.name}</h2>
            </div>
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No items yet. Use the + button to add archives or folders.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="p-4 cursor-pointer hover:bg-accent">
                  <div className="flex items-center gap-3">
                    {item.item_type === 'folder' ? (
                      <Folder className="w-8 h-8 text-blue-500" />
                    ) : (
                      <File className="w-8 h-8 text-green-500" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium">
                        {item.item_type === 'folder' ? item.name : item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      {item.source_type && (
                        <span className="text-xs text-muted-foreground">
                          {item.source_type.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              size="lg"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2">
            <DropdownMenuItem onClick={() => setArchiveModalOpen(true)}>
              <File className="w-4 h-4 mr-2" />
              Add Archive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFolderModalOpen(true)}>
              <Folder className="w-4 h-4 mr-2" />
              Add Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Archive Modal */}
        <Dialog open={archiveModalOpen} onOpenChange={setArchiveModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Archive</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="archive-title">Title *</Label>
                <Input
                  id="archive-title"
                  value={archiveTitle}
                  onChange={(e) => setArchiveTitle(e.target.value)}
                  placeholder="Enter archive title"
                />
              </div>
              
              <div>
                <Label htmlFor="source-type">Source Type</Label>
                <Select value={archiveSourceType} onValueChange={(value: 'text' | 'pdf' | 'link') => setArchiveSourceType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {archiveSourceType === 'text' && (
                <div>
                  <Label htmlFor="archive-content">Content</Label>
                  <Textarea
                    id="archive-content"
                    value={archiveContent}
                    onChange={(e) => setArchiveContent(e.target.value)}
                    placeholder="Enter text content"
                    rows={4}
                  />
                </div>
              )}

              {archiveSourceType === 'link' && (
                <div>
                  <Label htmlFor="archive-url">URL</Label>
                  <Input
                    id="archive-url"
                    value={archiveUrl}
                    onChange={(e) => setArchiveUrl(e.target.value)}
                    placeholder="Enter URL"
                    type="url"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="archive-description">Description</Label>
                <Textarea
                  id="archive-description"
                  value={archiveDescription}
                  onChange={(e) => setArchiveDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setArchiveModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createArchive} disabled={!archiveTitle.trim()}>
                  Create Archive
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Folder Modal */}
        <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="folder-name">Name *</Label>
                <Input
                  id="folder-name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Enter folder name"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFolderModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createFolder} disabled={!folderName.trim()}>
                  Create Folder
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">프로젝트 트리</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
};