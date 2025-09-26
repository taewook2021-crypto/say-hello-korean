import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableCreator } from "@/components/ui/table-creator";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { FileText, Save, X, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TableModeInterfaceProps {
  problemTableData: string[][];
  answerTableData: string[][];
  onProblemTableChange: (data: string[][]) => void;
  onAnswerTableChange: (data: string[][]) => void;
  onBackToTextMode: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export const TableModeInterface: React.FC<TableModeInterfaceProps> = ({
  problemTableData,
  answerTableData,
  onProblemTableChange,
  onAnswerTableChange,
  onBackToTextMode,
  onSave,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState("problem");
  const [selectedCells, setSelectedCells] = useState<{row: number, col: number}[]>([]);

  const handleProblemAddRow = () => {
    const newData = [...problemTableData];
    const colCount = newData[0]?.length || 3;
    newData.push(Array(colCount).fill(''));
    onProblemTableChange(newData);
  };

  const handleProblemRemoveRow = () => {
    if (problemTableData.length > 1) {
      const newData = problemTableData.slice(0, -1);
      onProblemTableChange(newData);
    }
  };

  const handleProblemAddColumn = () => {
    const newData = problemTableData.map(row => [...row, '']);
    onProblemTableChange(newData);
  };

  const handleProblemRemoveColumn = () => {
    if (problemTableData[0]?.length > 1) {
      const newData = problemTableData.map(row => row.slice(0, -1));
      onProblemTableChange(newData);
    }
  };

  const handleAnswerAddRow = () => {
    const newData = [...answerTableData];
    const colCount = newData[0]?.length || 3;
    newData.push(Array(colCount).fill(''));
    onAnswerTableChange(newData);
  };

  const handleAnswerRemoveRow = () => {
    if (answerTableData.length > 1) {
      const newData = answerTableData.slice(0, -1);
      onAnswerTableChange(newData);
    }
  };

  const handleAnswerAddColumn = () => {
    const newData = answerTableData.map(row => [...row, '']);
    onAnswerTableChange(newData);
  };

  const handleAnswerRemoveColumn = () => {
    if (answerTableData[0]?.length > 1) {
      const newData = answerTableData.map(row => row.slice(0, -1));
      onAnswerTableChange(newData);
    }
  };

  // 초기 데이터 설정 (테이블이 비어있을 때)
  React.useEffect(() => {
    if (problemTableData.length === 0) {
      onProblemTableChange([
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
      ]);
    }
    if (answerTableData.length === 0) {
      onAnswerTableChange([
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
      ]);
    }
  }, [problemTableData, answerTableData, onProblemTableChange, onAnswerTableChange]);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">표 생성 모드</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToTextMode}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          텍스트 모드로 돌아가기
        </Button>
      </div>

      {/* 탭 인터페이스 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="problem" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            문제
          </TabsTrigger>
          <TabsTrigger value="answer" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            정답/해설
          </TabsTrigger>
        </TabsList>

        {/* 문제 탭 */}
        <TabsContent value="problem" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">문제 표 편집</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TableToolbar
                onAddRow={handleProblemAddRow}
                onRemoveRow={handleProblemRemoveRow}
                onAddColumn={handleProblemAddColumn}
                onRemoveColumn={handleProblemRemoveColumn}
                selectedCellsCount={selectedCells.length}
              />
              <div className="border rounded-lg p-4 min-h-[300px] bg-background">
                <div className="mb-2 text-sm text-muted-foreground">
                  💡 문제 표: 빈칸을 원하는 셀은 비워두세요
                </div>
                <TableCreator
                  isOpen={true}
                  onClose={() => {}}
                  onTableCreate={() => {}}
                  onTableDataChange={onProblemTableChange}
                  inline={true}
                  initialData={problemTableData}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 정답/해설 탭 */}
        <TabsContent value="answer" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">정답/해설 표 편집</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TableToolbar
                onAddRow={handleAnswerAddRow}
                onRemoveRow={handleAnswerRemoveRow}
                onAddColumn={handleAnswerAddColumn}
                onRemoveColumn={handleAnswerRemoveColumn}
                selectedCellsCount={selectedCells.length}
              />
              <div className="border rounded-lg p-4 min-h-[300px] bg-background">
                <div className="mb-2 text-sm text-muted-foreground">
                  💡 정답/해설 표: 모든 셀에 완전한 답안을 입력하세요
                </div>
                <TableCreator
                  isOpen={true}
                  onClose={() => {}}
                  onTableCreate={() => {}}
                  onTableDataChange={onAnswerTableChange}
                  inline={true}
                  initialData={answerTableData}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} className="flex items-center gap-2">
          <X className="w-4 h-4" />
          취소
        </Button>
        <Button onClick={onSave} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          저장하기
        </Button>
      </div>
    </div>
  );
};