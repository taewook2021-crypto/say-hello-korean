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
import { CalendarDays, Clock, ArrowRight, Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { format, addMonths, isSameDay, isAfter, isBefore, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale/ko';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthMock';
import { toast } from 'sonner';

interface ProjectCalendarProps {
  nodeId: string;
  nodeName: string;
  deadline?: Date;
}

interface ScheduleItem {
  id: string;
  title: string;
  type: 'review' | 'deadline' | 'todo';
  date: Date;
  reminderTime?: string;
  nodeId: string;
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

export const ProjectCalendar: React.FC<ProjectCalendarProps> = ({
  nodeId,
  nodeName,
  deadline
}) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<ScheduleItem | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAddTodoModal, setShowAddTodoModal] = useState(false);
  const [dayTodos, setDayTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState({ title: '', description: '' });
  const [maxDisplayDate, setMaxDisplayDate] = useState<Date>(
    deadline || addMonths(new Date(), 1)
  );
  const [isLoading, setIsLoading] = useState(false);

  // 일정 데이터 로드
  useEffect(() => {
    loadScheduleData();
  }, [nodeId, maxDisplayDate]);

  const loadScheduleData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // 복습 일정 가져오기
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

      // 노드 마감일 가져오기
      const { data: nodeData } = await supabase
        .from('nodes')
        .select('id, name, deadline')
        .eq('user_id', user.id)
        .not('deadline', 'is', null)
        .lte('deadline', maxDisplayDate.toISOString())
        .gte('deadline', new Date().toISOString());

      // 할일 가져오기
      const { data: todoData } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .lte('due_date', maxDisplayDate.toISOString())
        .gte('due_date', new Date().toISOString());

      const items: ScheduleItem[] = [];

      // 복습 일정 추가
      if (reviewData) {
        reviewData.forEach((review: any) => {
          if (review.wrong_notes) {
            items.push({
              id: review.id,
              title: review.wrong_notes.question || '복습 노트',
              type: 'review',
              date: new Date(review.next_review_date),
              nodeId: review.wrong_note_id
            });
          }
        });
      }

      // 프로젝트 마감일 추가
      if (nodeData) {
        nodeData.forEach((node: any) => {
          items.push({
            id: node.id,
            title: `${node.name} 마감`,
            type: 'deadline',
            date: new Date(node.deadline),
            nodeId: node.id
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
            archiveName: todo.archive_name
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
    if (!deadline) {
      setMaxDisplayDate(prev => addMonths(prev, 1));
    }
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
      setNewTodo({ title: '', description: '' });
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

  const handleEventClick = (event: ScheduleItem) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const navigateToNote = () => {
    if (selectedEvent) {
      // 노트로 이동하는 로직 구현
      toast.success(`${selectedEvent.title}로 이동합니다.`);
      setShowEventModal(false);
    }
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              {format(weekStart, 'yyyy년 M월', { locale: ko })} 주간
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
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 border rounded-lg cursor-pointer min-h-[120px] ${
                    isToday ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className={`font-semibold text-center mb-2 ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'E', { locale: ko })}
                  </div>
                  <div className={`text-center mb-2 ${isToday ? 'text-primary font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded truncate ${
                          event.type === 'deadline' 
                            ? 'bg-destructive text-destructive-foreground'
                            : event.type === 'review'
                            ? 'bg-primary text-primary-foreground'
                            : event.isCompleted
                            ? 'bg-muted text-muted-foreground line-through'
                            : 'bg-accent text-accent-foreground'
                        }`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEvents.length - 3} 더보기
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCalendarContent = () => {
    const today = new Date();
    const endDate = deadline || maxDisplayDate;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {nodeName} 프로젝트 캘린더
          </h3>
          <div className="flex gap-2">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | 'month')}>
              <TabsList>
                <TabsTrigger value="week">주간</TabsTrigger>
                <TabsTrigger value="month">월간</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {viewMode === 'week' ? renderWeekView() : (
          <Card>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateClick}
                className="w-full pointer-events-auto"
                locale={ko}
                modifiers={{
                  hasEvent: (date) => getEventsForDate(date).length > 0,
                  deadline: (date) => scheduleItems.some(item => 
                    isSameDay(item.date, date) && item.type === 'deadline'
                  ),
                  review: (date) => scheduleItems.some(item => 
                    isSameDay(item.date, date) && item.type === 'review'
                  ),
                  todo: (date) => scheduleItems.some(item => 
                    isSameDay(item.date, date) && item.type === 'todo'
                  )
                }}
                modifiersClassNames={{
                  hasEvent: 'bg-accent text-accent-foreground',
                  deadline: 'bg-destructive text-destructive-foreground',
                  review: 'bg-primary text-primary-foreground',
                  todo: 'bg-secondary text-secondary-foreground'
                }}
                disabled={(date) => {
                  if (deadline) {
                    return isBefore(date, today) || isAfter(date, deadline);
                  }
                  return isBefore(date, today) || isAfter(date, endDate);
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* 일정 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">다가오는 일정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scheduleItems
                .filter(item => isAfter(item.date, today) || isSameDay(item.date, today))
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .slice(0, 10)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (item.type === 'todo') {
                        handleToggleTodo(item.id, item.isCompleted || false);
                      } else {
                        handleEventClick(item);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {item.type === 'deadline' ? (
                        <CalendarDays className="h-4 w-4 text-destructive" />
                      ) : item.type === 'review' ? (
                        <Clock className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="flex items-center">
                          <div
                            className={`w-4 h-4 border-2 rounded-sm mr-2 flex items-center justify-center cursor-pointer ${
                              item.isCompleted ? 'bg-primary border-primary' : 'border-muted-foreground'
                            }`}
                          >
                            {item.isCompleted && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className={`font-medium text-sm ${
                          item.isCompleted && item.type === 'todo' ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {item.title}
                          {item.isReviewTask && item.archiveName && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({item.archiveName}_Review)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(item.date, 'PPP', { locale: ko })}
                        </div>
                      </div>
                    </div>
                    <Badge variant={
                      item.type === 'deadline' ? 'destructive' : 
                      item.type === 'review' ? 'default' :
                      item.isCompleted ? 'secondary' : 'outline'
                    }>
                      {item.type === 'deadline' ? '마감' : 
                       item.type === 'review' ? '복습' : '할일'}
                    </Badge>
                  </div>
                ))}
              {scheduleItems.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  등록된 일정이 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 더 보기 버튼 (마감일이 없을 때만) */}
        {!deadline && (
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
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {renderCalendarContent()}
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
                    {format(selectedEvent.date, 'PPP EEEE', { locale: ko })}
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
                      <span className="text-sm">{event.title}</span>
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
    </>
  );
};