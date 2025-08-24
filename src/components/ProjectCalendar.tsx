import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, Clock, ArrowRight, Plus } from 'lucide-react';
import { format, addMonths, isSameDay, isAfter, isBefore } from 'date-fns';
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
  type: 'review' | 'deadline';
  date: Date;
  reminderTime?: string;
  nodeId: string;
}

export const ProjectCalendar: React.FC<ProjectCalendarProps> = ({
  nodeId,
  nodeName,
  deadline
}) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<ScheduleItem | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
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
    
    const events = getEventsForDate(date);
    if (events.length > 0) {
      setSelectedDate(date);
      if (events.length === 1) {
        setSelectedEvent(events[0]);
        setShowEventModal(true);
      }
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
                )
              }}
              modifiersClassNames={{
                hasEvent: 'bg-accent text-accent-foreground',
                deadline: 'bg-destructive text-destructive-foreground',
                review: 'bg-primary text-primary-foreground'
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
                    onClick={() => handleEventClick(item)}
                  >
                    <div className="flex items-center gap-2">
                      {item.type === 'deadline' ? (
                        <CalendarDays className="h-4 w-4 text-destructive" />
                      ) : (
                        <Clock className="h-4 w-4 text-primary" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{item.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(item.date, 'PPP', { locale: ko })}
                        </div>
                      </div>
                    </div>
                    <Badge variant={item.type === 'deadline' ? 'destructive' : 'default'}>
                      {item.type === 'deadline' ? '마감' : '복습'}
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
    </>
  );
};