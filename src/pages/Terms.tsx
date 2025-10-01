import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">서비스 이용약관</CardTitle>
            <p className="text-sm text-muted-foreground">최종 업데이트: 2025년 10월 1일</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6 text-sm">
                <section>
                  <h2 className="text-lg font-semibold mb-3">제1조 (목적)</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    본 약관은 Re:Mind(이하 "서비스")가 제공하는 학습 관리 서비스의 이용과 관련하여 
                    서비스와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제2조 (용어의 정의)</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. "서비스"란 Re:Mind가 제공하는 학습 관리 관련 제반 서비스를 의미합니다.</p>
                    <p>2. "이용자"란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</p>
                    <p>3. "회원"이란 서비스에 접속하여 본 약관에 따라 서비스와 이용계약을 체결하고 서비스를 이용하는 자를 의미합니다.</p>
                    <p>4. "콘텐츠"란 이용자가 서비스에 게시 또는 등록하는 학습 자료, 오답노트 등의 정보를 의미합니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제3조 (약관의 효력 및 변경)</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 본 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.</p>
                    <p>2. 서비스는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 
                       약관이 변경되는 경우 서비스 내 공지사항을 통해 공지합니다.</p>
                    <p>3. 변경된 약관은 공지와 동시에 그 효력이 발생합니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제4조 (회원가입)</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 이용자는 서비스가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</p>
                    <p>2. 서비스는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:</p>
                    <p className="pl-4">가. 등록 내용에 허위, 기재누락, 오기가 있는 경우</p>
                    <p className="pl-4">나. 기타 회원으로 등록하는 것이 서비스의 기술상 현저히 지장이 있다고 판단되는 경우</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제5조 (서비스의 제공 및 변경)</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 서비스는 다음과 같은 업무를 수행합니다:</p>
                    <p className="pl-4">가. 학습 진도 관리 서비스</p>
                    <p className="pl-4">나. 오답노트 관리 서비스</p>
                    <p className="pl-4">다. 학습 통계 및 분석 서비스</p>
                    <p className="pl-4">라. 기타 서비스가 정하는 업무</p>
                    <p>2. 서비스는 필요한 경우 서비스의 내용을 변경할 수 있으며, 변경 시 그 내용을 공지합니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제6조 (서비스 이용시간)</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 서비스의 이용은 연중무휴 1일 24시간을 원칙으로 합니다.</p>
                    <p>2. 서비스는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제7조 (이용자의 의무)</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 이용자는 다음 행위를 하여서는 안 됩니다:</p>
                    <p className="pl-4">가. 신청 또는 변경 시 허위내용의 등록</p>
                    <p className="pl-4">나. 타인의 정보 도용</p>
                    <p className="pl-4">다. 서비스에 게시된 정보의 변경</p>
                    <p className="pl-4">라. 서비스가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</p>
                    <p className="pl-4">마. 서비스 기타 제3자의 저작권 등 지적재산권에 대한 침해</p>
                    <p className="pl-4">바. 서비스 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제8조 (저작권의 귀속 및 이용제한)</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 서비스가 작성한 저작물에 대한 저작권 기타 지적재산권은 서비스에 귀속합니다.</p>
                    <p>2. 이용자가 서비스 내에 게시한 콘텐츠의 저작권은 이용자에게 있으며, 
                       서비스는 이용자가 게시한 콘텐츠를 서비스 운영, 개선 및 홍보를 위해 사용할 수 있습니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제9조 (계약해지 및 이용제한)</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 회원이 이용계약을 해지하고자 하는 때에는 회원 본인이 서비스 내 계정 삭제 기능을 통해 해지할 수 있습니다.</p>
                    <p>2. 서비스는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 
                       경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제10조 (손해배상)</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>서비스는 무료로 제공되는 서비스와 관련하여 회원에게 어떠한 손해가 발생하더라도 
                       서비스가 고의 또는 중대한 과실로 인한 손해발생의 경우를 제외하고는 이에 대하여 책임을 부담하지 않습니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제11조 (면책조항)</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 서비스는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
                    <p>2. 서비스는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</p>
                    <p>3. 서비스는 회원이 서비스를 통해 얻은 자료로 인한 손해에 대하여 책임을 지지 않습니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">제12조 (관할법원)</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    서비스와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법을 준거법으로 하며, 
                    민사소송법상의 관할법원에 제기합니다.
                  </p>
                </section>

                <section className="pt-4 border-t">
                  <p className="text-muted-foreground text-xs">
                    본 약관은 2025년 10월 1일부터 시행됩니다.
                  </p>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
