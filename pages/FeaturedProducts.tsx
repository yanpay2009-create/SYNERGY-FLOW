import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Plus, Crown, Zap, BarChart3, Sparkles, Star, X } from 'lucide-react';
import { ShoppingBagIcon } from '../components/ShoppingBagIcon';
import { useNavigate } from 'react-router-dom';
import { UserTier, Product } from '../types';

export const FeaturedProducts: React.FC = () => {
  const { products, addToCart, calculateCommission, user, t, setBottomNavHidden, cart } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    setBottomNavHidden(false);
  }, [setBottomNavHidden]);

  const featuredProducts = [...products].sort((a, b) => b.sold - a.sold);

  const getTierColors = (tier: UserTier | undefined) => {
    switch (tier) {
      case UserTier.EXECUTIVE:
        return { text: 'text-amber-600 dark:text-amber-400', bgLight: 'bg-amber-50 dark:bg-amber-900/30' };
      case UserTier.BUILDER:
        return { text: 'text-purple-700 dark:text-purple-400', bgLight: 'bg-purple-50 dark:bg-purple-900/30' };
      case UserTier.MARKETER: 
        return { text: 'text-pink-600 dark:text-pink-400', bgLight: 'bg-pink-50 dark:bg-pink-900/30' };
      default:
        return { text: 'text-synergy-blue dark:text-blue-400', bgLight: 'bg-blue-50 dark:bg-blue-900/30' };
    }
  };

  const getTierBadgeStyles = (tier: UserTier | undefined) => {
    const colors = getTierColors(tier);
    return `${colors.bgLight} ${colors.text} border border-white/50 dark:border-gray-600 shadow-sm`;
  };

  const getDiscountedPrice = (product: Product) => {
    let tierDiscount = 0;
    if (user) {
        if (user.tier === UserTier.MARKETER) tierDiscount = 0.10;
        else if (user.tier === UserTier.BUILDER) tierDiscount = 0.20;
        else if (user.tier === UserTier.EXECUTIVE) tierDiscount = 0.30;
    }
    
    // Only apply tier discount. The promoDiscount is for tier progression/commission, not price reduction.
    return product.price * (1 - tierDiscount);
  };

  const formatSold = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="pb-24 pt-0 px-4 max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="sticky top-0 z-[100] bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100/50 dark:border-gray-800/50 -mx-4 px-4 py-3 mb-6 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold ml-2 text-gray-900 dark:text-white tracking-tight">Featured Products</h1>
          </div>
          <button 
            onClick={() => navigate('/cart')} 
            className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition"
          >
            <ShoppingBagIcon size={24} />
            {cart.reduce((acc, item) => acc + item.quantity, 0) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500/80 rounded-full px-1 shadow-sm backdrop-blur-sm">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-4">
          {featuredProducts.map(product => {
            const finalPrice = getDiscountedPrice(product);
            const hasDiscount = finalPrice < product.price;

            return (
              <div 
                  key={product.id} 
                  onClick={() => product.stock > 0 && navigate(`/product/${product.id}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition duration-300 cursor-pointer active:scale-[0.98] border border-transparent dark:border-gray-700 overflow-hidden flex flex-col relative"
              >
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />

                      {/* Commission Badge at Top Right */}
                      <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full backdrop-blur-md flex items-center font-black text-[10px] shadow-sm z-10 ${getTierBadgeStyles(user?.tier)}`}>
                          +฿{calculateCommission(product.price).toFixed(0)}
                      </div>

                      {product.stock <= 0 && (
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                              <span className="text-gray-400 dark:text-gray-500 text-xl font-black tracking-tighter opacity-90">
                                  Out of Stock
                              </span>
                          </div>
                      )}
                  </div>
                  <div className="p-3">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 line-clamp-1 mb-1">{product.name}</h3>
                      <div className="flex justify-between items-end">
                          <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                  <p className="text-base font-black text-synergy-blue">฿{(finalPrice ?? 0).toLocaleString()}</p>
                                  {hasDiscount && (
                                      <p className="text-[10px] text-gray-400 line-through leading-none">฿{(product.price ?? 0).toLocaleString()}</p>
                                  )}
                              </div>
                              <div className="flex items-center space-x-1 mt-1">
                                  <div className="flex items-center space-x-0.5">
                                      <Star size={9} className="text-amber-400 fill-amber-400" />
                                      <span className="text-[9px] text-gray-400 font-bold">4.8</span>
                                  </div>
                                  <span className="text-[8px] text-gray-200 dark:text-gray-600">-</span>
                                  <p className="text-[9px] text-gray-400 font-bold whitespace-nowrap">
                                      {formatSold(product.sold)} {t('home.sold')}
                                  </p>
                              </div>
                          </div>
                          <button 
                              disabled={product.stock <= 0}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                              }}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-sm shrink-0 ml-1 ${
                                product.stock <= 0 
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 cursor-not-allowed' 
                                : 'bg-gray-50 dark:bg-gray-700 text-synergy-blue hover:bg-synergy-blue hover:text-white'
                              }`}
                          >
                              <Plus size={18} />
                          </button>
                      </div>
                  </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};