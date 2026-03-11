
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ChangePin: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserSecurity } = useApp();
  const [step, setStep] = useState<'verify' | 'new' | 'confirm'>('verify');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState(false);

  // Use real pin from context, default to 123456 if not set
  const currentPin = user?.pin || '123456';

  const handlePinInput = (value: string) => {
    if (value.length > 6) return;
    setPin(value);
    setError(false);

    if (value.length === 6) {
      if (step === 'verify') {
        if (value === currentPin) {
          setTimeout(() => {
            setStep('new');
            setPin('');
          }, 300);
        } else {
          setError(true);
          setTimeout(() => setPin(''), 500);
        }
      } else if (step === 'new') {
        setTimeout(() => {
          setNewPin(value);
          setStep('confirm');
          setPin('');
        }, 300);
      } else if (step === 'confirm') {
        if (value === newPin) {
          updateUserSecurity('pin', newPin);
          alert("PIN changed successfully!");
          navigate(-1);
        } else {
          setError(true);
          alert("PINs do not match. Try again.");
          setTimeout(() => {
            setStep('new');
            setPin('');
            setNewPin('');
          }, 500);
        }
      }
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'verify': return 'Enter Current PIN';
      case 'new': return 'Set New PIN';
      case 'confirm': return 'Confirm New PIN';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 max-w-md mx-auto relative">
      <div className="absolute top-4 left-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-synergy-blue shadow-lg mb-6 relative pointer-events-none">
        <Shield size={32} />
      </div>
      
      <h2 className="text-xl font-bold text-gray-900 mb-2 relative pointer-events-none">{getTitle()}</h2>
      <p className="text-sm text-gray-500 mb-8 relative pointer-events-none text-center">
        Enter your 6-digit security PIN to continue.
      </p>
      
      <div className="flex space-x-4 mb-8 relative pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length ? 'bg-synergy-blue scale-110' : 'bg-gray-200'} ${error ? 'bg-red-500' : ''}`}
          />
        ))}
      </div>

      <input 
          type="number" 
          pattern="[0-9]*" 
          inputMode="numeric"
          autoFocus
          className="opacity-0 absolute inset-0 h-full w-full cursor-pointer z-10"
          value={pin}
          onChange={(e) => handlePinInput(e.target.value)}
      />
    </div>
  );
};
