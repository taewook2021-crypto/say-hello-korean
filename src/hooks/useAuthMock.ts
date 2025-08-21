// 임시로 인증 기능을 비활성화한 훅
// 나중에 useAuth로 교체 예정

interface MockUser {
  id: string;
  email: string;
}

interface MockAuthReturn {
  user: MockUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const useAuth = (): MockAuthReturn => {
  // 임시 사용자 - 실제 앱에서는 실제 인증된 사용자 정보 사용
  const mockUser: MockUser = {
    id: 'ebcc4eaf-7b16-4a2b-b3ab-4105ba5ff92c', // DB의 실제 user_id
    email: 'test@example.com'
  };

  const signOut = async () => {
    // 임시로 아무것도 하지 않음
    console.log('Mock signOut called');
  };

  return {
    user: mockUser,
    loading: false,
    signOut
  };
};