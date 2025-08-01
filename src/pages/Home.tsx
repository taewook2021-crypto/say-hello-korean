import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Plus, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            오답노트
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            틀린 문제를 기록하고 복습하여 실력을 향상시키세요
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>문제 기록</CardTitle>
              <CardDescription>
                틀린 문제와 정답을 체계적으로 기록하세요
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>복습 관리</CardTitle>
              <CardDescription>
                해결된 문제와 미해결 문제를 구분하여 관리하세요
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>실력 향상</CardTitle>
              <CardDescription>
                반복 학습을 통해 약점을 보완하고 실력을 향상시키세요
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <Link to="/notes">
            <Button size="lg" className="text-lg px-8 py-6">
              <BookOpen className="mr-2 h-5 w-5" />
              오답노트 보기
            </Button>
          </Link>
          <div className="text-muted-foreground">
            오답노트를 시작하여 효율적인 학습을 경험해보세요
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;