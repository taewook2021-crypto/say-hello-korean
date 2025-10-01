import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/auth')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">개인정보 처리방침</CardTitle>
            <p className="text-sm text-muted-foreground">최종 업데이트: 2025년 10월 1일</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6 text-sm">
                <section>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Re:Mind(이하 "서비스")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 
                    관련 법령을 준수하고 있습니다. 서비스는 개인정보처리방침을 통하여 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 
                    이용되고 있으며 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">1. 개인정보의 수집 및 이용 목적</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>서비스는 다음의 목적을 위하여 개인정보를 처리합니다:</p>
                    <p className="pl-4">가. 회원 가입 및 관리: 회원 식별, 서비스 부정이용 방지</p>
                    <p className="pl-4">나. 서비스 제공: 학습 관리 서비스, 오답노트 관리, 학습 통계 제공</p>
                    <p className="pl-4">다. 서비스 개선: 신규 서비스 개발 및 맞춤 서비스 제공</p>
                    <p className="pl-4">라. 고객 지원: 문의사항 응대 및 고객 서비스 제공</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">2. 수집하는 개인정보의 항목</h2>
                  <div className="space-y-3 text-muted-foreground leading-relaxed">
                    <div>
                      <p className="font-medium text-foreground mb-1">가. 회원가입 시 수집되는 정보</p>
                      <p className="pl-4">- 필수항목: 이메일 주소, 이름 (Google 계정 연동 시 제공되는 정보)</p>
                      <p className="pl-4">- 선택항목: 프로필 사진 (Google 계정 프로필 이미지)</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">나. 서비스 이용 과정에서 수집되는 정보</p>
                      <p className="pl-4">- 학습 기록: 과목, 교재, 챕터, 학습 진도, 오답노트 내용</p>
                      <p className="pl-4">- 이용 기록: 접속 로그, 이용 시간, IP 주소, 쿠키</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">3. 개인정보의 수집 방법</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>서비스는 다음과 같은 방법으로 개인정보를 수집합니다:</p>
                    <p className="pl-4">가. Google OAuth 2.0을 통한 소셜 로그인</p>
                    <p className="pl-4">나. 서비스 이용 과정에서 이용자가 직접 입력하는 정보</p>
                    <p className="pl-4">다. 자동 수집 장치(쿠키)를 통한 수집</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">4. 개인정보의 보유 및 이용 기간</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 서비스는 이용자의 개인정보를 회원가입일로부터 서비스를 제공하는 기간 동안에 한하여 보유 및 이용합니다.</p>
                    <p>2. 회원 탈퇴 시 개인정보는 즉시 파기됩니다. 다만, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다:</p>
                    <p className="pl-4">가. 관련 법령에 의한 정보보유 사유</p>
                    <p className="pl-4">- 전자상거래 등에서의 소비자보호에 관한 법률</p>
                    <p className="pl-6">· 계약 또는 청약철회 등에 관한 기록: 5년</p>
                    <p className="pl-6">· 소비자의 불만 또는 분쟁처리에 관한 기록: 3년</p>
                    <p className="pl-4">- 통신비밀보호법</p>
                    <p className="pl-6">· 서비스 이용 관련 로그 기록: 3개월</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">5. 개인정보의 제3자 제공</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 
                       다만, 다음의 경우에는 예외로 합니다:</p>
                    <p className="pl-4">가. 이용자가 사전에 동의한 경우</p>
                    <p className="pl-4">나. 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">6. 개인정보의 처리 위탁</h2>
                  <div className="space-y-3 text-muted-foreground leading-relaxed">
                    <p>서비스는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>
                    <div className="pl-4">
                      <p className="font-medium text-foreground">- 수탁업체: Supabase (클라우드 서비스 제공)</p>
                      <p>- 위탁업무 내용: 회원 데이터 저장 및 관리, 인증 서비스 제공</p>
                    </div>
                    <div className="pl-4">
                      <p className="font-medium text-foreground">- 수탁업체: Google</p>
                      <p>- 위탁업무 내용: OAuth 2.0 인증 서비스 제공</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">7. 이용자 및 법정대리인의 권리와 행사 방법</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다:</p>
                    <p className="pl-4">가. 개인정보 열람 요구</p>
                    <p className="pl-4">나. 개인정보 정정 요구</p>
                    <p className="pl-4">다. 개인정보 삭제 요구</p>
                    <p className="pl-4">라. 개인정보 처리정지 요구</p>
                    <p className="mt-2">위 권리 행사는 서비스 내 계정 설정 메뉴를 통해 직접 하실 수 있습니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">8. 개인정보의 파기 절차 및 방법</h2>
                  <div className="space-y-3 text-muted-foreground leading-relaxed">
                    <div>
                      <p className="font-medium text-foreground mb-1">가. 파기 절차</p>
                      <p className="pl-4">이용자가 회원가입 등을 위해 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져 
                         내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라 일정 기간 저장된 후 파기됩니다.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">나. 파기 방법</p>
                      <p className="pl-4">- 전자적 파일 형태의 정보: 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제</p>
                      <p className="pl-4">- 종이에 출력된 개인정보: 분쇄기로 분쇄하거나 소각</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">9. 개인정보 보호책임자</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 
                       개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
                    <div className="mt-3 p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium text-foreground">개인정보 보호책임자</p>
                      <p className="pl-4 mt-2">- 문의처: 서비스 내 고객센터를 통해 연락 가능</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">10. 개인정보의 안전성 확보 조치</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
                    <p className="pl-4">가. 관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등</p>
                    <p className="pl-4">나. 기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 
                       고유식별정보 등의 암호화, 보안프로그램 설치</p>
                    <p className="pl-4">다. 물리적 조치: 전산실, 자료보관실 등의 접근통제</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">11. 쿠키의 운영 및 거부</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 서비스는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 쿠키를 사용합니다.</p>
                    <p>2. 쿠키란 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에 보내는 
                       아주 작은 텍스트 파일로서 이용자의 컴퓨터에 저장됩니다.</p>
                    <p>3. 이용자는 쿠키 설치에 대한 선택권을 가지고 있으며, 웹브라우저에서 옵션을 설정함으로써 
                       모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 모든 쿠키의 저장을 거부할 수 있습니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">12. 개인정보 처리방침의 변경</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>1. 이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 
                       변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
                    <p>2. 다만, 개인정보의 수집 및 활용, 제3자 제공 등과 같이 이용자 권리의 중요한 변경이 있을 경우에는 
                       최소 30일 전에 고지합니다.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">13. 개인정보 침해 관련 상담 및 신고</h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    <p>개인정보 침해에 대한 신고나 상담이 필요하신 경우 아래 기관에 문의하시기 바랍니다:</p>
                    <div className="mt-3 space-y-2 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">개인정보침해신고센터</p>
                        <p className="pl-4 text-sm">(국번없이) 118 | privacy.kisa.or.kr</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">대검찰청 사이버범죄수사단</p>
                        <p className="pl-4 text-sm">(국번없이) 1301 | www.spo.go.kr</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">경찰청 사이버안전국</p>
                        <p className="pl-4 text-sm">(국번없이) 182 | cyberbureau.police.go.kr</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="pt-4 border-t">
                  <p className="text-muted-foreground text-xs">
                    본 개인정보 처리방침은 2025년 10월 1일부터 시행됩니다.
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
