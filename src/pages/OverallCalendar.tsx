import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Clock, ArrowRight, Plus, ChevronLeft, ChevronRight, Check, FolderOpen, Square, Circle } from 'lucide-react';
import { format, addMonths, isSameDay, isAfter, isBefore, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthMock';
import { toast } from 'sonner';

interface OverallScheduleItem {
  id: string;
  title: string;
  type: 'review' | 'deadline' | 'todo';
  date: Date;
  nodeId: string;
  nodeName?: string;
  projectName?: string;
  isCompleted?: boolean;
  isReviewTask?: boolean;
  archiveName?: string;
}

interface TodoItem {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  is_completed: boolean;
  is_review_task: boolean;
  archive_name?: string;
}

interface ProjectNode {
  id: string;
  name: string;
}

const OverallCalendar: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [scheduleItems, setScheduleItems] = useState<OverallScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<OverallScheduleItem | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAddTodoModal, setShowAddTodoModal] = useState(false);
  const [dayTodos, setDayTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState({ title: '', description: '', projectId: '' });
  const [projects, setProjects] = useState<ProjectNode[]>([]);
  const [maxDisplayDate, setMaxDisplayDate] = useState<Date>(addMonths(new Date(), 2));
  const [isLoading, setIsLoading] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (user?.id) {
      loadProjects();
      loadScheduleData();
    }
  }, [user?.id, maxDisplayDate]);

  const loadProjects = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('nodes')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('parent_id', null) // 최상위 프로젝트만
        .order('display_order', { ascending: true });

      setProjects(data || []);
    } catch (error) {
      console.error('프로젝트 로드 오류:', error);
    }
  };

  const loadScheduleData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // 모든 복습 일정 가져오기
      const { data: reviewData } = await supabase
        .from('review_schedule')
        .select(`
          id,
          next_review_date,
          wrong_note_id,
          wrong_notes (
            question,
            subject_name,
            chapter_name
          )
        `)
        .eq('user_id', user.id)
        .lte('next_review_date', maxDisplayDate.toISOString())
        .gte('next_review_date', new Date().toISOString());

      // 모든 노드 마감일 가져오기
      const { data: nodeData } = await supabase
        .from('nodes')
        .select('id, name, deadline, parent_id')
        .eq('user_id', user.id)
        .not('deadline', 'is', null)
        .lte('deadline', maxDisplayDate.toISOString())
        .gte('deadline', new Date().toISOString());

      // 모든 할일 가져오기
      const { data: todoData } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .lte('due_date', maxDisplayDate.toISOString())
        .gte('due_date', new Date().toISOString());

      const items: OverallScheduleItem[] = [];

      // 복습 일정 추가
      if (reviewData) {
        reviewData.forEach((review: any) => {
          if (review.wrong_notes) {
            items.push({
              id: review.id,
              title: review.wrong_notes.question || '복습 노트',
              type: 'review',
              date: new Date(review.next_review_date),
              nodeId: review.wrong_note_id,
              projectName: '복습'
            });
          }
        });
      }

      // 프로젝트 마감일 추가
      if (nodeData) {
        nodeData.forEach((node: any) => {
          const projectName = node.parent_id ? '하위 노드' : node.name;
          items.push({
            id: node.id,
            title: `${node.name} 마감`,
            type: 'deadline',
            date: new Date(node.deadline),
            nodeId: node.id,
            projectName
          });
        });
      }

      // 할일 추가
      if (todoData) {
        todoData.forEach((todo: any) => {
          items.push({
            id: todo.id,
            title: todo.title,
            type: 'todo',
            date: new Date(todo.due_date),
            nodeId: todo.id,
            isCompleted: todo.is_completed,
            isReviewTask: todo.is_review_task,
            archiveName: todo.archive_name,
            projectName: todo.is_review_task ? '복습' : '할일'
          });
        });
      }

      setScheduleItems(items);
    } catch (error) {
      console.error('일정 로드 오류:', error);
      toast.error('일정을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const extendCalendar = () => {
    setMaxDisplayDate(prev => addMonths(prev, 1));
  };

  const getEventsForDate = (date: Date) => {
    return scheduleItems.filter(item => isSameDay(item.date, date));
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    loadDayTodos(date);
    setShowDayModal(true);
  };

  const loadDayTodos = async (date: Date) => {
    if (!user?.id) return;

    try {
      const startDate = startOfDay(date).toISOString();
      const endDate = endOfDay(date).toISOString();

      const { data } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('created_at', { ascending: true });

      setDayTodos(data || []);
    } catch (error) {
      console.error('할일 로드 오류:', error);
    }
  };

  const handleAddTodo = async () => {
    if (!user?.id || !selectedDate || !newTodo.title.trim()) return;

    try {
      const { error } = await supabase
        .from('todos')
        .insert({
          title: newTodo.title.trim(),
          description: newTodo.description.trim() || null,
          due_date: selectedDate.toISOString(),
          user_id: user.id
        });

      if (error) throw error;

      toast.success('할일이 추가되었습니다.');
      setNewTodo({ title: '', description: '', projectId: '' });
      setShowAddTodoModal(false);
      loadDayTodos(selectedDate);
      loadScheduleData();
    } catch (error) {
      console.error('할일 추가 오류:', error);
      toast.error('할일 추가에 실패했습니다.');
    }
  };

  const handleToggleTodo = async (todoId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: !isCompleted })
        .eq('id', todoId);

      if (error) throw error;

      if (selectedDate) {
        loadDayTodos(selectedDate);
      }
      loadScheduleData();
    } catch (error) {
      console.error('할일 상태 변경 오류:', error);
      toast.error('할일 상태 변경에 실패했습니다.');
    }
  };

  const handleEventClick = (event: OverallScheduleItem) => {
    if (event.type === 'todo') {
      // 할일 클릭 시 상세 정보 모달 표시
      setSelectedEvent(event);
      setShowEventModal(true);
    } else {
      // 다른 이벤트는 기존 동작
      setSelectedEvent(event);
      setShowEventModal(true);
    }
  };

  const navigateToNote = () => {
    if (selectedEvent) {
      if (selectedEvent.type === 'todo') {
        if (selectedEvent.isReviewTask && selectedEvent.archiveName) {
          // 파란색 할일(리마인드): 학습 모드 선택 화면으로 이동
          window.location.href = `/notes?archive=${encodeURIComponent(selectedEvent.archiveName)}&study=true`;
        } else if (selectedEvent.archiveName) {
          // 일반 할일인 경우 해당 아카이브로 이동
          window.location.href = `/notes?archive=${encodeURIComponent(selectedEvent.archiveName)}`;
        } else {
          // 일반 할일인 경우 할일 목록으로 이동하거나 상세보기
          toast.success(`${selectedEvent.title} 할일 상세 보기`);
        }
      } else if (selectedEvent.type === 'deadline') {
        // 빨간색 일정(deadline): 아카이브 목록으로 이동
        if (selectedEvent.projectName && selectedEvent.projectName !== '복습') {
          // 아카이브 목록 페이지로 이동 (특정 아카이브를 선택하지 않고 목록만 표시)
          window.location.href = `/notes`;
        } else {
          window.location.href = `/project/${selectedEvent.nodeId}`;
        }
      } else if (selectedEvent.type === 'review') {
        // 파란색 일정(review): 학습 모드 선택 화면으로 이동
        if (selectedEvent.projectName && selectedEvent.projectName !== '복습') {
          window.location.href = `/notes?archive=${encodeURIComponent(selectedEvent.projectName)}&study=true`;
        } else {
          window.location.href = `/project/${selectedEvent.nodeId}`;
        }
      } else {
        // 기타 경우: 프로젝트 페이지로 이동
        window.location.href = `/project/${selectedEvent.nodeId}`;
      }
      setShowEventModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-6 py-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-primary">전체 프로젝트 캘린더</h1>
            <div className="flex gap-2">
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | 'month')}>
                <TabsList>
                  <TabsTrigger value="week">주간</TabsTrigger>
                  <TabsTrigger value="month">월간</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {viewMode === 'week' ? (
            <Card className="w-full">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy년 M월', { locale: ko })} 주간
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-4">
                  {Array.from({ length: 7 }, (_, i) => {
                    const day = addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i);
                    const dayEvents = getEventsForDate(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`p-4 border rounded-lg cursor-pointer min-h-[300px] ${
                          isToday ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleDateClick(day)}
                      >
                        <div className={`font-semibold text-center mb-2 ${isToday ? 'text-primary' : ''}`}>
                          {format(day, 'EEEE', { locale: ko })}
                        </div>
                        <div className={`text-xl text-center mb-4 ${isToday ? 'text-primary font-bold' : ''}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-2">
                           {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className={`text-xs p-2 rounded-md border relative ${
                                event.type === 'deadline' 
                                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                                  : event.type === 'review'
                                  ? 'bg-primary/10 text-primary border-primary/20'
                                  : event.isCompleted
                                  ? 'bg-muted text-muted-foreground border-muted/40 line-through'
                                  : 'bg-accent/50 text-accent-foreground border-accent/40'
                              }`}
                            >
                              <div 
                                className="cursor-pointer hover:bg-black/5 rounded pr-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event);
                                }}
                              >
                                <div className="font-medium truncate">{event.title}</div>
                                <div className="text-xs opacity-75 truncate mt-1">
                                  {event.projectName}
                                </div>
                              </div>
                              {event.type === 'todo' && (
                                <button
                                  className="absolute top-1 right-1 w-4 h-4 rounded-sm bg-white/20 hover:bg-white/40 flex items-center justify-center border border-current/30"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTodo(event.id, event.isCompleted || false);
                                  }}
                                >
                                  {event.isCompleted && <Check className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
                    <div key={day} className="text-center font-medium p-2 text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const start = startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), { weekStartsOn: 1 });
                    const end = endOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), { weekStartsOn: 1 });
                    const days = [];
                    let day = start;
                    
                    while (day <= end) {
                      days.push(day);
                      day = addDays(day, 1);
                    }
                    
                    return days.map((day) => {
                      const dayEvents = getEventsForDate(day);
                      const isToday = isSameDay(day, new Date());
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      
                      return (
                        <div
                          key={day.toISOString()}
                          className={`p-2 border rounded-lg cursor-pointer min-h-[120px] ${
                            isToday ? 'bg-primary/10 border-primary' : 
                            isCurrentMonth ? 'hover:bg-muted/50' : 'bg-muted/20 text-muted-foreground'
                          }`}
                          onClick={() => handleDateClick(day)}
                        >
                          <div className={`text-sm text-center mb-2 ${
                            isToday ? 'text-primary font-bold' : 
                            isCurrentMonth ? '' : 'text-muted-foreground'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded-sm relative flex items-center ${
                                  event.type === 'deadline' 
                                    ? 'bg-destructive/80 text-white'
                                    : event.type === 'review'
                                    ? 'bg-primary/80 text-white'
                                    : event.isCompleted
                                    ? 'bg-muted text-muted-foreground line-through'
                                    : 'bg-accent/80 text-white'
                                }`}
                              >
                                <div 
                                  className="flex-1 cursor-pointer truncate pr-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(event);
                                  }}
                                >
                                  {event.title}
                                </div>
                                {event.type === 'todo' && (
                                  <button
                                    className="w-3 h-3 rounded-sm bg-white/20 hover:bg-white/40 flex items-center justify-center border border-current/30 ml-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTodo(event.id, event.isCompleted || false);
                                    }}
                                  >
                                    {event.isCompleted && <Check className="w-2 h-2" />}
                                  </button>
                                )}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{dayEvents.length - 2}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(addMonths(currentDate, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전 달
                  </Button>
                  <h3 className="text-lg font-semibold">
                    {format(currentDate, 'yyyy년 M월', { locale: ko })}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  >
                    다음 달
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 더 보기 버튼 */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={extendCalendar}
              disabled={isLoading}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              한 달 더 보기
            </Button>
          </div>
        </div>

        {/* 이벤트 상세 모달 */}
        <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>일정 상세</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {selectedEvent.type === 'deadline' ? (
                    <CalendarDays className="h-5 w-5 text-destructive" />
                  ) : (
                    <Clock className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <h3 className="font-semibold">{selectedEvent.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent.projectName} | {format(selectedEvent.date, 'PPP EEEE', { locale: ko })}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={navigateToNote} className="flex-1">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    해당 노트로 이동
                  </Button>
                  <Button variant="outline" onClick={() => setShowEventModal(false)}>
                    닫기
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 일별 일정 모달 */}
        <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedDate && format(selectedDate, 'PPP EEEE', { locale: ko })} 일정
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* 오늘의 일정 */}
              <div>
                <h4 className="font-medium mb-2">일정</h4>
                <div className="space-y-2">
                  {selectedDate && getEventsForDate(selectedDate)
                    .filter(event => event.type !== 'todo')
                    .map((event) => (
                      <div key={event.id} className="flex items-center gap-2 p-2 border rounded">
                        {event.type === 'deadline' ? (
                          <CalendarDays className="h-4 w-4 text-destructive" />
                        ) : (
                          <Clock className="h-4 w-4 text-primary" />
                        )}
                        <div>
                          <span className="text-sm font-medium">{event.title}</span>
                          <div className="text-xs text-muted-foreground">{event.projectName}</div>
                        </div>
                      </div>
                    ))}
                  {selectedDate && getEventsForDate(selectedDate).filter(e => e.type !== 'todo').length === 0 && (
                    <p className="text-sm text-muted-foreground">예정된 일정이 없습니다.</p>
                  )}
                </div>
              </div>

              {/* 할일 목록 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">할일</h4>
                  <Button size="sm" onClick={() => setShowAddTodoModal(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {dayTodos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-2 p-2 border rounded">
                      <div
                        className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center cursor-pointer ${
                          todo.is_completed ? 'bg-primary border-primary' : 'border-muted-foreground'
                        }`}
                        onClick={() => handleToggleTodo(todo.id, todo.is_completed)}
                      >
                        {todo.is_completed && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className={`text-sm flex-1 ${
                        todo.is_completed ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {todo.title}
                        {todo.is_review_task && todo.archive_name && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({todo.archive_name}_Review)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  {dayTodos.length === 0 && (
                    <p className="text-sm text-muted-foreground">할일이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 할일 추가 모달 */}
        <Dialog open={showAddTodoModal} onOpenChange={setShowAddTodoModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>할일 추가</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  placeholder="할일 제목을 입력하세요"
                />
              </div>
              
              <div>
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  placeholder="할일에 대한 상세 설명 (선택사항)"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddTodoModal(false)}>
                취소
              </Button>
              <Button onClick={handleAddTodo} disabled={!newTodo.title.trim()}>
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OverallCalendar;