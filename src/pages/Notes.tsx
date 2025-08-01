import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

interface WrongNote {
  id: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  explanation: string;
  createdAt: Date;
  isResolved: boolean;
}

const Index = () => {
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
  const [newNote, setNewNote] = useState({
    question: "",
    wrongAnswer: "",
    correctAnswer: "",
    explanation: ""
  });

  const handleAddNote = () => {
    if (!newNote.question || !newNote.correctAnswer) {
      return;
    }

    const note: WrongNote = {
      id: Date.now().toString(),
      ...newNote,
      createdAt: new Date(),
      isResolved: false
    };

    setNotes([note, ...notes]);
    setNewNote({
      question: "",
      wrongAnswer: "",
      correctAnswer: "",
      explanation: ""
    });
    setShowAddForm(false);
  };

  const toggleResolved = (id: string) => {
    setNotes(notes.map(note => 
      note.id === id ? { ...note, isResolved: !note.isResolved } : note
    ));
  };

  const toggleShowAnswer = (id: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">나의 오답노트</h1>
          </div>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            문제 추가
          </Button>
        </div>

        {/* Add New Note Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>새로운 오답 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="question">문제</Label>
                <Textarea
                  id="question"
                  placeholder="틀린 문제를 적어주세요"
                  value={newNote.question}
                  onChange={(e) => setNewNote({...newNote, question: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="wrongAnswer">내가 적은 답</Label>
                <Input
                  id="wrongAnswer"
                  placeholder="틀린 답안"
                  value={newNote.wrongAnswer}
                  onChange={(e) => setNewNote({...newNote, wrongAnswer: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="correctAnswer">정답</Label>
                <Input
                  id="correctAnswer"
                  placeholder="올바른 답안"
                  value={newNote.correctAnswer}
                  onChange={(e) => setNewNote({...newNote, correctAnswer: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="explanation">해설</Label>
                <Textarea
                  id="explanation"
                  placeholder="왜 틀렸는지, 어떻게 풀어야 하는지 적어주세요"
                  value={newNote.explanation}
                  onChange={(e) => setNewNote({...newNote, explanation: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddNote}>저장</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">아직 오답노트가 없습니다</h3>
                <p className="text-muted-foreground">첫 번째 문제를 추가해보세요!</p>
              </CardContent>
            </Card>
          ) : (
            notes.map((note) => (
              <Card key={note.id} className={note.isResolved ? "border-green-200 bg-green-50/50" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {note.createdAt.toLocaleDateString('ko-KR')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleResolved(note.id)}
                      className="flex items-center gap-1"
                    >
                      {note.isResolved ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          해결완료
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          미해결
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">문제</h4>
                    <div className="bg-blue-50 p-4 rounded-lg border">
                      <p className="text-base leading-relaxed">{note.question}</p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={() => toggleShowAnswer(note.id)}
                      variant={showAnswers[note.id] ? "secondary" : "default"}
                      className="flex items-center gap-2"
                    >
                      {showAnswers[note.id] ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          답안 숨기기
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          답안 보기
                        </>
                      )}
                    </Button>
                  </div>

                  {showAnswers[note.id] && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {note.wrongAnswer && (
                          <div>
                            <h4 className="font-medium mb-2 text-red-600 flex items-center gap-1">
                              <XCircle className="h-4 w-4" />
                              내가 적은 답
                            </h4>
                            <p className="text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                              {note.wrongAnswer}
                            </p>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-medium mb-2 text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            정답
                          </h4>
                          <p className="text-sm bg-green-50 p-3 rounded-lg border border-green-200 font-medium">
                            {note.correctAnswer}
                          </p>
                        </div>
                      </div>

                      {note.explanation && (
                        <div>
                          <h4 className="font-medium mb-2">해설</h4>
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm leading-relaxed">{note.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
