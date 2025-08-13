import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, Repeat, Target, Star } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* ARO Branding */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary text-primary-foreground mb-4">
            <span className="text-4xl font-bold">ARO</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              ARO
            </h1>
            
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                <span>Archive</span>
              </div>
              <Star className="h-3 w-3" />
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                <span>Remind</span>
              </div>
              <Star className="h-3 w-3" />
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>Output</span>
              </div>
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            학습 내용을 체계적으로 아카이브하고,<br />
            적시에 리마인드 받아 완벽한 아웃풋을 만들어내세요
          </p>
        </div>

        {/* Login/Signup Actions */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Button 
              className="w-full h-12 text-base" 
              onClick={() => navigate("/auth")}
            >
              시작하기
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                계정이 없으시면 회원가입도 가능합니다
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature Preview */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Archive className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">체계적 보관</p>
          </div>
          
          <div className="text-center space-y-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Repeat className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">스마트 복습</p>
          </div>
          
          <div className="text-center space-y-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">완벽한 성과</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;