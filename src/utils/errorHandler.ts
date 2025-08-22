import { toast } from 'sonner';

interface NetworkErrorInfo {
  error: any;
  operation: string;
  isIframe: boolean;
}

export const handleNetworkError = ({ error, operation, isIframe }: NetworkErrorInfo) => {
  console.error(`❌ ${operation} 실패:`, error);
  
  let errorMessage = `${operation}에 실패했습니다.`;
  
  // 구체적인 오류 분석
  if (error?.code === 'PGRST301') {
    errorMessage = '권한이 없습니다. 로그인 상태를 확인해주세요.';
  } else if (error?.code === 'PGRST116') {
    errorMessage = '요청한 데이터를 찾을 수 없습니다.';
  } else if (error?.message?.includes('fetch')) {
    errorMessage = '네트워크 연결을 확인해주세요.';
    
    if (isIframe) {
      errorMessage += ' iframe 제한으로 인한 오류일 수 있습니다.';
    }
  } else if (error?.message?.includes('CORS')) {
    errorMessage = 'CORS 오류가 발생했습니다.';
    
    if (isIframe) {
      errorMessage += ' iframe 환경에서는 일부 요청이 차단될 수 있습니다.';
    }
  } else if (error?.message) {
    errorMessage = `오류: ${error.message}`;
  }
  
  // iframe 환경에서 추가 안내
  if (isIframe && !errorMessage.includes('iframe')) {
    errorMessage += ' iframe 제한으로 인한 문제일 수 있습니다. 새 탭에서 시도해보세요.';
  }
  
  toast.error(errorMessage, {
    duration: 5000,
    action: isIframe ? {
      label: '새 탭에서 열기',
      onClick: () => window.open(window.location.href, '_blank')
    } : undefined
  });
  
  return errorMessage;
};

export const isInIframe = (): boolean => {
  return window.parent !== window;
};