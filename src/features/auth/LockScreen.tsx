import React from 'react';
import { Lock, Eye, EyeOff, Fingerprint } from 'lucide-react';

export interface LockScreenProps {
  pin: string;
  setPin: (value: string) => void;
  showPin: boolean;
  toggleShowPin: () => void;
  authError: string;
  needsSetup: boolean;
  onUnlock: () => void;
  isUnlockDisabled: boolean;
  hasVault: boolean;
  useBiometric: boolean;
  webauthnCredentialId: string;
  isHelloAvailable: boolean;
  isHelloUnlocking: boolean;
  helloError: string;
  onBiometricUnlock: () => void;
  pinInputRef: React.RefObject<HTMLInputElement | null>;
}

const LockScreen = (props: LockScreenProps) => {
  const {
    pin,
    setPin,
    showPin,
    toggleShowPin,
    authError,
    needsSetup,
    onUnlock,
    isUnlockDisabled,
    hasVault,
    useBiometric,
    webauthnCredentialId,
    isHelloAvailable,
    isHelloUnlocking,
    helloError,
    onBiometricUnlock,
    pinInputRef
  } = props;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-indigo-100 rounded-full mb-4">
            <Lock className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Quản Lý Tài Khoản</h1>
          <p className="text-gray-600">
            {needsSetup ? 'Tạo mật khẩu chính để bảo vệ tài khoản' : 'Nhập mật khẩu chính để mở khóa'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input
              ref={pinInputRef}
              type={showPin ? 'text' : 'password'}
              minLength={6}
              placeholder={needsSetup ? 'Tạo mật khẩu chính (tối thiểu 6 ký tự)' : 'Nhập mật khẩu chính'}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && pin.length >= 6 && onUnlock()}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none text-lg pr-12 ${
                authError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'
              }`}
            />
            <button
              type="button"
              onClick={toggleShowPin}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-indigo-600"
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {authError && <div className="text-sm text-red-600 font-medium">{authError}</div>}

          <button
            onClick={onUnlock}
            disabled={isUnlockDisabled}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {needsSetup ? 'Tạo Mật Khẩu' : 'Mở Khóa'}
          </button>

          {hasVault && useBiometric && webauthnCredentialId && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">hoặc</span>
                </div>
              </div>

              <button
                onClick={onBiometricUnlock}
                disabled={!isHelloAvailable || isHelloUnlocking}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                <Fingerprint className="w-5 h-5" />
                {isHelloUnlocking ? 'Đang mở Windows Hello...' : 'Mở Khóa Bằng Windows Hello'}
              </button>

              {helloError && <div className="text-sm text-red-600 font-medium">{helloError}</div>}

              {!isHelloAvailable && (
                <div className="text-xs text-gray-500">
                  Máy của bạn có thể chưa bật Windows Hello (vân tay/Face/PIN).
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
